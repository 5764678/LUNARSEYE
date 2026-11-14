# Deploying LUNARIS on Render

**Status: LIVE on Render (free plan), deployed 14 Nov 2026 via the Render connector with the
user's go-ahead.**

| | |
| --- | --- |
| URL | https://lunaris-zqih.onrender.com |
| Web service | `lunaris-zqih`, id `srv-dbrufgbrjlhs73cl0bv0`, Docker, free plan, Oregon |
| Postgres | `lunaris-db-zqih`, free plan, version 16 (pinned in `render.yaml`) |
| Blueprint | `exs-dbruel2fngtc73b6u7jg`, auto-sync ON, tracks branch `claude/gifted-allen-smvncn` |
| Workspace | "Matthew's workspace" `tea-dbnavfgu01pc73c87osg` |
| First build | ≈ 3 min; smoke test (`scripts/smoke.mjs`) passed against the live URL |

**Every push to `claude/gifted-allen-smvncn` triggers a rebuild and redeploy (~3 min).** If the
branch is later merged to `main`, point the service/blueprint at `main` in the dashboard.
A failed build leaves the previous deploy running. Check with `list_deploys` / the smoke test.

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

## Collaborator access (OPEN ITEM)

The user asked for **jinn.newbie.s@gmail.com** to be added as a collaborator on the Render
workspace so they can deploy. The Render connector has **no member/invite tool**, so this must
be done by the workspace owner in the dashboard: Dashboard → the workspace → **Settings** →
**Team members** → **+ Invite members** → email + role. Render's docs say adding members needs
a **Pro-or-higher workspace**; whether this one qualifies was not checked. Update this section
when it is done.

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
