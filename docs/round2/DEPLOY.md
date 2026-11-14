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

## Memory: measured, and why the plan matters

Measured in the built image (Docker, one API worker):

| State | Container memory |
| --- | --- |
| Idle after start | 183 MiB |
| After one 10-site compare, **before** the cache fix | 481 MiB |
| After 20 distinct sites, **before** the cache fix | 527 MiB |

Cause: the timeline LRU held up to 64 full-year results at ≈ 30 MiB each (Python float
lists). Fix (in this repo): the LRU is capped at 8, and Compare caches only small per-site
rows (`CompareService._rows`, 256 max, a few kB each) and calls the timeline with
`cache=False`. The post-fix figure is recorded in the table in §"After the fix" below.

### After the fix (measured on the rebuilt image)

| State | Container memory |
| --- | --- |
| Idle after start | 209 MiB |
| After one 10-site compare | 337 MiB |
| After compares covering all 27 sites | 342 MiB (plateau) |
| Then 10 distinct single-site year timelines (fills the 8-entry LRU) | 437 MiB |

So the bounded worst case I could produce is ≈ 440–450 MiB, well under the ≈ 2 GB the old
64-entry cache could reach, but **not far under 512 MiB**. These are container totals
(API ≈ 80 % of it, Next.js ≈ 90 MiB), measured with one visitor on an otherwise idle
machine. Concurrent visitors add transient memory (Compare runs 4 sites in parallel, each
briefly holding a ≈ 30 MiB timeline). **Check Render's current plan table; a plan with 512 MiB
is risky, pick one with comfortable headroom (≥ 1 GiB).** If memory is still a problem, lower
`_CACHE_SIZE` in `services/analysis.py` or `MAX_WORKERS` in `services/compare.py`.

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
