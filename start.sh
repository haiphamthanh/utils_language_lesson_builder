#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command node
require_command npm

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example."
fi

if [[ ! -d node_modules ]]; then
  echo "Installing Node.js dependencies…"
  npm ci
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "Starting PostgreSQL with Docker…"
  docker compose up -d --wait
elif command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  # Docker Desktop is optional for local development. A local PostgreSQL server
  # is enough, and this fallback deliberately leaves .env untouched.
  require_command psql
  require_command createdb
  export DATABASE_URL="${DATABASE_URL:-postgresql:///lesson_builder}"

  if ! psql -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = 'lesson_builder'" | grep -q 1; then
    echo "Creating local database lesson_builder…"
    createdb lesson_builder
  fi

  echo "Using local PostgreSQL: $DATABASE_URL"
else
  cat >&2 <<'MESSAGE'
PostgreSQL is unavailable.

Start Docker Desktop and run this script again, or start a local PostgreSQL server
on localhost:5432. You can then set DATABASE_URL before running ./start.sh.
MESSAGE
  exit 1
fi

echo "Applying database migrations and seed…"
npm run db:setup

echo
echo "Ready. Open http://localhost:${PORT:-9999}"
echo "Press Ctrl+C to stop the server."
echo

exec npm start
