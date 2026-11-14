# LUNARIS — Round 2

Lunar south-pole site analysis. Pick a cited candidate site, see the Moon lit from the
SPICE Sun direction, and see that site's Sun and Earth elevation, terrain-aware sunlight
and Earth line of sight on a timeline. Every number carries a tag (OBS / DERIVED / MODEL /
CALC / ASSUMED / PLACEHOLDER / N/C) that opens its source, method, limits and SHA-256.

**Status (14 Nov 2026): five pages work end to end** — Overview, Illumination & Earth,
Terrain, Compare and Data. Hackathon submission for 14–15 Nov. **Handoff for the next
session: [`docs/round2/STATUS.md`](docs/round2/STATUS.md)** (what is built, what is not,
how to run it, what to do next).

## Run it

Needs Python ≥ 3.11 with [uv](https://docs.astral.sh/uv/), Node ≥ 20 and Postgres 16.

```bash
docker compose up -d db      # or any Postgres 16 with role/db/password "lunaris"
uv sync
npm install
npm run data                 # ≈ 87 MB from NASA/NAIF/PDS, SHA-256 verified
npm run dev:api              # FastAPI on http://127.0.0.1:8000  (docs at /docs)
npm run dev:web              # Next.js on http://localhost:3000
```

Open <http://localhost:3000>. The browser only talks to port 3000; `/api/*` is rewritten
to the API. Settings are in `.env.example` (all optional).

Without Docker: create the database by hand, e.g.
`psql -c "CREATE ROLE lunaris LOGIN PASSWORD 'lunaris'" -c "CREATE DATABASE lunaris OWNER lunaris"`.
The compose file has not been run in the build environment (no Docker daemon there);
Postgres 16 was run directly.

`npm run data` acquires the NAIF kernels (DE440s), LOLA `LDEM_75S_240M` and the NASA SVS
colour map, and builds the globe texture. Nothing acquired is committed. Without the
texture the globe shows a labelled procedural placeholder.

## Docker / Render

`docker compose --profile app up --build` runs the whole stack in containers at
<http://localhost:10000>; `render.yaml` + `Dockerfile` are the Render blueprint. Details,
measured memory and latency: [`docs/round2/DEPLOY.md`](docs/round2/DEPLOY.md). Not deployed yet.
`BASE_URL=<site> NODE_PATH=$(npm root -g) node scripts/smoke.mjs` checks any running instance.

## Checks

```bash
uv run pytest                # 299 pass, 1 skipped: frozen science tests + API tests
npm run test:web             # 44 pass: carried display math, mission answers in the URL
npm run typecheck
npm run contracts:generate   # API running: regenerates the TypeScript contract types
```

## What is here

```
packages/science   FROZEN  lunaris_science, unchanged from the prototype at 8edfb32
packages/data      FROZEN  lunaris_data, unchanged from 8edfb32
tests/science      copied unchanged (acceptance gate for the frozen core)
apps/api           FastAPI: /health, /v1/sites, …/timeline, …/terrain, /v1/terrain/scene,
                   /v1/compare, /v1/datasets, /v1/ephemeris/sun
apps/web           Next.js 16 / React 19 / R3F / TanStack Query: /, /illumination, /terrain,
                   /compare, /data
```

- **Sites**: the 27 PGDA product 78 sites, seeded into Postgres. Coordinates are DEM tile
  centres, not landing points. PGDA labels two tiles "de Gerlache rim"; registry names are
  unique, so those two carry their PGDA tile id.
- **Geometry**: local SPICE (`MOON_ME`, `CN+S`, UTC→ET through the leap-seconds kernel).
- **Terrain horizon**: 1440 azimuths, 200 km, curvature-corrected, from `LDEM_75S_240M`,
  eye 2 m above the surface (a stated assumption). Cached as files under `data/processed/`.
- **Sunlight / Earth**: visible disc fraction above the terrain horizon and, separately,
  the flat (astronomical) horizon. Runs that touch the window edge are shown as "≥".
  Earth visibility is geometric line of sight only, not a radio link.
- **Best site for a mission** (Compare): answer what the mission needs (how much it depends
  on sunlight, on direct line of sight to Earth, on gentle ground; optional hard limits on
  slope, darkness, Earth outage and continuous sunlight). Sites that break a limit are
  excluded with the reason; the rest are scored 0–100 on fixed reference scales and the best
  fit is named with its lead over the runner-up, the reasons, what it gives up, and whether
  the pick survives a one-step change of each priority. The weights and scales are
  assumptions chosen by LUNARIS and are shown behind the ASSUMED tag.
- **Globe**: a smooth sphere lit from the SPICE Sun direction. It draws no terrain
  shadows and says so; sunlight numbers come only from the timeline.

Carried from the prototype (moved, imports adjusted, tests carried): `moon-shader.ts`,
`geo/selenographic.ts`, `globe/sun.ts`, `terrain/sun.ts`, `time/time.ts`.

## Scope cuts

Deliberate. Current list with priorities: `docs/round2/STATUS.md` §2 and §5. The table
below is the original Phase 1 list; rows marked Done were closed in Phase 2.

| Cut | Why | Now |
| --- | --- | --- |
| Registering/deleting user sites | Not needed to pick a catalogue site; a writable registry with no auth needs a decision before any public deploy | Registry is read-only; table has the target columns and CHECKs |
| Alembic migrations | Speed | `create_all` + idempotent catalogue seed at start-up |
| Terrain, Compare, Illumination and Data pages; south-pole terrain mesh | Phase 2 | **Done** (see `docs/round2/STATUS.md`) |
| Content-addressed cache, single-flight, process pool, ETags | Phase 1 brief | In-process LRU + horizon-mask file cache; science runs in the request thread pool |
| Golden-master capture against the prototype | Phase 1 brief | Four API tests pin the Phase 1 numbers |
| import-linter / ESLint boundaries, CI, budgets | Phase 1 brief | — |
| Generated client and Zod | Speed | Types are generated (`@hey-api/openapi-ts`); the fetch wrapper is hand-written |
| Deploy | Needs sign-off | Local only |

Known wrinkles:

- `tests/science/illumination/test_terrain_physics.py` imports
  `lunaris_api.services.horizon.HorizonMaskService`, so the horizon service keeps that
  module path and constructor to leave the frozen tests untouched.
- One science test is skipped where the `gdaldem` binary is not installed.
- Measured locally: a year of hourly samples for one site takes 1.2 s cold (first request
  for a site adds about 2 s for its horizon mask) and 0.14 s from the in-process cache;
  the response is 1.2 MB, 240 kB gzipped.

## Rules carried from the handoff

No auth. No educational features. The old repository (`5764678/lunaris`) is read-only
reference; nothing is ever written to it.
