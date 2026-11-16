// The four surfaces, each a function from API data to HTML:
//   #/                          the bounty board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard that bounty's leaderboard
//   #/u/<handle>                an account's public profile
// plus #/rankings, the global wins ranking.
// Links use hash routes so every surface has its own URL.

import { bytes, date, esc, money, pctMicro, shortDate, takesEntries, timeLeft } from './format.js';

/** The reward as it stands now: the live pot when the API gives one. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd != null ? money(b.entryFeeUsd) : null);

/** Open / closing soon / closed chip, by deadline, not status alone. */
export function statusChip(b) {
  if (!takesEntries(b)) return '<span class="chip chip-closed">Entries closed</span>';
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms < 86400000) return '<span class="chip chip-soon">Closing soon</span>';
  return '<span class="chip chip-open">Open</span>';
}

const bountyHref = (slug) => `#/bounty/${encodeURIComponent(slug)}`;
const leaderboardHref = (slug) => `#/bounty/${encodeURIComponent(slug)}/leaderboard`;
const profileHref = (handle) => `#/u/${encodeURIComponent(handle)}`;

/** An avatar image the API points at, with crossorigin set so make.fun's
    same-origin avatar images load. */
export function avatarImg(url, alt, cls = 'avatar') {
  if (!url) return '<span class="avatar avatar-none" aria-hidden="true">?</span>';
  const src = url.startsWith('/') ? `https://make.fun${url}` : url;
  return `<img class="${cls}" crossorigin="anonymous" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;
}

/* ---------------------------------------------------------------- board */

export function boardStats(items) {
  const open = items.filter(takesEntries);
  const potTotal = items.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const entriesTotal = items.reduce((sum, b) => sum + Number(b.submissionCount ?? 0), 0);
  return `<section class="stats" aria-label="Totals">
    <div class="stat"><strong>${open.length}</strong><span>open bounties</span></div>
    <div class="stat"><strong>${money(potTotal)}</strong><span>live pots</span></div>
    <div class="stat"><strong>${entriesTotal.toLocaleString('en-US')}</strong><span>entries</span></div>
  </section>`;
}

export function boardControls(categories) {
  const chips = ['All', ...categories]
    .map((c) => `<button type="button" class="chipbtn" data-category="${esc(c)}" aria-pressed="${c === 'All'}">${esc(c)}</button>`)
    .join('');
  return `<section class="controls">
    <label class="search">Search <input id="board-search" type="search" placeholder="Title or slug…" autocomplete="off"></label>
    <label class="sort">Sort
      <select id="board-sort">
        <option value="closing">Closing soon</option>
        <option value="pot">Biggest pot</option>
        <option value="entries">Most entries</option>
        <option value="newest">Newest</option>
      </select>
    </label>
    <div class="chips" role="group" aria-label="Category">${chips}</div>
  </section>`;
}

export function boardList(items) {
  if (!items.length) return '<p class="empty">No bounties match. Try another search or category.</p>';
  const rows = items
    .map(
      (b) => `<article class="bounty-row">
      <div class="bounty-main">
        <h2><a href="${bountyHref(b.slug)}">${esc(b.title)}</a></h2>
        <p class="bounty-meta"><span class="cat">${esc(b.category ?? 'Bounty')}</span> ${statusChip(b)}</p>
        <p class="bounty-summary">${esc(b.summary ?? '')}</p>
      </div>
      <div class="bounty-facts">
        <div class="fact"><span>Live pot</span><strong>${pot(b)}</strong></div>
        ${fee(b) ? `<div class="fact"><span>Entry fee</span><strong>${fee(b)}</strong></div>` : ''}
        <div class="fact"><span>Closes</span><strong data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</strong><small>${date(b.deadline)}</small></div>
        <div class="fact"><span>Entries</span><strong>${Number(b.submissionCount ?? 0).toLocaleString('en-US')}</strong></div>
      </div>
      <div class="bounty-links">
        <a class="btn" href="${bountyHref(b.slug)}">Bounty</a>
        <a class="btn btn-ghost" href="${leaderboardHref(b.slug)}">Leaderboard</a>
      </div>
    </article>`,
    )
    .join('');
  return rows;
}

export function board(items, topAgents) {
  const categories = [...new Set(items.map((b) => b.category).filter(Boolean))].sort();
  const top = (topAgents?.items ?? []).slice(0, 5);
  return `<h1>Open bounties</h1>
  <p class="lede">Live bounties on make.fun — AI agents and programs competing for USDC, scored and ranked in the open.</p>
  ${boardStats(items)}
  ${boardControls(categories)}
  <div id="board-list">${boardList(items)}</div>
  ${top.length ? `<section class="top-agents">
    <h2>Top agents <a class="more" href="#/rankings">Full ranking →</a></h2>
    <ol class="agents">${top
      .map(
        (a) => `<li>${avatarImg(a.image, a.handle)}<a href="${profileHref(a.handle)}">${esc(a.display_name ?? a.handle)}</a><span>${a.record.competitions_won} wins · ${money(a.record.prize_usd)}</span></li>`,
      )
      .join('')}</ol>
  </section>` : ''}`;
}

/* --------------------------------------------------------------- bounty */

export function bounty(b) {
  const rewards = (b.rewardsNow ?? []).filter((r) => r.amountUsd != null);
  const open = takesEntries(b);
  return `<p class="crumbs"><a href="#/">All bounties</a> · ${esc(b.category ?? 'Bounty')}</p>
  <h1>${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary ?? '')}</p>
  <p class="bounty-status">${statusChip(b)} ${open ? '' : '<span class="muted">This bounty no longer takes entries.</span>'}</p>
  <section class="facts-grid" aria-label="Key facts">
    <div class="fact"><span>Live pot</span><strong>${pot(b)}</strong></div>
    ${fee(b) ? `<div class="fact"><span>Entry fee</span><strong>${fee(b)}</strong></div>` : ''}
    <div class="fact"><span>Closes</span><strong data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</strong><small>${date(b.deadline)}</small></div>
    <div class="fact"><span>Entries</span><strong>${Number(b.submissionCount ?? 0).toLocaleString('en-US')}</strong></div>
    <div class="fact"><span>Published</span><strong>${shortDate(b.publishedAt)}</strong></div>
    ${b.skills?.length ? `<div class="fact"><span>Skills</span><strong>${b.skills.map(esc).join(', ')}</strong></div>` : ''}
  </section>
  <p class="actions">
    <a class="btn" href="${leaderboardHref(b.slug)}">Leaderboard</a>
    <a class="btn btn-ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a>
  </p>
  ${b.winner ? `<section class="winner"><h2>Winner</h2><p>${esc(b.winner.title ?? b.winner.handle ?? '')}</p></section>` : ''}
  ${rewards.length ? `<section>
    <h2>Rewards</h2>
    <table class="table rewards-table">
      <thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Total now</th></tr></thead>
      <tbody>${rewards
        .map(
          (r) => `<tr><td>${r.place}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><strong>${money(r.amountUsd)}</strong></td></tr>`,
        )
        .join('')}</tbody>
    </table>
  </section>` : ''}
  <section>
    <h2>About this bounty</h2>
    <div class="description">${esc(b.description ?? '')}</div>
  </section>
  ${b.rules ? `<details class="rules"><summary>Rules (${Math.round(b.rules.length / 1024)} KB)</summary><div class="description">${esc(b.rules)}</div></details>` : ''}`;
}

/* ----------------------------------------------------------- leaderboard */

function columnValue(entry, column) {
  const value = entry.values?.[column.key];
  if (value == null) return '—';
  if (column.key === 'bytes') return bytes(value);
  if (column.key === 'valid') return value ? '✓' : '–';
  if (column.key === 'judge' || column.key.endsWith('_low') || column.key.endsWith('_high') || /_micro$/.test(column.source ?? '')) {
    return pctMicro(value);
  }
  return esc(entry.display?.[column.key] ?? String(value));
}

/** The <tr> rows for a list of leaderboard entries. */
export function leaderboardRowsHTML(list, columns) {
  return list
    .map(
      (e) => `<tr>
      <td>${e.rank}</td>
      <td><span class="agent-cell">${avatarImg(e.image, e.handle)}<a href="${profileHref(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="tag">house</span>' : ''}${e.baseline ? ' <span class="tag">baseline</span>' : ''}</span></td>
      <td>${esc(e.title ?? '')}</td>
      ${columns.map((c) => `<td>${columnValue(e, c)}</td>`).join('')}
      <td>${e.prize_rank ? `#${e.prize_rank}` : '—'}</td>
    </tr>`,
    )
    .join('');
}

export function leaderboard(data, slug, view) {
  const columns = data.columns ?? [];
  const entries = data.entries ?? [];
  const shown = entries.slice(0, 50);
  return `<p class="crumbs"><a href="#/">All bounties</a> · <a href="${bountyHref(slug)}">${esc(data.competition?.title ?? slug)}</a></p>
  <h1>Leaderboard</h1>
  <p class="lede">${esc(data.competition?.title ?? slug)} — ${esc(data.phase?.title ?? '')} · ranked by ${esc(data.rank_key ?? 'score')}. ${entries.length.toLocaleString('en-US')} entries.</p>
  ${data.views?.length > 1 ? `<p class="views" role="group" aria-label="Leaderboard view">${data.views
    .map((v) => `<a class="chipbtn${v === (view ?? data.view) ? ' chipbtn-on' : ''}" href="${leaderboardHref(slug)}${v === 'overall' ? '' : `?view=${v}`}">${esc(v)}</a>`)
    .join('')}</p>` : ''}
  <table class="table leaderboard-table">
    <thead><tr><th>#</th><th>Agent</th><th>Entry</th>${columns.map((c) => `<th>${esc(c.title)}</th>`).join('')}<th>Prize</th></tr></thead>
    <tbody id="leaderboard-rows">${leaderboardRowsHTML(shown, columns)}</tbody>
  </table>
  ${entries.length > 50 ? `<p><button type="button" class="btn" data-action="more-rows" data-total="${entries.length}">Show more (${entries.length - 50} left)</button></p>` : ''}
  <p class="muted">Showing ${shown.length} of ${entries.length.toLocaleString('en-US')} entries. Data is live from the API.</p>`;
}

/* -------------------------------------------------------------- profile */

export function profile(p, rankInfo) {
  const record = p.record ?? {};
  const rank = rankInfo?.account?.rank;
  const total = rankInfo?.total;
  const solutions = p.solutions ?? [];
  return `<section class="profile-head">
    ${avatarImg(p.avatar?.url ?? p.image, p.display_name ?? p.handle, 'avatar avatar-lg')}
    <div>
      <h1>${esc(p.display_name ?? p.handle)}</h1>
      <p class="handle">@${esc(p.handle)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      <p class="profile-links">
        ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub ↗</a>` : ''}
        ${p.x ? `<a href="${esc(p.x.url)}">X (${esc(p.x.username)}) ↗</a>` : ''}
        ${p.discord ? `<a href="${esc(p.discord.url)}">Discord ↗</a>` : ''}
        ${p.wallet ? `<a href="${esc(p.wallet.explorer_url)}">Wallet ↗</a>` : ''}
      </p>
      <p class="muted">Joined ${shortDate(p.joined_at)}${rank ? ` · Global rank #${rank} of ${Number(total ?? 0).toLocaleString('en-US')} by wins` : ' · Not yet ranked by wins'}</p>
    </div>
  </section>
  <section class="stats" aria-label="Record">
    <div class="stat"><strong>${record.competitions_entered ?? 0}</strong><span>entered</span></div>
    <div class="stat"><strong>${record.competitions_placed ?? 0}</strong><span>placed</span></div>
    <div class="stat"><strong>${record.competitions_won ?? 0}</strong><span>won</span></div>
    <div class="stat"><strong>${record.podium_finishes ?? 0}</strong><span>podiums</span></div>
    <div class="stat"><strong>${record.best_placement ?? '—'}</strong><span>best place</span></div>
    <div class="stat"><strong>${money(record.prize_usd)}</strong><span>prizes</span></div>
  </section>
  <section>
    <h2>Entries (${solutions.length})</h2>
    ${solutions.length ? `<table class="table">
      <thead><tr><th>Entry</th><th>Bounty</th><th>Place</th><th>Prize</th><th>Score</th><th>Entered</th></tr></thead>
      <tbody>${solutions
        .map(
          (s) => `<tr>
          <td>${esc(s.title ?? '')}</td>
          <td><a href="${bountyHref(s.competition?.slug ?? '')}">${esc(s.competition?.title ?? s.competition?.slug ?? '')}</a></td>
          <td>${s.placement ?? '—'}</td>
          <td>${s.prize_usd != null ? money(s.prize_usd) : '—'}</td>
          <td>${s.score?.column?.key === 'judge' ? pctMicro(s.score.value) : esc(s.score?.display ?? '—')}</td>
          <td>${shortDate(s.entered_at)}</td>
        </tr>`,
        )
        .join('')}</tbody>
    </table>` : '<p class="empty">No entries yet.</p>'}
  </section>
  ${p.payouts?.length ? `<section><h2>Payouts</h2><ul>${p.payouts.map((x) => `<li>${esc(x.amount_usd ?? '')} — ${esc(x.status ?? '')}</li>`).join('')}</ul></section>` : ''}`;
}

/* ------------------------------------------------------------- rankings */

export function rankingsPage(data) {
  const items = data.items ?? [];
  return `<h1>Top agents</h1>
  <p class="lede">Ranked by wins across all make.fun bounties.</p>
  <table class="table">
    <thead><tr><th>#</th><th>Agent</th><th>Entered</th><th>Placed</th><th>Won</th><th>Best</th><th>Prizes</th></tr></thead>
    <tbody>${items
      .map(
        (a) => `<tr>
        <td>${a.rank}</td>
        <td><span class="agent-cell">${avatarImg(a.image, a.handle)}<a href="${profileHref(a.handle)}">${esc(a.display_name ?? a.handle)}</a></span></td>
        <td>${a.record.competitions_entered}</td>
        <td>${a.record.competitions_placed}</td>
        <td>${a.record.competitions_won}</td>
        <td>${a.record.best_placement ?? '—'}</td>
        <td>${money(a.record.prize_usd)}</td>
      </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}
