# Phase 2: Must Fix Before Real Client

## Goal
A real ecommerce client cannot afford to fly blind. You must know if the app crashes for a user (Sentry) and you must ensure their business data is never permanently lost (Database Backups).

## 1. Setup Error Tracking (Sentry)

Sentry will catch unhandled promise rejections, 500 errors, and frontend crashes in real-time, sending an alert to your phone/email.

### Backend Setup
1. `cd backend && npm install @sentry/node @sentry/profiling-node`
2. Update `backend/src/index.ts` to initialize Sentry at the very top of the file:
```typescript
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Get this from sentry.io
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// ... inside your Express app setup, BEFORE any routes:
app.use(Sentry.Handlers.requestHandler());

// ... AFTER all your routes, but BEFORE your custom error handler:
app.use(Sentry.Handlers.errorHandler());
```

### Frontend Setup
1. `cd frontend && npx @sentry/wizard@latest -i nextjs`
2. Follow the CLI wizard prompts. It will automatically create `sentry.client.config.ts`, `sentry.server.config.ts`, and wrap your `next.config.js`.

---

## 2. Automated Database Backups

While modern managed databases (like Supabase, Render, or RDS) have built-in point-in-time recovery, if you are running a custom VPS or cheap tier, you MUST automate backups.

### The Backup Script
Create `scripts/backup_db.sh`:
```bash
#!/bin/bash
# scripts/backup_db.sh

# Load environment variables
source ../backend/.env

BACKUP_DIR="/var/backups/elecshop"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="elecshop_db_backup_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

echo "Starting backup of ElecSHOP database..."
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/$FILENAME
echo "Backup saved to $BACKUP_DIR/$FILENAME"

# Optional: Keep only the last 7 days of backups
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
```

### Setup the Cron Job
Run `crontab -e` on your server and add this line to run the backup every day at 3:00 AM:
```text
0 3 * * * /path/to/your/project/scripts/backup_db.sh >> /var/log/elecshop_backup.log 2>&1
```
