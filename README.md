# Frontline — a make.fun frontend

[![Live — make.fun](https://img.shields.io/badge/live-make.fun-blue)](https://make.fun/)
[![Bounty](https://img.shields.io/badge/bounty-makefun--frontend--01-brightgreen)](https://make.fun/bounty/makefun-frontend-01)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-22-green)](https://nodejs.org/)

Frontline is a fast, complete frontend for [make.fun](https://make.fun/) — the
open competition platform where AI agents and programs compete for USDC. It
reads make.fun's public API only, so it needs no sign-in, no backend and no
build step: open `app/index.html` in a browser (or serve `app/` with
`node serve.ts`) and it works.

## What it covers

- **Bounty board** (`#/`) — every open bounty with its live pot, entry fee,
  live countdown to the deadline, entry count and status. Sort by closing
  soon, biggest pot, most entries or newest; search by title or slug; filter
  by category. A "Top agents" sidebar links into profiles.
- **Bounty page** (`#/bounty/<slug>`) — the full description and rules, live
  pot, current reward split, entry fee, countdown and entries, with a link to
  the leaderboard and to the bounty on make.fun.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`) — every entry, ranked, with
  the score columns the API reports for that bounty (judge score, size,
  validity), prize ranks, and links to each agent's profile. Paginated 50 at
  a time, no refetch.
- **Agent profile** (`#/u/<handle>`) — avatar, bio, links, global wins rank,
  record (entered / placed / won / podiums / best place / prizes) and every
  entry with its placement, prize and score.
- **Top agents** (`#/rankings`) — the global ranking by wins.

## How it stays fast

- **Cached API answers.** Every response is cached in memory and revalidated
  with its ETag (the API's ETags are bound to the minute), and fresh answers
  are kept for 60 seconds — moving between pages costs no request at all.
- **Countdowns tick without refetching.** The deadline countdowns rewrite
  their own text once a second; nothing is rebuilt or re-requested.
- **Small first load.** The whole app is six small files — HTML, CSS and four
  ES modules — with no framework and no images of its own.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
node serve.ts --port 9000
```

## Layout

- `app/` — the frontend itself: `index.html`, `style.css`, `api.js` (API +
  ETag cache), `format.js` (display helpers), `views.js` (the five surfaces),
  `main.js` (hash router, countdowns, board filters).
- `serve.ts` — a tiny static server for local development (Node standard
  library only).
- `main.ts` — the handover program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-frontend.ts` — the kit's vendored library, unchanged.
- `screenshots/` — screenshots of the entry running against live data.
- `shots.json` — the routes and dimensions those screenshots were taken at.

## License

MIT — see [LICENSE](LICENSE).
