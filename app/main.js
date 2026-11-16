// Frontline's router and renderer: hash routes, one render per route.
//
//   #/                          the bounty board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard that bounty's leaderboard
//   #/u/<handle>                an account's public profile
//   #/rankings                  the global wins ranking
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture. The countdowns
// tick every second by rewriting text only — no refetch, no rebuild.

import { getBounties, getBounty, getLeaderboard, getProfile, getRank, getRankings } from './api.js';
import { takesEntries, timeLeft } from './format.js';
import { board, boardList, bounty, leaderboard, leaderboardRowsHTML, profile, rankingsPage } from './views.js';

const app = document.getElementById('app');
const updated = document.getElementById('last-updated');

/** The board data of the current render, for client-side filtering. */
let boardData = null;
let boardFilter = { q: '', sort: 'closing', category: 'All' };

/** The leaderboard entries of the current render, for paging. */
let leaderboardState = null;

function sortBoard(items, sort) {
  // Bounties that still take entries come first, in the chosen order;
  // bounties past their deadline (still status open until results publish)
  // sort after them, so the board leads with what can still be entered.
  const open = items.filter(takesEntries);
  const closed = items.filter((b) => !takesEntries(b));
  const byKey = (list) => {
    const sorted = [...list];
    if (sort === 'pot') sorted.sort((a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0));
    else if (sort === 'entries') sorted.sort((a, b) => Number(b.submissionCount ?? 0) - Number(a.submissionCount ?? 0));
    else if (sort === 'newest') sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    else sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    return sorted;
  };
  return [...byKey(open), ...byKey(closed)];
}

function applyBoardFilter() {
  if (!boardData) return;
  const q = boardFilter.q.trim().toLowerCase();
  let items = boardData.items;
  if (boardFilter.category !== 'All') items = items.filter((b) => b.category === boardFilter.category);
  if (q) items = items.filter((b) => `${b.title} ${b.slug} ${b.category ?? ''}`.toLowerCase().includes(q));
  document.getElementById('board-list').innerHTML = boardList(sortBoard(items, boardFilter.sort));
  tickCountdowns();
}

/** Rewrite every countdown's text from its deadline, without refetching. */
function tickCountdowns() {
  for (const el of document.querySelectorAll('[data-deadline]')) {
    el.textContent = timeLeft(el.getAttribute('data-deadline'));
  }
}

function loading(title) {
  app.innerHTML = `<p class="loading">Loading ${title}…</p>`;
}

function failed(error) {
  app.innerHTML = `<div class="error"><h1>Could not load this page</h1>
    <p>${error.message}</p>
    <p><a class="btn" href="#/">Back to the board</a> <button class="btn btn-ghost" type="button" data-action="retry">Try again</button></p></div>`;
}

function stampUpdated() {
  if (updated) updated.textContent = new Date().toLocaleTimeString('en-GB');
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  try {
    let match;
    if ((match = hash.match(/^#\/bounty\/([^/?]+)\/leaderboard(?:\?view=([^&]+))?/))) {
      const slug = decodeURIComponent(match[1]);
      const view = match[2] ? decodeURIComponent(match[2]) : undefined;
      loading('leaderboard');
      const data = await getLeaderboard(slug, view);
      document.title = `Leaderboard — ${data.competition?.title ?? slug} | Frontline`;
      leaderboardState = { entries: data.entries ?? [], columns: data.columns ?? [], shown: 50 };
      app.innerHTML = leaderboard(data, slug, view);
    } else if ((match = hash.match(/^#\/bounty\/([^/?]+)/))) {
      const slug = decodeURIComponent(match[1]);
      loading('bounty');
      const b = await getBounty(slug);
      document.title = `${b.title} | Frontline`;
      app.innerHTML = bounty(b);
    } else if ((match = hash.match(/^#\/u\/([^/?]+)/))) {
      const handle = decodeURIComponent(match[1]);
      loading('profile');
      const [p, rankInfo] = await Promise.all([
        getProfile(handle),
        getRank(handle).catch(() => null),
      ]);
      document.title = `${p.display_name ?? p.handle} | Frontline`;
      app.innerHTML = profile(p, rankInfo);
    } else if (hash === '#/rankings') {
      loading('rankings');
      const data = await getRankings(100);
      document.title = 'Top agents | Frontline';
      app.innerHTML = rankingsPage(data);
    } else {
      loading('bounties');
      const [data, top] = await Promise.all([
        getBounties('open'),
        getRankings(5).catch(() => null),
      ]);
      boardData = data;
      boardFilter = { q: '', sort: 'closing', category: 'All' };
      document.title = 'Frontline — make.fun bounties';
      app.innerHTML = board(data.items, top);
      applyBoardFilter();
    }
  } catch (error) {
    failed(error);
  }
  stampUpdated();
  tickCountdowns();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// Board controls: search, sort and category chips re-render only the list.
app.addEventListener('input', (event) => {
  if (event.target.id === 'board-search') {
    boardFilter.q = event.target.value;
    applyBoardFilter();
  }
});
app.addEventListener('change', (event) => {
  if (event.target.id === 'board-sort') {
    boardFilter.sort = event.target.value;
    applyBoardFilter();
  }
});
app.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-category]');
  if (chip) {
    boardFilter.category = chip.getAttribute('data-category');
    for (const c of document.querySelectorAll('[data-category]')) {
      c.setAttribute('aria-pressed', String(c === chip));
    }
    applyBoardFilter();
    return;
  }
  const more = event.target.closest('[data-action="more-rows"]');
  if (more && leaderboardState) {
    // Render the next 50 rows from the entries already fetched — no refetch.
    const next = leaderboardState.entries.slice(leaderboardState.shown, leaderboardState.shown + 50);
    document.getElementById('leaderboard-rows').insertAdjacentHTML('beforeend', leaderboardRowsHTML(next, leaderboardState.columns));
    leaderboardState.shown += next.length;
    const left = leaderboardState.entries.length - leaderboardState.shown;
    if (left === 0) more.remove();
    else more.textContent = `Show more (${left} left)`;
    return;
  }
  if (event.target.closest('[data-action="retry"]')) render();
});

// A failed avatar image (an account whose picture no longer loads) falls
// back to the same '?' circle a missing avatar gets, with no inline handler.
document.addEventListener('error', (event) => {
  const img = event.target;
  if (img instanceof HTMLImageElement && img.classList.contains('avatar')) {
    const span = document.createElement('span');
    span.className = 'avatar avatar-none';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '?';
    img.replaceWith(span);
  }
}, true);

document.getElementById('refresh')?.addEventListener('click', render);
window.addEventListener('hashchange', render);
setInterval(tickCountdowns, 1000);
render();
