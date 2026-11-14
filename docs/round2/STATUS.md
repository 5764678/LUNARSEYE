# LUNARIS Round 2 — status and handoff

**Last updated:** 14 Nov 2026, by the session that built Compare and Data (Claude Sonnet 5.5).
**Update this file before you stop.** A new session has no other context than this repo.

Hackathon: 14–15 Nov 2026. **Working beats well-architected.** The demo is: pick a cited
south-pole site → Moon lit from the SPICE Sun → terrain-aware Sun/Earth timeline → compare
sites with an evidence badge on every number.

## 1. What works today (verified 14 Nov, this container)

| Route | What it shows | Verified |
| --- | --- | --- |
| `/` Overview | Globe lit from SPICE Sun, site picker, timeline lanes + playback, values at cursor, evidence drawer | headless Chromium, no console errors |
| `/illumination` | Sky chart (terrain skyline, Sun/Earth tracks), terrain-vs-flat tables, sunlit/Earth-visible windows (censored shown as "≥") | headless Chromium |
| `/terrain` | South-pole 3D scene lit by SPICE Sun; slope/roughness/footprint from PGDA 20 m DEM (HTTP range reads) | headless Chromium |
| `/compare` | Up to 10 sites; leaders, Pareto dominance, generated verdict, optional profile score with visible weights; badge on every cell | headless Chromium + API tests |
| `/data` | Dataset registry: provider, citation, usage, files, SHA-256, acquisition status | headless Chromium + API test |

API (`apps/api`, FastAPI + Postgres): `GET /health`, `/v1/sites`, `/v1/sites/{id}`,
`/v1/sites/{id}/timeline`, `/v1/sites/{id}/terrain`, `/v1/terrain/scene`, `/v1/compare`,
`/v1/datasets`, `/v1/datasets/{id}`, `/v1/ephemeris/sun`. Error envelope + `X-Request-ID` on
every non-2xx. Interactive docs at `/docs`.

Checks that passed at the end of this session:
`uv run pytest` → 282 passed, 1 skipped (`gdaldem` binary absent) · `npm run test:web` → 38
passed · `npm run typecheck` clean · `npm run build` succeeds (all 5 routes static).

**Known fixture (matches the original handoff §2):** demo trio over 2027
(`/v1/compare?site_ids=<trio>&start_utc=2027-01-01T00:00:00Z&end_utc=2028-01-01T00:00:00Z`):
Peak near Shackleton leads on slope, sunlight, darkness and Earth visibility but is the
roughest; Malapert massif is smoothest; under the `landing` profile Malapert scores first
(0.739 vs 0.700 vs 0.156). Pinned in `tests/api/test_compare.py`.

## 2. NOT done / not verified (be honest about these in any demo or write-up)

- **No site registration/deletion.** Registry is read-only (27 cited sites). Adding a writable,
  unauthenticated registry needs a user decision before any public deploy (publicly writable;
  only the 250-site cap would protect it).
- **No Alembic.** `create_all` + idempotent catalogue seed at start-up (`apps/api/.../db.py`).
- **No golden-master capture** against the prototype; the known fixture above is pinned in tests
  instead. Capturing needs the prototype run from the snapshot checkout.
- **No CI** (`.github/workflows` absent), no import-linter/ESLint boundaries, no perf budgets.
- **No content-addressed cache / single-flight / process pool.** Caching is an in-process LRU
  plus horizon-mask files under `data/processed/`. Science runs in request threads.
  Measured once, in a fresh container with nothing cached: the first demo-trio compare for 2027
  took 5.5 s end to end (including the PGDA window reads and horizon masks for 3 sites). Not
  measured: a cold 10-site compare, or repeat-call latency. The earlier session's code comment
  puts a first PGDA read at ~10–15 s per site; treat large cold compares as slow.
- **No deploy config** (Docker image / Render). `docker-compose.yml` is Postgres only and has
  not been run (no Docker daemon in the build container).
- **Compare**: observer height fixed at 2 m; no compare-specific caching; sample cap is 10 000
  per request (a year hourly = 8 761).
- **Ruff**: ~28 style findings in `apps/api/src` from earlier work; no gate exists.
- Not verified: behaviour on a phone width; accessibility audit; Safari/Firefox.
- The `docs/` of the prototype (ARCHITECTURE, API, SCIENCE, DECISIONS) are **not** copied here.
  Read them from the prototype (see §6) when you need the science rationale.

## 3. Run it (cloud container recipe)

```bash
service postgresql start                    # then once:  su postgres -c "psql -c \"CREATE ROLE lunaris LOGIN PASSWORD 'lunaris'\" -c \"CREATE DATABASE lunaris OWNER lunaris\""
uv sync && npm install && npm run data      # data ≈ 87 MB from NASA/NAIF/PDS, SHA-256 checked, ~1 min
npm run dev:api                             # :8000
npm run dev:web                             # :3000, proxies /api/* to :8000
```
Gotchas seen in this container:
- Postgres is installed but **down at session start**: `service postgresql start`.
- `data/` and `apps/web/public/textures/moon/moon-color.jpg` are git-ignored; re-run
  `npm run data` in every fresh container (~1 min).
- Next dev server can serve a **stale Turbopack SSR bundle** after adding exports
  ("x is not a function"): kill it, `rm -rf apps/web/.next`, restart.
- After changing any API schema/route: with the API running, `npm run contracts:generate`
  regenerates `apps/web/src/shared/api/{openapi.json,generated}`. Commit the result.
- Playwright + Chromium are preinstalled; `NODE_PATH=$(npm root -g) node script.js` finds
  `playwright`. Scratch scripts belong outside the repo.

## 4. Code map

```
packages/science, packages/data, tests/science   FROZEN (prototype @ 8edfb32). Never edit.
apps/api/src/lunaris_api/
  main.py            app, lifespan, error envelope, sites/timeline/ephemeris routes
  routers/           terrain.py, compare.py, datasets.py  (add new routers here, include in main.py)
  services/          analysis.py (timeline), horizon.py, terrain.py, compare.py,
                     compare_summary.py (pure; ported from prototype, tested)
  schemas*.py        Pydantic contract v1 (schemas.py, schemas_terrain/compare/datasets.py)
  db.py deps.py errors.py
apps/web/src/
  app/               thin routes; shell.tsx has the nav
  features/          overview, illumination, terrain, compare, data, sites, time, timeline
  shared/api/        client.ts (hand-written fetch + key factory), queries.ts, generated/ (OpenAPI types)
  shared/state/      url.ts (site/window/sites/profile live in the URL), time.ts, evidence.ts
  shared/lib/        carried, tested display math (geo, globe, terrain, time)
  viewport/          R3F globe and terrain scene
tests/api/           ASGI tests (need Postgres + data; skip cleanly without)
```
Rules the code follows: evidence on every number (`EvidenceBadge`); a value that cannot be
computed is `null` with a reason, never 0; thresholds and profile weights are labelled
assumptions; Sun/Earth numbers use the **terrain** horizon (flat horizon is reported
separately); latitude exactly ±90° is rejected explicitly (timeline) and becomes null cells
with a reason (compare).

## 5. Suggested next steps (in priority order; the user has not ranked them)

1. **Demo path polish** (cheap, high value): make `/` land on a clear story; add a "Compare the
   demo trio" call to action; check mobile width; screenshots for the submission.
2. **README/status honesty pass**: README still says Compare/Data are Phase 2 and lists the
   Phase 1 cuts. Update it to match §1–2 above.
3. **CI**: GitHub Actions for `npm run typecheck`, `npm run test:web`, `npm run build`, and
   `uv run pytest` (needs the Postgres service and `npm run data`; cache `data/`).
4. **Site registration** (`POST/DELETE /v1/sites`, cap 250, case-insensitive unique names,
   lat ∈ [−90, 90], lon ∈ [0, 360), `Idempotency-Key`). **Ask the user first** about public
   writability.
5. **Alembic** `0001_schema` / `0002_seed_catalog` replacing `create_all`.
6. **Golden-master capture** vs the prototype for demo trio + edge sites.
7. **Perf**: process pool for science, single-flight on identical requests, warm demo-trio
   masks in the lifespan; record numbers in `docs/round2/budgets.md`.
8. **Deploy config** — flag to the user before any public deploy.

## 6. Reference material and rules

- Prototype (read-only, never push): `5764678/lunaris`, branch
  `snapshot/pre-education-pivot-2026-11-11`, code identical to commit `8edfb32`. In a cloud
  session: `add_repo` (read), then `git clone --depth 50 --branch snapshot/pre-education-pivot-2026-11-11
  https://github.com/5764678/lunaris /home/user/lunaris` and verify
  `git diff 8edfb32 -- packages apps tests` is empty. Best requirement sources there:
  `docs/DECISIONS.md` (D1–D9), `docs/SCIENCE.md`, `docs/API.md`, `docs/round2/HANDOFF.md`.
- No auth. No educational features. Frozen science/data. Anything beyond that: ask the user.
- Branching: develop on the branch your session names; push there. The user has said to
  **merge any open and future pull requests** in this repo (PR 1 was merged by the session
  that wrote this file). Do not open a PR unless the user asks.
- The original task text said "PRIORITY ORDER (this overrides the handoff's schedule…)" but
  the list itself was cut off in the message this session received. If the user restates it,
  follow theirs over §5.
- Commit trailers requested by the harness: `Co-Authored-By: …` and `Claude-Session: …`
  lines as given in the session's system reminder.

## 7. Session log

| Session | Did |
| --- | --- |
| Session A (Fable 5.2, `claude/admiring-hamilton-sp4gwl`, PR 1, merged) | Phase 1 end-to-end path; Illumination page; Terrain page + terrain API |
| Session B (Sonnet 5.5, `claude/gifted-allen-smvncn`) | Verified Phase 1/2 state; Compare API + page (ported summary logic) with tests; Data API + page; `next build` verified; CLAUDE.md + this file |
