# BACKUP AND RECOVERY GUIDE

## 1. Goal

Database backups protect the business data that makes Connect-Shop / ElecSHOP usable as a real ecommerce system.

Backups matter because the PostgreSQL database stores:

- Users and customer accounts.
- Products, categories, brands, variants, stock, and prices.
- Orders, order items, customer delivery details, and order status history.
- Admin data, roles, sessions, MFA state, and audit logs.
- Homepage CMS content, carousel data, promotions, and marketing sections.
- Reviews, wishlist data, cart data, coupons, newsletters, and operational records.

Do not run a real store without a backup and restore plan.

## 2. What Must Be Backed Up

Back up the PostgreSQL database. It contains:

- Product, category, order, customer, and admin data.
- Homepage CMS content.
- Admin audit logs.
- Session and auth-related records.
- Image URLs stored in `image_url` fields.

Uploaded image files are stored separately when ImageKit is configured. PostgreSQL stores ImageKit URLs only; it does not store image binary data.

## 3. Recommended Backup Strategy

For small-business production:

- Run a daily database backup.
- Take a backup before database migrations.
- Take a backup before bulk product imports.
- Take a backup before major admin changes or data cleanup.
- Keep at least 7-30 days of backups, depending on the business risk and hosting plan.
- Test restore occasionally on a staging or temporary database.

Backups should be treated as business-critical operational data, not as developer-only files.

## 4. Render PostgreSQL Backups

Render PostgreSQL should be the assumed production database provider for this project.

Use Render PostgreSQL backups and snapshots if the selected plan supports them:

- Check the Render dashboard for backup and snapshot options.
- Verify retention based on the selected Render PostgreSQL plan.
- Upgrade the database plan if backup retention is not enough for the client.
- Do not rely only on local dumps from a developer laptop.
- Confirm who owns the Render account and who can restore a backup.

Render backups are the primary production backup mechanism. Manual `pg_dump` backups are a useful extra layer, especially before migrations or bulk data changes.

## 5. Manual Backup With pg_dump

Use placeholder commands only. Never commit real `DATABASE_URL` values.

Create a plain SQL backup:

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > backups/connect-shop-YYYY-MM-DD.sql
```

Create a compressed SQL backup:

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" | gzip > backups/connect-shop-YYYY-MM-DD.sql.gz
```

Rules:

- Never commit backup files.
- Never commit `DATABASE_URL`.
- Keep `backups/` gitignored.
- Store production backups in secure private storage.
- Run manual backups from a trusted machine or controlled Render shell.
- On Windows, use Git Bash/WSL or run equivalent `pg_dump` commands manually.

This repository includes `scripts/backup-db.sh` as a manual helper. It does not run automatically:

```bash
bash scripts/backup-db.sh
```

## 6. Restore With psql

Restore a plain SQL backup:

```bash
psql "$DATABASE_URL" < backups/connect-shop-YYYY-MM-DD.sql
```

Restore a compressed SQL backup:

```bash
gunzip -c backups/connect-shop-YYYY-MM-DD.sql.gz | psql "$DATABASE_URL"
```

Warnings:

- Restore can overwrite, duplicate, or conflict with existing data depending on how the dump was created and what is already in the target database.
- Test restore on staging first.
- Do not restore into production without explicit approval from the business owner or client.
- Take a current production snapshot before restore if the database is still accessible.

This repository includes `scripts/restore-db.sh` as a manual helper with a confirmation prompt. It does not run automatically:

```bash
bash scripts/restore-db.sh backups/connect-shop-YYYY-MM-DD.sql.gz
```

## 7. Backup Storage

Store backups somewhere private and controlled:

- Render PostgreSQL backups/snapshots.
- Encrypted external drive.
- Private cloud bucket with restricted access.
- Private backup storage owned by the business or hosting maintainer.

Do not store backups:

- In GitHub.
- In public Google Drive links.
- Inside `frontend/public`.
- In the repository root.
- In chat messages, tickets, screenshots, or client emails without encryption.

Limit backup access to people who are responsible for production operations.

## 8. Restore Testing

A backup is useful only if restore is tested.

Restore test checklist:

- Create a separate test or staging PostgreSQL database.
- Restore the backup into that database.
- Run migrations if needed.
- Start the backend against the restored database.
- Verify admin login.
- Verify products and categories.
- Verify orders and order items.
- Verify homepage CMS content.
- Verify audit logs or critical admin records if relevant.
- Confirm no migration errors occur after restore.

Run a restore test before selling the system to a client and after major schema changes.

## 9. Backup Before Migrations

Before running production migrations:

1. Take a database backup or Render snapshot.
2. Verify the backup file or snapshot exists.
3. Run the migration with `npm run db:migrate` from the `backend` directory.
4. Smoke test login, product browsing, admin product/category pages, orders, and homepage.
5. Keep the backup until the migration is confirmed safe.

Do not use `npm run db:schema` against production unless you fully understand the schema file impact. Production changes should use migrations.

## 10. ImageKit Backup Note

ImageKit stores uploaded images separately from PostgreSQL.

The database stores image URLs only. If ImageKit files are deleted, a database backup alone will not restore the image files.

For business-critical images:

- Keep original image copies outside the app.
- Confirm who owns the ImageKit account.
- Review ImageKit backup/export options if the image catalog becomes business-critical.
- Avoid deleting ImageKit files unless the business has a recovery plan.

## 11. Emergency Recovery Checklist

If production data is corrupted or lost:

1. Identify what happened and when.
2. Stop writes if necessary, for example by temporarily disabling admin changes or putting the backend in maintenance mode at the hosting level.
3. Take a current snapshot before restore if possible.
4. Choose the restore point.
5. Restore on staging first.
6. Verify products, orders, admin login, and homepage CMS on staging.
7. Restore production only after business owner/client approval.
8. Smoke test production order/product/admin flows.
9. Document the incident, restore point, cause, and follow-up prevention.

Do not improvise a production restore during active business operations without approval.

## 12. Client Responsibility

The hosting owner must know who is responsible for backups.

A maintenance agreement should define:

- Backup frequency.
- Backup retention.
- Restore testing schedule.
- Who pays for backup-capable hosting plans.
- Who has access to Render, database, ImageKit, and backup storage.
- Response time and cost for emergency restore work.

The developer is not responsible for lost data unless backup service and recovery support are explicitly included in the maintenance contract.
