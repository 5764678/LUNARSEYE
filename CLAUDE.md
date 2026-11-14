# LUNARIS Round 2 — instructions for any Claude Code session in this repo

Hackathon submission (14–15 Nov 2026). **Working beats well-architected.** Show the idea of
LUNARIS (cited south-pole site → SPICE-lit Moon → terrain-aware sunlight/Earth timeline →
compare sites with evidence on every number). Improve only after something works.

**Start here:** read `docs/round2/STATUS.md` (what is built, what is next, how to run, how to
verify). Update it before you stop; the next session has no other context.

## Hard rules (from the user / original handoff)
- `packages/science`, `packages/data`, `tests/science` are FROZEN (copied from the prototype
  at commit `8edfb32`). Never edit them; their tests are the acceptance gate.
- No auth. No educational features. Anything beyond the handoff (new features, stack
  changes): ask the user.
- `5764678/lunaris` (the old prototype) is **read-only** reference: branch
  `snapshot/pre-education-pivot-2026-11-11`, code identical to `8edfb32`. Never push to it.
  Clone it read-only outside this repo (e.g. `/home/user/lunaris`) when you need to port logic.
- Evidence (OBS/DERIVED/MODEL/CALC/ASSUMED/PLACEHOLDER/N/C) on every number; thresholds and
  profile weights are labelled assumptions; never hidden weights.
- Develop on the branch the session is told to use; push there. The user has said: **merge
  any open and future pull requests** in `5764678/LUNARSEYE` (they authorised merging; do not
  open a PR unless the user asks).
- Say plainly what you cut and what you did not verify. Do not claim unrun things were run.

## Commands
```bash
service postgresql start          # Postgres 16 in the cloud container; role/db/pw "lunaris"
uv sync && npm install && npm run data     # once; data ≈ 87 MB, SHA-256 verified
uv run pytest                      # frozen science tests + API tests
npm run test:web && npm run typecheck
npm run dev:api   # :8000      npm run dev:web   # :3000  (/api/* proxied to the API)
npm run contracts:generate         # API running; regenerates apps/web/src/shared/api/generated
```
See `docs/round2/STATUS.md` for environment gotchas.
