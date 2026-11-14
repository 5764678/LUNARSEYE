# LUNARIS — one container: FastAPI (127.0.0.1:8000) + Next.js (0.0.0.0:$PORT, proxies /api/*).
# The scientific data (≈ 87 MB, SHA-256 verified) is acquired at build time, and the horizon
# masks and 20 m terrain windows of all 27 cited sites are pre-computed, so a fresh instance
# answers its first request from disk. Postgres is external (LUNARIS_DATABASE_URL).
#
#   docker build -t lunaris .
#
# Optional: add a CA bundle for a TLS-inspecting build network with
#   docker build --build-context extra-ca=/dir/with/ca-bundle.crt ...
# (the default context is empty and changes nothing).

FROM scratch AS extra-ca

# ── 1. Python environment + data + warm caches ──────────────────────────────────────────
FROM python:3.13-slim AS py
COPY --from=extra-ca / /extra-ca/
RUN if [ -f /extra-ca/ca-bundle.crt ]; then cat /extra-ca/ca-bundle.crt >> /etc/ssl/certs/ca-certificates.crt; fi
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    UV_PROJECT_ENVIRONMENT=/app/.venv UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy \
    LUNARIS_DATA_DIR=/app/data
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uv==0.11.32
WORKDIR /app
COPY pyproject.toml uv.lock ./
COPY packages packages
COPY apps/api apps/api
RUN uv sync --frozen --no-dev
COPY data/README.md data/README.md
COPY scripts scripts
RUN uv run --no-sync lunaris-data acquire naif-generic-kernels-lunar \
 && uv run --no-sync lunaris-data acquire lola-ldem-75s-240m \
 && uv run --no-sync lunaris-data acquire nasa-svs-cgi-moon-kit \
 && uv run --no-sync lunaris-data build-web-texture
RUN uv run --no-sync python scripts/prewarm.py

# ── 2. Web bundle ───────────────────────────────────────────────────────────────────────
FROM node:22-slim AS web
COPY --from=extra-ca / /extra-ca/
RUN if [ -f /extra-ca/ca-bundle.crt ]; then cp /extra-ca/ca-bundle.crt /extra-ca.crt; fi
ENV NODE_EXTRA_CA_CERTS=/extra-ca.crt
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace @lunaris/web --include-workspace-root
COPY apps/web apps/web
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @lunaris/web

# ── 3. Runtime ──────────────────────────────────────────────────────────────────────────
FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
 && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 app
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=py --chown=app:app /app /app
COPY --from=web /app/apps/web/.next/standalone /app/web
COPY --from=web /app/apps/web/.next/static /app/web/apps/web/.next/static
COPY --from=py /app/apps/web/public /app/web/apps/web/public
COPY deploy/start.sh /app/start.sh
ENV PATH=/app/.venv/bin:$PATH LUNARIS_DATA_DIR=/app/data PORT=10000 \
    NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
USER app
EXPOSE 10000
CMD ["/app/start.sh"]
