#!/bin/bash
# Runs the API and the web server in one container. If either exits, the container exits
# (non-zero) so the platform restarts it.
set -u
cd /app
uvicorn lunaris_api.main:app --host 127.0.0.1 --port 8000 --no-access-log &
api=$!
HOSTNAME=0.0.0.0 PORT="${PORT:-10000}" LUNARIS_API_URL="http://127.0.0.1:8000" \
  node web/apps/web/server.js &
web=$!
trap 'kill "$api" "$web" 2>/dev/null; exit 143' TERM INT
wait -n "$api" "$web"
code=$?
echo "a process exited (status $code); stopping the container" >&2
kill "$api" "$web" 2>/dev/null
exit "${code:-1}"
