# Backup and Restore

Reliable PostgreSQL backups are required before this ecommerce system is used for a real client. Orders, customers, products, admin changes, and homepage data all live in the database.

The scripts in this repository are intended for Linux server, VPS, WSL, or Git Bash environments. They are not native PowerShell backup scripts.

## Required Server Packages

Install PostgreSQL client tools and gzip on the server that runs backups:

```bash
sudo apt-get update
sudo apt-get install -y postgresql-client gzip
```

The backup script requires:

- `pg_dump`
- `gzip`

The restore script requires:

- `psql` for `.sql` and `.sql.gz` backups
- `pg_restore` for `.dump` or `.backup` files
- `gunzip` for `.sql.gz`

## Environment Variables

Required:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

Optional:

```bash
export BACKUP_DIR="/var/backups/connect-shop/postgres"
export BACKUP_RETENTION_DAYS=7
```

If `BACKUP_DIR` is not set, `scripts/backup_db.sh` writes to:

```text
<project-root>/backups/database
```

If `BACKUP_DIR` is relative, it is resolved relative to the project root, not the current working directory. This makes cron safer because cron can run from unpredictable directories.

## Manual Backup

From anywhere on the server:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/database"
export BACKUP_DIR="/var/backups/connect-shop/postgres"
export BACKUP_RETENTION_DAYS=7
bash /path/to/Connect-Shop/scripts/backup_db.sh
```

The script creates files like:

```text
connect-shop-postgres-20260610T120000Z.sql.gz
```

The script does not print the database URL or password.

## Cron Example

Run a backup every day at 2:15 AM:

```cron
15 2 * * * DATABASE_URL='postgresql://user:password@host:5432/database' BACKUP_DIR='/var/backups/connect-shop/postgres' BACKUP_RETENTION_DAYS='7' bash /path/to/Connect-Shop/scripts/backup_db.sh >> /var/log/connect-shop-db-backup.log 2>&1
```

After adding the cron entry, verify the log file and backup directory the next day.

## Restore Example

Restores are destructive. Test on staging first.

```bash
export DATABASE_URL="postgresql://user:password@staging-host:5432/staging_database"
bash /path/to/Connect-Shop/scripts/restore_db.sh /var/backups/connect-shop/postgres/connect-shop-postgres-20260610T120000Z.sql.gz
```

The restore script asks you to type `RESTORE`.

For automated disaster recovery runbooks, you can bypass the prompt only when the restore target is already verified:

```bash
FORCE_RESTORE=true bash /path/to/Connect-Shop/scripts/restore_db.sh /path/to/backup.sql.gz
```

## Test Restore on Staging

1. Create a staging database separate from production.
2. Point `DATABASE_URL` to the staging database.
3. Run `scripts/restore_db.sh` against a recent backup.
4. Start the backend against the staging DB.
5. Verify login, products, categories, cart, orders, and admin pages.
6. Never test restores directly on production first.

## Retention

`BACKUP_RETENTION_DAYS` controls local cleanup.

Example:

```bash
BACKUP_RETENTION_DAYS=7
```

This keeps recent backups and deletes matching local backup files older than 7 days. Set it to `0` to disable cleanup.

## Local Backups Are Not Enough

Backups stored only on the same server are not sufficient. If the server disk is lost, compromised, or deleted, those backups are lost too.

Copy backups to external storage, for example:

- S3
- Backblaze B2
- Google Drive
- another server
- hosting provider backup storage

For managed databases such as Supabase, Render PostgreSQL, AWS RDS, Neon, or similar, also enable provider backups and point-in-time recovery if available.

## Server Setup Checklist

- Install `postgresql-client` and `gzip`.
- Configure `DATABASE_URL` in the cron command or server environment.
- Choose a durable `BACKUP_DIR`.
- Run a manual backup.
- Restore the backup to staging.
- Configure cron.
- Copy backups to external storage.
- Document who receives backup failure alerts.
