# Deploying LUNARIS on Render

**Status: LIVE on Render (free plan).** Deployed 14 Nov 2026 via the Render connector with the
user's go-ahead; the user chose to move to a service named exactly `lunarseye` (option 2 below).

| | |
| --- | --- |
| **Primary URL** | **https://lunarseye.onrender.com** |
| Web service (primary) | `lunarseye`, id `srv-dbrupou1egvs73cbr050`, Docker, free, Oregon. Created directly with `create_web_service` (NOT Blueprint-managed), tracks branch `claude/gifted-allen-smvncn`, auto-deploys on push |
| Postgres | `lunaris-db-zqih`, id `dpg-dbruf23rjlhs73ckum6g-a`, free, version 16, expires 2026-12-14 (free plan: 30 days). Not Blueprint-independent: it was created by the Blueprint below |
| Old web service | `lunaris-zqih`, id `srv-dbrufgbrjlhs73cl0bv0`, https://lunaris-zqih.onrender.com , **to be deleted by the user in the dashboard** (the connector has no delete tool) once `lunarseye` is confirmed |
| Blueprint | `exs-dbruel2fngtc73b6u7jg` (manages the OLD service and the database), **auto-sync OFF** |
| Workspace | "Matthew's workspace" `tea-dbnavfgu01pc73c87osg` |

**Database wiring on `lunarseye`:** the connector cannot read the database password, so
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
