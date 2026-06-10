#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_BACKUP_DIR="${PROJECT_ROOT}/backups/database"

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-${DEFAULT_BACKUP_DIR}}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL is required in the environment."
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump was not found in PATH. Install PostgreSQL client tools."
command -v gzip >/dev/null 2>&1 || fail "gzip was not found in PATH."
[[ "${BACKUP_RETENTION_DAYS}" =~ ^[0-9]+$ ]] || fail "BACKUP_RETENTION_DAYS must be a non-negative integer."

if [[ "${BACKUP_DIR}" != /* ]]; then
  BACKUP_DIR="${PROJECT_ROOT}/${BACKUP_DIR}"
fi

umask 077
mkdir -p "${BACKUP_DIR}"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_file="${BACKUP_DIR}/connect-shop-postgres-${timestamp}.sql.gz"
partial_file="${backup_file}.partial"

log "Starting PostgreSQL backup."
log "Writing compressed backup to: ${backup_file}"

pg_dump --format=plain --no-owner --no-privileges "${DATABASE_URL}" | gzip -c > "${partial_file}"
mv "${partial_file}" "${backup_file}"

log "Backup created successfully."

if [[ "${BACKUP_RETENTION_DAYS}" -gt 0 ]]; then
  log "Removing backups older than ${BACKUP_RETENTION_DAYS} days from ${BACKUP_DIR}."
  find "${BACKUP_DIR}" -type f -name 'connect-shop-postgres-*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete
else
  log "Backup retention cleanup disabled because BACKUP_RETENTION_DAYS=0."
fi

log "Backup completed."
