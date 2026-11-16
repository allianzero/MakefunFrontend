// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory and revalidated with its ETag: the API's
// ETags are bound to the minute, so an If-None-Match inside the same minute
// answers 304 and the cached body is used. A fresh answer is also kept for
// 60 seconds, so moving between routes (board -> bounty -> back) costs no
// request at all. A view therefore makes few requests and never refetches
// data it already holds.

const API = 'https://make.fun/api';
const FRESH_MS = 60_000;

/** url -> { etag, body, at } */
const cache = new Map();

async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.body;

  const headers = {};
  if (hit?.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('ETag'), body, at: Date.now() });
  return body;
}

/** The open bounties, with live pots and entry counts. */
export const getBounties = (status = 'open') =>
  get(`/competitions?status=${encodeURIComponent(status)}&activity=times`);

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard, optionally in one of its views. */
export const getLeaderboard = (slug, view) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard${view ? `?view=${encodeURIComponent(view)}` : ''}`);

/** An account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** An account's place on the global wins ranking. */
export const getRank = (handle) => get(`/rankings/${encodeURIComponent(handle)}`);

/** The top of the global wins ranking. */
export const getRankings = (limit = 10) => get(`/rankings?limit=${limit}`);
