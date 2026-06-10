#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

DATABASE_URL="${DATABASE_URL:-}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"
backup_file="${1:-}"

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL is required in the environment."
[[ -n "${backup_file}" ]] || fail "Usage: scripts/restore_db.sh path/to/backup.sql.gz"
[[ -f "${backup_file}" ]] || fail "Backup file not found: ${backup_file}"

case "${backup_file}" in
  *.sql.gz)
    command -v gunzip >/dev/null 2>&1 || fail "gunzip was not found in PATH."
    command -v psql >/dev/null 2>&1 || fail "psql was not found in PATH. Install PostgreSQL client tools."
    restore_command="gunzip -c backup | psql"
    ;;
  *.sql)
    command -v psql >/dev/null 2>&1 || fail "psql was not found in PATH. Install PostgreSQL client tools."
    restore_command="psql"
    ;;
  *.dump|*.backup)
    command -v pg_restore >/dev/null 2>&1 || fail "pg_restore was not found in PATH. Install PostgreSQL client tools."
    restore_command="pg_restore"
    ;;
  *)
    fail "Unsupported backup file type. Use .sql.gz, .sql, .dump, or .backup."
    ;;
esac

cat >&2 <<'WARNING'
WARNING: Database restore is a destructive operation.

This will restore into the database pointed to by DATABASE_URL.
Depending on the backup contents and target database state, this can overwrite,
duplicate, conflict with, or remove existing data.

Restore to a staging database first and verify the result before production.
WARNING

if [[ "${FORCE_RESTORE}" != "true" ]]; then
  printf 'Type RESTORE to continue: ' >&2
  read -r confirmation
  if [[ "${confirmation}" != "RESTORE" ]]; then
    fail "Restore cancelled."
  fi
fi

log "Starting restore from: ${backup_file}"
log "Restore method: ${restore_command}"

case "${backup_file}" in
  *.sql.gz)
    gunzip -c "${backup_file}" | psql "${DATABASE_URL}"
    ;;
  *.sql)
    psql "${DATABASE_URL}" < "${backup_file}"
    ;;
  *.dump|*.backup)
    pg_restore --clean --if-exists --no-owner --no-privileges --dbname="${DATABASE_URL}" "${backup_file}"
    ;;
esac

log "Restore completed."
