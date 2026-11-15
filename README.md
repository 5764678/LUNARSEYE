# LUNAREYES

Lunar south-pole site analysis. Pick one of 27 cited candidate sites and see, for a chosen
time window:

- the Moon lit from the SPICE Sun direction;
- the Sun and Earth elevation at that site, and how much of each disc is visible above the
  terrain horizon versus a flat horizon, as a timeline;
- the site's height, slope and roughness from the PGDA 20 m DEM, and the surrounding
  south-pole terrain in 3D.

Every number carries a tag (OBS / DERIVED / MODEL / CALC / ASSUMED / PLACEHOLDER / N/C)
that opens its source, method, limits and SHA-256.

> The repository is named `LUNARSEYE`; the product, packages and settings are all
> `LUNAREYES`.

## Status

Built for a hackathon, 14–15 Nov 2026. It runs locally only; there is no deployment.

| Page | Route | State |
| --- | --- | --- |
| Overview: site list, globe, headline numbers | `/` | works |
| Illumination & Earth: sky chart, terrain-vs-flat-horizon tables, visible/hidden windows | `/illumination` | works |
| Terrain: PGDA 20 m height/slope/roughness, 3D south-pole scene | `/terrain` | works |
| Compare sites, Data page | — | not built |

Not implemented: user-registered sites (the registry is read-only), authentication,
educational features, migrations, CI, and any deployment. See [Scope cuts](#scope-cuts).

## Run it

Needs Python ≥ 3.11 with [uv](https://docs.astral.sh/uv/), Node ≥ 20.9 and Postgres 16.

```bash
docker compose up -d db      # or any Postgres 16 with role/db/password "lunareyes"
uv sync
npm install
npm run data                 # ≈ 87 MB from NASA/NAIF/PDS, SHA-256 verified
npm run dev:api              # FastAPI on http://127.0.0.1:8000  (docs at /docs)
npm run dev:web              # Next.js on http://localhost:3000
```

Open <http://localhost:3000>. The browser only talks to port 3000; `/api/*` is rewritten
to the API. All settings are optional and listed in `.env.example`.

Without Docker, create the database by hand, e.g.
`psql -c "CREATE ROLE lunareyes LOGIN PASSWORD 'lunareyes'" -c "CREATE DATABASE lunareyes OWNER lunareyes"`.
The compose file has not been run in the build environment (no Docker daemon there);
Postgres 16 was run directly.

### Data

`npm run data` fetches the NAIF kernels (DE440s), LOLA `LDEM_75S_240M` and the NASA SVS
colour map, and builds the globe texture. Nothing acquired is committed. Without the
texture the globe shows a labelled procedural placeholder.

The **Terrain page uses a different source**: the PGDA 20 m south-pole DEM (2.7 GB) is
never downloaded whole. The API reads a window around the site over HTTP byte ranges from
`pgda.gsfc.nasa.gov` the first time a site is requested, then caches it under
`data/processed/`. That first request needs network access, and the PGDA server sometimes
answers valid requests with a transient 403, so retries are built in.

## Checks

```bash
uv run pytest                # 274 tests; some skip until the data above is acquired
npm run test:web             # carried display-math tests (vitest)
npm run typecheck
npm run contracts:generate   # API running: regenerates the TypeScript contract types
```

Without `npm run data`, 54 of the 274 Python tests skip (the LDEM-dependent terrain
physics ones, plus one that needs the `gdaldem` binary). Skips are reported, not hidden.

## What is here

```
packages/science   FROZEN  lunareyes_science, unchanged from the prototype at 8edfb32
packages/data      FROZEN  lunareyes_data, unchanged from 8edfb32
tests/science      copied unchanged (acceptance gate for the frozen core)
tests/api          API tests
apps/api           FastAPI service
apps/web           Next.js 16 / React 19 / React Three Fiber / TanStack Query
data/              local data store (nothing acquired is committed); fixtures/ is committed
```

### API

| Route | Returns |
| --- | --- |
| `GET /health` | liveness and data readiness |
| `GET /v1/sites`, `/v1/sites/{id}` | the 27 catalogue sites |
| `GET /v1/sites/{id}/timeline` | Sun and Earth elevation and visibility over a window |
| `GET /v1/ephemeris/sun` | SPICE Sun direction at a time |
| `GET /v1/sites/{id}/terrain` | height, slope, roughness; optional hazard flags from thresholds you supply |
| `GET /v1/terrain/scene` | south-pole heightmap (±125 km) for the 3D scene |

Errors use one JSON envelope with a request id. There is no auth.

### How it works

- **Sites**: the 27 PGDA product 78 sites, seeded into Postgres. Coordinates are DEM tile
  centres, not landing points. PGDA labels two tiles "de Gerlache rim"; registry names are
  unique, so those two carry their PGDA tile id.
- **Geometry**: local SPICE (`MOON_ME`, `CN+S`, UTC→ET through the leap-seconds kernel).
- **Terrain horizon**: 1440 azimuths, 200 km, curvature-corrected, from `LDEM_75S_240M`,
  eye 2 m above the surface (a stated assumption). Cached as files under `data/processed/`.
- **Sunlight / Earth**: visible disc fraction above the terrain horizon and, separately,
  the flat (astronomical) horizon. Runs that touch the window edge are shown as "≥".
  Earth visibility is geometric line of sight only, not a radio link.
- **Terrain metrics**: height, slope and roughness within a footprint (default radius set
  in the API, max 2 km). Slope and roughness limits are your assumptions; with none given,
  no hazard flag is returned.
- **Globe**: a smooth sphere lit from the SPICE Sun direction. It draws no terrain
  shadows and says so; sunlight numbers come only from the timeline.

## Scope cuts

Deliberate. Still true unless noted.

| Cut | Now |
| --- | --- |
| Registering/deleting user sites | Registry is read-only; table has the target columns and CHECKs. A writable registry with no auth needs a decision before any public deploy |
| Alembic migrations | `create_all` + idempotent catalogue seed at start-up |
| Compare and Data pages | Not built |
| Content-addressed cache, single-flight, process pool, ETags | In-process LRU + horizon-mask file cache; science runs in the request thread pool |
| Golden-master capture against the prototype | A few API tests pin the headline numbers |
| import-linter / ESLint boundaries, CI, budgets | None |
| Generated client and Zod | Types are generated (`@hey-api/openapi-ts`); the fetch wrapper is hand-written |
| Deploy | Local only |

Known wrinkles:

- `tests/science/illumination/test_terrain_physics.py` imports
  `lunareyes_api.services.horizon.HorizonMaskService`, so the horizon service keeps that
  module path and constructor to leave the frozen tests untouched.
- Measured locally for the timeline: a year of hourly samples for one site takes 1.2 s
  cold (the first request for a site adds about 2 s for its horizon mask) and 0.14 s from
  the in-process cache. The response is 1.2 MB, 240 kB gzipped.
