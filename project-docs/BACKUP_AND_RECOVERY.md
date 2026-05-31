# BACKUP AND RECOVERY

Orders, users, products, categories, admin data, and homepage CMS content are business-critical. Do not run a real store without a backup and restore plan.

## 1. Render PostgreSQL Backups

Use Render PostgreSQL backups/snapshots for production.

Recommended schedule:

- Daily backups for a real business.
- Manual backup before database migrations.
- Manual backup before major product/category imports.
- Manual backup before large admin changes.

Check Render's current backup retention and snapshot features for the selected database plan.

## 2. Manual SQL Dump Option

For an extra manual backup, use `pg_dump` from a secure machine:

```bash
pg_dump "$DATABASE_URL" > elecshop_backup_YYYY-MM-DD.sql
```

For compressed backups:

```bash
pg_dump "$DATABASE_URL" | gzip > elecshop_backup_YYYY-MM-DD.sql.gz
```

Do not commit database backups to the public repo. Store them securely with restricted access.

## 3. Restore Testing

A backup is only useful if it can be restored.

Recommended restore test:

1. Create a separate staging/test PostgreSQL database.
2. Restore the backup into staging.
3. Run the app against staging.
4. Confirm users, products, categories, orders, and homepage CMS data exist.
5. Confirm migrations do not fail after restore.

## 4. Before Migrations

Before running production migrations:

- Take a backup/snapshot.
- Confirm the migration was already tested locally or in staging.
- Run `npm run db:migrate` from the `backend` directory with production `DATABASE_URL` set.
- Verify the `schema_migrations` table after completion.

## 5. Recovery Priorities

If production data is lost or corrupted, prioritize recovery in this order:

1. Orders and order items.
2. Users/customers.
3. Products and categories.
4. Homepage CMS and admin content.
5. Analytics/log-derived data, if added later.

## 6. Image Recovery Note

Production admin uploads use ImageKit when the backend ImageKit environment variables are configured. PostgreSQL stores image URLs only, so database backups do not contain image binary data.

For recovery, keep access to the ImageKit account with the business owner or hosting maintainer. Local upload fallback is only for development/demo use and should not be treated as a production backup target.
