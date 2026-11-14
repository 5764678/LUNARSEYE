# Deploying LUNARIS on Render

**Status: LIVE on Render (free plan).** Deployed 14 Nov 2026 via the Render connector with the
user's go-ahead; the user chose to move to a service named exactly `lunarseye` (option 2 below).

| | |
| --- | --- |
| **Primary URL** | **https://lunarseye.onrender.com** |
| Web service (primary) | `lunarseye`, id `srv-dbrupou1egvs73cbr050`, Docker, free, Oregon. Created directly with `create_web_service` (NOT Blueprint-managed), tracks branch `claude/gifted-allen-smvncn`, auto-deploys on push |
| **Postgres (current)** | **Neon**, project `lunarseye` id `crimson-union-44796269`, Postgres 16, `aws-us-west-2`, database `neondb`, role `neondb_owner`, default branch. Direct (non-pooled) endpoint. Migrated 14 Nov 05:51 UTC (see "Database: migrated to Neon") |
| Postgres (old, now unused) | Render `lunaris-db-zqih`, id `dpg-dbruf23rjlhs73ckum6g-a` (free, expires 2026-12-14). Nothing reads it; delete it in the dashboard whenever (the connector cannot). It is still managed by the old Blueprint |
| Old web service | `lunaris-zqih`, id `srv-dbrufgbrjlhs73cl0bv0`: **suspended by the user** (14 Nov). Delete it in the dashboard when convenient (the connector has no delete tool). Its first deploys also crash-looped on a missing DB variable, which is the "failed deploy" the user saw on `lunarseye` |
| Blueprint | `exs-dbruel2fngtc73b6u7jg` (manages the OLD service and the database), **auto-sync OFF** |
| Workspace | "Matthew's workspace" `tea-dbnavfgu01pc73c87osg` |

**Database wiring on `lunarseye`:** first done by the user via the dashboard (14 Nov 05:12 UTC), then repointed to Neon by the session (below). Background on why:  the connector cannot read the database password, so
`LUNARIS_DATABASE_URL` on `lunarseye` has to be added by the user in the dashboard
(Environment → Add Environment Variable → "Add from Database" → `lunaris-db-zqih` → Internal
Database URL). Without it the API cannot start. Whoever reads this: check `get_service` /
`/api/health` before assuming it is done, and record here when it was.

**`lunarseye` has no health-check path** (the connector's `create_web_service` cannot set one;
the Blueprint set `/api/health` on the old service). Render falls back to a port check. Set
Health Check Path to `/api/health` in the dashboard (Settings) if zero-downtime deploys matter.

**Every push to `claude/gifted-allen-smvncn` triggers a rebuild and redeploy (~1–3 min) of each
auto-deploying service.** A failed build leaves the previous deploy running.

The user said hosting will be a new Render service. The registry is read-only and nothing is written by
visitors, so the original "publicly writable registry" concern does not apply (confirmed with
the user, 14 Nov). Still: do not click-deploy on someone's behalf without asking.

## Shape

One Docker web service (`Dockerfile`) + one managed Postgres, declared in `render.yaml`:

```
visitor ─▶ :$PORT  Next.js (standalone)  ──/api/*──▶ 127.0.0.1:8000  FastAPI ─▶ Postgres
                    (route handler proxies at request time; LUNARIS_API_URL overrides)
```

Why one container: the web app proxies `/api/*` to the API; on one host that is
`127.0.0.1`, with no private-network setup or second service to cold-start. `deploy/start.sh`
runs both and exits if either dies, so Render restarts the instance.

The image build (≈ 3–10 min depending on network) does the slow work once:
1. `uv sync --frozen --no-dev`
2. `lunaris-data acquire` × 3 + `build-web-texture` (≈ 87 MB, SHA-256 verified)
3. `scripts/prewarm.py`: horizon masks and PGDA 20 m terrain windows for all 27 cited
   sites (measured: 27/27 + 27/27 in 41 s). A site that fails is skipped, never fails the build;
   it is computed lazily at request time instead.
4. `next build` with `output: "standalone"`.

## Database: migrated to Neon (14 Nov 2026)

The user added Neon and asked for the migration. What was done and verified:
- The old Render database held one table, `sites`, 27 rows, **all `origin='catalog'`**, seeded
  by the app at start-up (deterministic ids). No user data exists (the registry is read-only by
  decision), so nothing was copied: the app re-seeds on first start.
- Neon project created via the Neon connector in the user's free organisation, region matched
  to Render (Oregon), Postgres 16. The app's own `CREATE TABLE` (generated from `db.Site`) was
  run once on Neon beforehand to prove the schema and CHECK constraints work there.
- `LUNARIS_DATABASE_URL` on `lunarseye` was set with the **direct** endpoint
  (`sslmode=require&channel_binding=require&connect_timeout=15`), not the `-pooler` one: one
  process and a tiny pool gain nothing from pooling, and the pooler (PgBouncer, transaction
  mode) is a known source of prepared-statement problems with psycopg 3.
- Verified: deploy `live`, `/api/health` database `ok`, **same 27 rows and identical fingerprint
  (md5 of id+name+lat+lon) on Neon and on the old Render DB**, no `server_failed` events,
  `scripts/smoke.mjs` all checks passed.
- Not testable from the Claude sandbox: it has no raw TCP route to Postgres (HTTPS proxy only),
  so the app was never run against Neon locally. The only end-to-end test is the live service.
- Neon's free compute scales to zero when idle, so the first request after a quiet period can
  take about a second longer (`pool_pre_ping` reconnects). Neon's free plan does not have
  Render's 30-day database expiry as far as known; confirm in Neon's current terms.
- **Secret handling:** the Neon password passed through the Claude session once (the connector
  returns it) and is now only in Render's environment for `lunarseye`. Do not paste it into docs,
  commits or issues. To rotate: reset the role password in Neon, then update the Render variable.
- Rollback: in Render → `lunarseye` → Environment, replace `LUNARIS_DATABASE_URL` with the
  old database via "Add from Database" (`lunaris-db-zqih`) while it still exists.
- `render.yaml` still declares the Render database (it documents a from-scratch Blueprint
  deploy and the old Blueprint still manages it); it is **not** what `lunarseye` uses now.

## Collaborator access: not possible from here; decided to skip

The user asked for **jinn.newbie.s@gmail.com** to be added to the Render workspace. The Render
connector has no member/invite tool, and Render's docs say adding members needs a Pro-or-higher
workspace (not checked for this one). **Decision (user, 14 Nov): skip it; the session
working with the user deploys other people's work instead.** If that changes: Dashboard →
workspace → Settings → Team members → + Invite members.

## How to deploy someone else's new work

The service **auto-deploys every push to the branch it tracks** (`claude/gifted-allen-smvncn`);
a build takes ≈ 1–3 min and a failed build leaves the previous deploy running.
- Work pushed to the tracked branch (or merged into it): nothing to do. Verify, see below.
- Work on another branch: it is NOT deployed until it is on the tracked branch (merge it there).
  `lunarseye` is not Blueprint-managed, so the connector cannot change its branch; changing it
  is a dashboard action (Settings → Branch) for the user. `trigger_deploy` only redeploys the
  tracked branch. (The Blueprint's `update_blueprint(branch=…)` would only move the OLD service.)
- Verify every deploy: `list_deploys` shows `live`; `list_events` with `eventTypes:
  ["server_failed"]` shows no `oomKilled`; then run
  `BASE_URL=https://lunarseye.onrender.com NODE_PATH=$(npm root -g) node scripts/smoke.mjs`.
  Do not run heavy load against the free instance (that is how it was OOM-killed once).

## Naming: why `lunarseye` is a separately created service

Blueprint-created resources get a random suffix (`lunaris-zqih`). Tested with `plan_blueprint`
(nothing applied): renaming in `render.yaml` does not rename; it plans a second free Postgres
(the free plan allows one) and a new `lunarseye-zqih`. A second Blueprint for the same
repo/branch/file is refused (409). So the user chose option 2: create `lunarseye` directly with
`create_web_service` (exact name → `lunarseye.onrender.com`), reuse the database, delete the old
service. The Blueprint's auto-sync is OFF so a `render.yaml` edit cannot apply unreviewed.
`render.yaml` is now documentation for a from-scratch Blueprint deploy; it still names the old
resources (`lunaris`, `lunaris-db`).

## Steps if redeploying from scratch (for a human, in the Render dashboard)

1. Push this repo's default branch to GitHub (done by merging PRs).
2. Render → **New → Blueprint** → select `5764678/LUNARSEYE` → it reads `render.yaml`.
3. **Pick the instance plan by memory, not by price** (see below), then apply.
4. After deploy: open `https://<service>.onrender.com/api/health` (expect `"status":"ok"`
   with `database`, `spice_kernels`, `horizon_dem` all `ok`), then `/compare`.

## Memory: the free plan was OOM-killed once; what we found and did

**Incident (14 Nov, 04:55 UTC):** the live service returned 502 for ≈ 27 s. Render's event log:
`server_failed … oomKilled … memoryLimit 512Mi`, then `server_available`. Memory had reached
461 MiB while a smoke test and screenshots were hitting the site. Reproduced locally with
`docker run --memory=512m --memory-swap=512m` and the same load (`oomkilled=true`).

**Diagnosis (tracemalloc on one full-year hourly timeline):**

| | Measured |
| --- | --- |
| Finished timeline, alive in memory | 4.5 MiB (not ~30 MiB: an earlier estimate here was wrong) |
| Peak while computing it (numpy temporaries inside the frozen science core) | **97 MiB** |
| Validate + serialise to JSON (1.16 MiB) | +10 MiB peak |
| Process baseline (kernels + DEM loaded) | ≈ 150 MiB API + ≈ 90 MiB Next.js |

Compare ran 4 timeline computations in parallel (4 × 97 ≈ 390 MiB transient) on top of ≈ 210 MiB
baseline, so a 10-site compare plus normal page loads exceeded 512 MiB.

**Fix (in the repo):**
1. `AnalysisService._heavy`: at most **1** timeline computation at a time, process-wide
   (`_MAX_CONCURRENT_TIMELINES` in `services/analysis.py`). Peak ≈ baseline + 100 MiB.
2. `MALLOC_ARENA_MAX=2`, `MALLOC_MMAP_THRESHOLD_=262144`, `MALLOC_TRIM_THRESHOLD_=262144` in the
   `Dockerfile`, so glibc returns freed numpy buffers instead of keeping the high-water mark.
3. Compare caches small per-site rows (256 max) and does not retain timelines; timeline LRU = 8.

**Result under the same 512 MiB limit:** two concurrent cold 10-site compares + the full smoke
test → **peak 377 MiB, no OOM kill**; memory back to ≈ 200 MiB afterwards.
Cost: computations queue. Single visitor, cold, prewarmed image: demo trio 4.1 s, 10 sites
9–13 s, repeats ≈ 35 ms (was 3.0 s / 6.8–9.8 s with 4 in parallel). The free plan's CPU is far
smaller than this sandbox's, so expect slower cold numbers on Render (not measured there).

### Second finding: the free plan's CPU (0.1) is the other bottleneck. Fixed by baking.

After the memory fix, a load test on the live `lunarseye` service showed **no OOM** (peak
251 MiB of 512, no `server_failed` events) but a **502** on one request. Measured on the free
instance: a cold site costs ≈ 11 s (7 cold sites: 78 s; 10 sites: 175 s), 10× slower than
the dev sandbox, and requests queue behind each other (one computation at a time). Cached
trio: 0.7 s. Fix: **`scripts/prewarm.py` now also bakes the timelines the web app asks for by
default** (year 2027, 90 days, 30 days; hourly) for all 27 sites into
`data/processed/timelines/` at image build (44 MB, 63 s locally), and
`AnalysisService.site_timeline` serves them from disk. The key covers coordinates, window, step,
observer height, the pinned DEM checksum and the scientific component versions, so stale files
cannot be served. Runtime requests never write there (no disk filling by odd windows). Measured
locally, cold process: 10-site compare **0.16 s** (was 9–13 s), single timeline 31 ms.
Custom windows/steps outside the baked set still compute (and on Render's free CPU take ~11 s
per site). Tests: `tests/api/test_timeline_disk_cache.py`. If the web windows in
`apps/web/src/features/time/windows.ts` change, change `windows` in `scripts/prewarm.py` too.

**Verified live on `lunarseye` (14 Nov 05:28 UTC, after the baked-timeline deploy):** cold
10-site compares 2.2 s / 2.1 s, 7 sites 1.5 s, single-site year timeline 1.6 s (was 78–175 s);
`scripts/smoke.mjs` all checks passed; Render events showed no `server_failed`/restart and
memory stayed ≈ 206 MiB of 512. The first 502 (and the two OOM kills before the memory fix)
are explained above; if a 502 recurs, run `list_events` (`server_failed`) and
`get_metrics` (memory, CPU) before guessing.

**Still true:** the free plan has no headroom for a burst of many simultaneous visitors; if the
event log shows another `oomKilled`, move up a plan (check Render's plan table first) or lower
`_CACHE_SIZE`. To check: `list_events` with `eventTypes: ["server_failed"]`.

## Other facts worth knowing

- **Latency (measured locally, prewarmed image, 4 worker threads):** container start to
  healthy 2.9 s; first trio compare 3.0 s; a cold 10-site compare 6.8–9.8 s (two runs);
  repeats ≈ 20 ms.
- **Free tier:** a free web service sleeps when idle, so the first visit after a pause waits
  for Render to wake the instance (not measured) plus the 3 s boot above. Free Postgres
  expires after 30 days. Fine for a hackathon judging window, not beyond it.
- **Outbound network at runtime:** the Terrain page reads PGDA over HTTP byte ranges for any
  site not already prewarmed. All 27 catalogue sites are prewarmed, so normal use needs none.
- **Image size:** 1.13 GB (mostly the Python scientific stack + data). Acceptable for Render.
- **Local full stack:** `docker compose --profile app up --build` → http://localhost:10000.
- **Env:** `LUNARIS_DATABASE_URL` (Render's `postgres://`/`postgresql://` URLs are converted to
  the psycopg driver automatically), `LUNARIS_DATA_DIR` (default `/app/data`), `PORT`.
- **Not tested here:** Render itself (no Render access from the build container), the
  blueprint's schema against Render's validator, the free-plan behaviour.
- **Sandbox-only build flags** (`--network=host`, `--build-arg HTTPS_PROXY`, `--build-context
  extra-ca=…`) are needed only behind a TLS-inspecting proxy such as the Claude cloud sandbox;
  Render's build needs none of them.
- **Docker in the Claude cloud container:** the client is installed but the daemon is **not**
  started at session boot (`/var/run/docker.sock` absent). Start it with
  `nohup dockerd > /tmp/dockerd.log 2>&1 &`; it then works (overlayfs, builds, pulls). If
  someone expects it running by default, the session's environment setup script should start it.
