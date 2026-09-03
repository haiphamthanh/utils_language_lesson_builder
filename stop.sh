#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$APP_DIR/.server.pid"
PORT_FILE="$APP_DIR/.server.port"
LOG_FILE="$APP_DIR/.server.log"
DEFAULT_PORT="9999"
EXPECTED_ENTRY="src/server.js"

if [[ ! -f "$PID_FILE" ]]; then
  echo "[stop] Local server has no PID file; it may already be stopped."
  exit 0
fi

SERVER_PID="$(<"$PID_FILE")"
SERVER_PORT="$DEFAULT_PORT"
[[ -f "$PORT_FILE" ]] && SERVER_PORT="$(<"$PORT_FILE")"

if [[ ! "$SERVER_PID" =~ ^[0-9]+$ ]]; then
  echo "[stop] Invalid PID file: $PID_FILE"
  rm -f "$PID_FILE" "$PORT_FILE"
  exit 1
fi

if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  PROCESS_COMMAND="$(ps -p "$SERVER_PID" -o command= 2>/dev/null || true)"
  if [[ "$PROCESS_COMMAND" != *"$EXPECTED_ENTRY"* ]]; then
    echo "[stop] Refusing to stop PID $SERVER_PID because it is not running $EXPECTED_ENTRY."
    echo "[stop] Verify the process, then remove the stale PID/port files manually if safe."
    exit 1
  fi
  kill -TERM "$SERVER_PID"
  for _ in {1..40}; do
    kill -0 "$SERVER_PID" >/dev/null 2>&1 || break
    sleep 0.25
  done
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill -KILL "$SERVER_PID"
    echo "[stop] PID $SERVER_PID exceeded the graceful timeout and was killed."
  else
    echo "[stop] Local server stopped (PID $SERVER_PID)."
  fi
else
  echo "[stop] PID $SERVER_PID is no longer running."
fi

if command -v lsof >/dev/null 2>&1; then
  LISTENER_PID="$(lsof -tiTCP:"$SERVER_PORT" -sTCP:LISTEN || true)"
  [[ -z "$LISTENER_PID" ]] || echo "[stop] Warning: port $SERVER_PORT is still used by PID $LISTENER_PID."
fi

rm -f "$PID_FILE" "$PORT_FILE"
