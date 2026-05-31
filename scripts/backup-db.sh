#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required." >&2
  echo "Set DATABASE_URL in the current shell before running this script." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump was not found in PATH." >&2
  echo "Install PostgreSQL client tools before running this script." >&2
  exit 1
fi

if ! command -v gzip >/dev/null 2>&1; then
  echo "ERROR: gzip was not found in PATH." >&2
  exit 1
fi

backup_dir="backups"
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_file="${backup_dir}/connect-shop-${timestamp}.sql.gz"

mkdir -p "$backup_dir"

pg_dump "$DATABASE_URL" | gzip > "$backup_file"

echo "Database backup created: $backup_file"
