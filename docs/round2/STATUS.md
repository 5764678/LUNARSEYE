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

- **No site registration/deletion, by decision** (informational site, nothing user-mutable;
  see §6). Do not build it.
- **No Alembic.** `create_all` + idempotent catalogue seed at start-up (`apps/api/.../db.py`).
- **No golden-master capture** against the prototype; the known fixture above is pinned in tests
  instead. Capturing needs the prototype run from the snapshot checkout.
- **No CI** (`.github/workflows` absent), no import-linter/ESLint boundaries, no perf budgets.
- **No content-addressed cache / single-flight / process pool.** Caching is an in-process LRU
  plus horizon-mask files under `data/processed/`. Science runs in request threads.
  Measured: in a fresh sandbox with nothing cached, the first demo-trio compare for 2027 took
  5.5 s end to end. In the prewarmed Docker image (all 27 sites' masks and terrain windows
  built into it): trio 3.0 s cold / 0.02 s repeat; 10 sites cold 6.8 s. Memory: see DEPLOY.md.
- **Deployed** (free Render plan): **https://lunarseye.onrender.com** , see `docs/round2/DEPLOY.md`
  for service ids, auto-deploy behaviour and the open collaborator-invite item. Free plan is
  512 MiB and 0.1 CPU: it was OOM-killed twice before fixes (502s). Fixed and **verified on Render** (memory ≈ 206 MiB under load; cold 10-site compare 2.2 s): one timeline computation at a time + default timelines baked at image build. See DEPLOY.md "Memory".
- **Compare**: observer height fixed at 2 m; per-site rows cached in memory (256 max); sample
  cap is 10 000 per request (a year hourly = 8 761).
- **Ruff**: ~28 style findings in `apps/api/src` from earlier work; no gate exists.
- Not verified: behaviour on a phone width; accessibility audit; Safari/Firefox.
- The `docs/` of the prototype (ARCHITECTURE, API, SCIENCE, DECISIONS) are **not** copied here.
  Read them from the prototype (see §6) when you need the science rationale.

## 3. Run it (cloud container recipe)

Production-style, all in one container: see `docs/round2/DEPLOY.md`
(`docker compose --profile app up --build`).


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
- **Docker daemon is not running at session start** (client installed, no socket). Start it with
  `nohup dockerd > /tmp/dockerd.log 2>&1 &`, then it works. Behind the sandbox proxy a build needs
  `--network=host --build-arg HTTPS_PROXY=$HTTPS_PROXY --build-context extra-ca=<dir with ca-bundle.crt>`
  (see DEPLOY.md).
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

## 5. Next steps (user's order: quality work, then polish)

Quality work (14 Nov progress marked):
1. **Contracts — drift gate DONE.** `tests/api/test_contract_drift.py` fails if the committed
   `apps/web/src/shared/api/openapi.json` differs from the app's live schema, and checks every
   declared error response uses the shared envelope (it caught `/v1/datasets/{id}` advertising
   FastAPI's default 422 schema; fixed). Still hand-written: the fetch wrapper in
   `shared/api/client.ts` (types come from the generated file; no Zod/runtime validation).
   Regenerate after any API change: `npm run contracts:generate` (API running), or
   `uv run python -c "import json; from lunaris_api.main import app; open('apps/web/src/shared/api/openapi.json','w').write(json.dumps(app.openapi()))" && npm run generate -w @lunaris/web`.
2. **Caching:** done for now (see DEPLOY.md "Memory": timeline LRU capped at 8, compare caches
   small rows). Remaining ideas (optional): single-flight for identical concurrent requests,
   ETag/`Cache-Control` on compare. Only if measurements justify.
3. **Tests:** API tests cover compare/datasets/timeline/terrain/contract; web has only carried
   display-math tests. **E2E smoke DONE:** `scripts/smoke.mjs` (any `BASE_URL`; see header)
   checks health, all 5 pages for console errors, the compare verdict + landing-profile
   ranking, and the evidence drawer; passes against the production container; exits non-zero
   when the site is down. Run it against Render after deploying. Not done: golden-master
   capture vs the prototype (needs the prototype run); "Shackleton floor 0 % sunlit" has no
   catalogue site to test with (the catalogue has tile centres such as "Shackleton rim").
4. **Docs:** keep README + this file current; add `docs/round2/disposition.md` only if asked.
5. Alembic replacing `create_all`; CI (typecheck, vitest, build, pytest with Postgres + data).
Polish for the submission: **DONE 14 Nov:** landing intro + CTA to the demo comparison; phone layout (overflow 154 px → 0 at 390 px on all 5 routes; verified by screenshots, not on a real phone). **Not done:** copy review, accessibility audit, Safari/Firefox. Original list: demo path on `/` (call to action to compare the trio), mobile
width, copy review, screenshots. Deploy only when the user says go.

## 6. Reference material and rules

- Prototype (read-only, never push): `5764678/lunaris`, branch
  `snapshot/pre-education-pivot-2026-11-11`, code identical to commit `8edfb32`. In a cloud
  session: `add_repo` (read), then `git clone --depth 50 --branch snapshot/pre-education-pivot-2026-11-11
  https://github.com/5764678/lunaris /home/user/lunaris` and verify
  `git diff 8edfb32 -- packages apps tests` is empty. Best requirement sources there:
  `docs/DECISIONS.md` (D1–D9), `docs/SCIENCE.md`, `docs/API.md`, `docs/round2/HANDOFF.md`.
- No auth. No educational features. Frozen science/data. Anything beyond that: ask the user.
- Branching: develop on the branch your session names; push there. The user has said to
  **merge any open and future pull requests** in this repo (PR 1 was merged by session B). Do
  not open a PR unless the user asks. Never write to `5764678/lunaris`.
- **User's priority order (received 14 Nov, verbatim intent):** Phase 1 = one end-to-end path
  (site → SPICE-lit Moon → timeline with evidence), simple everywhere, commit and tell the
  user. Phase 2, in this order: **Illumination page → Terrain page → Compare page → quality
  work (contracts, caching, tests, docs) → polish for the submission.** The user may reorder.
  Skipped in Phase 1 and still optional: golden-master capture, import-linter/ESLint
  boundaries, perf budgets, binary payloads, CI gates, process pools, ETags.
  Phase 1 and the three pages are done; **the next item is the quality work, then polish.**
- **Decisions from the user (14 Nov):** no login, no auth; it is an informational site with
  no user-mutable data, so **site registration/deletion is dropped** (the registry stays
  read-only; the "publicly writable" worry no longer applies). Hosting will be a **new Render
  service**; do not deploy it for them without asking. Postgres stays (stack decision).
- Commit trailers requested by the harness: `Co-Authored-By: …` and `Claude-Session: …`
  lines as given in the session's system reminder.

## 7. Session log

| Session | Did |
| --- | --- |
| Session A (Fable 5.2, `claude/admiring-hamilton-sp4gwl`, PR 1, merged) | Phase 1 end-to-end path; Illumination page; Terrain page + terrain API |
| Session B (Sonnet 5.5, `claude/gifted-allen-smvncn`) | Verified Phase 1/2 state; Compare API + page (ported summary logic) with tests; Data API + page; `next build` verified; CLAUDE.md + this file; Docker/Render deploy prep (image built and run locally, prewarm script, runtime API proxy, memory finding + cache fix); Render deploy via connector (live); OOM incident diagnosed and fixed; landing/phone polish; blueprint rename tested and refused (see DEPLOY.md) |
