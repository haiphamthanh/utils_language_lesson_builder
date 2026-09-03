#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$APP_DIR/.server.pid"
PORT_FILE="$APP_DIR/.server.port"
LOG_FILE="$APP_DIR/.server.log"

load_local_environment() {
  if [[ -f "$APP_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$APP_DIR/.env"
    set +a
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

server_is_ready() {
  HEALTH_HOST="$HOST" HEALTH_PORT="$PORT" node - <<'NODE' >/dev/null 2>&1
const http = require("node:http");
const request = http.get({
  host: process.env.HEALTH_HOST,
  port: Number(process.env.HEALTH_PORT),
  path: "/api/health",
  timeout: 1500,
}, (response) => process.exit(response.statusCode === 200 ? 0 : 1));
request.on("timeout", () => request.destroy());
request.on("error", () => process.exit(1));
NODE
}

validate_pid_file() {
  [[ -f "$PID_FILE" ]] || return 0
  local existing_pid
  existing_pid="$(<"$PID_FILE")"
  if [[ "$existing_pid" =~ ^[0-9]+$ ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
    if server_is_ready; then
      echo "[start] Local server is already running and ready (PID $existing_pid)."
      exit 0
    fi
    echo "[start] PID $existing_pid is alive but does not expose the current readiness endpoint."
    echo "[start] Run ./stop.sh, inspect .server.log, then retry ./start.sh."
    exit 1
  fi
  rm -f "$PID_FILE" "$PORT_FILE"
}

ensure_port_is_free() {
  command -v lsof >/dev/null 2>&1 || return 0
  local listener_pid
  listener_pid="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [[ -n "$listener_pid" ]]; then
    echo "[start] Port $PORT is already used by PID $listener_pid."
    exit 1
  fi
}

cd "$APP_DIR"
load_local_environment
export NODE_ENV="${NODE_ENV:-development}"
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-9999}"

require_command node
require_command npm

if [[ ! -d "$APP_DIR/node_modules" ]]; then
  echo "[start] Installing Node.js dependencies…"
  npm ci
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  load_local_environment
  echo "[start] Created .env from .env.example."
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[start] Starting PostgreSQL with Docker…"
    docker compose up -d --wait
  else
    echo "[start] DATABASE_URL is required. Configure PostgreSQL and set DATABASE_URL in .env."
    exit 1
  fi
fi

validate_pid_file
ensure_port_is_free

echo "[start] Applying database migrations and seed…"
npm run db:setup
echo "[start] Ensuring the first demo lesson is generated…"
if ! npm run app:bootstrap; then
  echo "[start] Warning: demo lesson generation was skipped (already generated or generator unavailable)."
  echo "[start] The server will still start; create a journey from the UI to retry generation."
fi

nohup node "$APP_DIR/src/server.js" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" >"$PID_FILE"
echo "$PORT" >"$PORT_FILE"

for _ in {1..40}; do
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    break
  fi
  if server_is_ready; then
    echo "[start] Local server started (PID $SERVER_PID)."
    echo "[start] URL: http://$HOST:$PORT"
    echo "[start] Log: $LOG_FILE"
    exit 0
  fi
  sleep 0.5
done

echo "[start] Server failed to become ready. Recent log:"
tail -n 40 "$LOG_FILE" 2>/dev/null || true
kill "$SERVER_PID" >/dev/null 2>&1 || true
rm -f "$PID_FILE" "$PORT_FILE"
exit 1
