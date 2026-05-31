#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required." >&2
  echo "Set DATABASE_URL in the current shell before running this script." >&2
  exit 1
fi

backup_file="${1:-}"

if [[ -z "$backup_file" ]]; then
  echo "Usage: ./scripts/restore-db.sh path/to/backup.sql[.gz]" >&2
  exit 1
fi

if [[ ! -f "$backup_file" ]]; then
  echo "ERROR: backup file not found: $backup_file" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql was not found in PATH." >&2
  echo "Install PostgreSQL client tools before running this script." >&2
  exit 1
fi

echo "WARNING: This will restore into the database pointed to by DATABASE_URL."
echo "This can overwrite, duplicate, or conflict with existing data."
echo "Test on staging first and get approval before restoring production."
printf 'Type RESTORE to continue: '
read -r confirmation

if [[ "$confirmation" != "RESTORE" ]]; then
  echo "Restore cancelled."
  exit 1
fi

case "$backup_file" in
  *.sql.gz)
    if ! command -v gunzip >/dev/null 2>&1; then
      echo "ERROR: gunzip was not found in PATH." >&2
      exit 1
    fi
    gunzip -c "$backup_file" | psql "$DATABASE_URL"
    ;;
  *.sql)
    psql "$DATABASE_URL" < "$backup_file"
    ;;
  *)
    echo "ERROR: unsupported backup file type. Use .sql or .sql.gz." >&2
    exit 1
    ;;
esac

echo "Database restore completed from: $backup_file"
