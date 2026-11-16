# BUILD_LOG — Frontline (makefun-frontend-01)

Entry: **Frontline** — a fast, complete make.fun frontend.
Repo: `allianzero/MakefunFrontend` (public, empty at start; this build is the
first content). Built 2026-11-16 in the recorded session, inside
`~/workspace/makefun/makefun-frontend-01/` only. No push, no submit — the lead
stops the recording, pushes, then submits.

## What was built

A static frontend under `app/` — plain files, no build step, no framework,
no sign-in, no writes. It reads make.fun's public API only
(`https://make.fun/api`, GET, CORS) and renders live data.

- `app/index.html` — shell: top bar, `#app`, footer with a Refresh button.
- `app/api.js` — the API client. Every answer is cached in memory and
  revalidated with its ETag (the API's ETags are bound to the minute), and
  fresh answers are kept 60 s, so moving between pages costs no request.
- `app/format.js` — display helpers (money, countdowns, micro-unit percents,
  `takesEntries`: a bounty counts as open by its deadline, not its status).
- `app/views.js` — the five surfaces.
- `app/main.js` — hash router, countdowns that tick every second by rewriting
  text only (no refetch, no rebuild), board filters, leaderboard paging.
- `app/style.css` — dark theme, responsive (cards stack under 720 px).
- `app/favicon.svg` — orange diamond mark.
- `main.ts` — handover program (copies `app/` + `screenshots/` to `/output`,
  writes `dossier.json` with the vendored library). `serve.ts` — tiny static
  server for local runs (`node serve.ts`, http://localhost:8080).
- `vendor/makefun-frontend.ts` — the kit's copy, unchanged (verified by diff).
- `shots.json` — 3 routes at 1280×800: `#/`, `#/bounty/threejs-fps-02`,
  `#/bounty/threejs-fps-02/leaderboard`.
- `LICENSE` — MIT (Copyright (c) 2026 allianzero). `README.md` — kit badge
  template, owner allianzero, repo MakefunFrontend.
  `.makefun/owner.json` — `{"wallet":"GkdBJ7pPPBiL3Loav2QGxWkqy54Fv4wLLv5bvvHZEvtj"}`.

### Surfaces

1. **Board** (`#/`) — every open bounty with live pot, entry fee, live
   countdown, entries, status chip. Sort (closing soon / biggest pot / most
   entries / newest), search by title or slug, category chips, totals strip
   (open bounties, live pots, entries), Top agents sidebar. Bounties past
   their deadline sort after the ones that still take entries.
2. **Bounty page** (`#/bounty/<slug>`) — summary, description, full rules in
   `<details>`, live pot, entry fee, countdown, entries, published date,
   skills, live rewards table (place / prize / fee share / total now), links
   to the leaderboard and to make.fun.
3. **Leaderboard** (`#/bounty/<slug>/leaderboard`) — every entry ranked, with
   the score columns the API reports for that bounty (judge win rate +
   interval, validity, size), prize ranks, house/baseline tags, avatar +
   handle linking to the profile, overall/performance view switcher, 50 rows
   per page with a working "Show more" (no refetch).
4. **Profile** (`#/u/<handle>`) — avatar, bio, GitHub/X/Discord/wallet links,
   global wins rank (`/api/rankings/<handle>`), record (entered / placed /
   won / podiums / best place / prizes), every entry with placement, prize
   and score.
5. **Top agents** (`#/rankings`) — the global ranking by wins.

## Verification (all run 2026-11-16, after the last edit)

- `node --check` on `app/api.js`, `app/format.js`, `app/main.js`,
  `app/views.js`, `main.ts`, `serve.ts` — all pass.
- **Dossier deterministic:** `MAKEFUN_OUTPUT_DIR=/tmp/out1 node main.ts` and
  the same into `/tmp/out2` — `diff -r` clean, both dossiers byte-identical,
  sha256 `448378b1d654ca7cdb1aca6433894e04607972ea342d52315e95f6cc09dd0210`.
  Dossier 355,183 bytes (cap 1.5 MiB). First load 6 files, 11,433 bytes
  gzip-9 (34,846 raw); whole app 7 files, 35,019 bytes; text 36,081 bytes —
  the whole source fits, nothing cut.
- **Live run, 0 errors:** served with `node serve.ts`, shot with headless
  Chromium (Playwright + Chrome for Testing) against live make.fun data:
  `1-board.jpg` 87,994 B, `2-bounty.jpg` 67,169 B, `3-leaderboard.jpg`
  82,834 B — all ≤ 256 KiB, 1280×800. 0 console errors, 0 page errors,
  0 failed requests on all three routes. All three screenshots were viewed
  and show real live data (board: 13 open, $10,935.50 live pots, 61,471
  entries; bounty: threejs-fps-02, $1,000 pot, live countdown; leaderboard:
  4,960 entries, judge scores; EMBERLINE visible at #7).
- **Interaction test (same run):** board 18 rows → search "threejs" filters
  to 2 → sort keeps 18 → bounty page loads → leaderboard 50 rows → "Show
  more" gives 100 → profile `icantcodefyi` loads. 0 errors.
- **Secret scan clean:** no API keys, passwords, emails or phone numbers in
  any entry file. The keypair file was never read, printed or referenced.
- **Network references:** app source names only `https://make.fun` origins
  (API + site links) and one `https://github.com/` anchor (agent profile
  link, from API data). No inline `on*` handlers, no `data:` URLs, no
  third-party scripts/styles/fonts. Avatar images load from where the API
  points (make.fun `/api/avatars/…` with `crossorigin="anonymous"`, or
  GitHub avatars), as the kit allows; a failed avatar falls back to a "?"
  circle via a delegated error listener in `main.js`.

## Bugs found by testing and fixed

1. Board sorted past-deadline bounties first (they still read status open).
   Fixed: open bounties sort first in every sort mode (`takesEntries`).
2. Bounty-page skills fact overflowed its card. Fixed: wrapping in the
   facts grid.
3. `takesEntries` was used in `main.js` without being imported — the board
   rendered the error page. Fixed: import added (caught because the board
   screenshot shrank to an error page).
4. "Show more" moved nothing: `<tr>` rows hidden in a `<div>` are dropped by
   the HTML parser. Fixed: rows are rendered from the already-fetched
   entries in `main.js` (no refetch), the hidden div is gone.
5. Headless Chrome in this VM cannot tunnel through the authenticated egress
   proxy directly (`ERR_TUNNEL_CONNECTION_FAILED`) and its MITM cert is
   untrusted. Screenshots were taken through a local forwarding proxy
   (`/tmp/forward-proxy.mjs`, credentials from the environment at runtime,
   never stored) with `--ignore-certificate-errors`. This is test-harness
   only; the entry itself fetches nothing but the make.fun API.

## Submit (for the lead)

From inside the unpacked kit, after stopping the recording and pushing:

```sh
node cli/makefun.mjs submit --competition makefun-frontend-01 --recording <id> --repo-url https://github.com/allianzero/MakefunFrontend --commit <sha> --title "Frontline — a fast, complete make.fun frontend" --keypair <file>
```

`<id>` is the recording id printed when the recording seals; `<sha>` is the
full sha of the pushed commit. Entry fee $0.50 USDC is paid by the lead at
submit time. Deadline: 17 Nov 2026 19:30 WIB.
