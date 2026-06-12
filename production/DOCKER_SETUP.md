# Docker Setup

This Docker setup is for reliable local and staging-style runs of the full ElecSHOP stack:

- PostgreSQL
- Redis
- Express backend
- Next.js frontend

It is not a production cloud deployment recipe. Production still needs managed secrets, TLS, backups, monitoring, release-specific migration handling, and provider-specific deployment settings.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2
- Enough disk space for Node images, npm dependencies, PostgreSQL data, and frontend build output

## Environment Setup

Copy the example Docker environment file:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` and replace placeholder secrets:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `SESSION_SECRET`
- Google OAuth placeholders if you need OAuth in Docker
- ImageKit keys if you want image uploads in Docker

Do not commit `.env.docker`.

Local Docker uses:

```bash
BACKEND_NODE_ENV=development
```

This lets the backend start without optional production-only ImageKit keys. If you set:

```bash
BACKEND_NODE_ENV=production
```

then you must provide real values for:

- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`

## Important URL Rule

The browser cannot call Docker service names like `http://backend:5000`.

Use:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

for browser-side requests.

Use:

```bash
INTERNAL_API_URL=http://backend:5000
```

for server-side frontend requests from inside Docker.

## Start The Stack

Run from the repository root:

```bash
docker compose --env-file .env.docker up --build
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health

If port `5000` is busy, set:

```bash
BACKEND_PORT=5001
NEXT_PUBLIC_API_URL=http://localhost:5001
GOOGLE_CALLBACK_URL=http://localhost:5001/api/v1/auth/google/callback
```

Then use backend health at http://localhost:5001/api/health.

## Migrations

The backend container applies the idempotent base schema and then runs migrations automatically before starting the API:

```bash
npm run db:schema && node dist/db/migrate.js && node dist/server.js
```

This matches the CI order and uses the existing idempotent migration runner and the `schema_migrations` table.

Important production warning:

This automatic `db:schema` startup is intended for this local/staging Docker Compose setup. Do not run `db:schema` automatically against a real production database unless you have confirmed the schema file is non-destructive for your production data. If `db:schema` ever drops, truncates, or recreates tables, it can wipe production data.

For real production, prefer a separate release migration step, usually:

```bash
node dist/db/migrate.js
```

and then start the API:

```bash
node dist/server.js
```

If you need to run migrations manually:

```bash
docker compose --env-file .env.docker run --rm backend npm run db:schema
docker compose --env-file .env.docker run --rm backend node dist/db/migrate.js
```

## Seed Data

The current seed file does not create default products. If you add safe local seed data later, run:

```bash
docker compose --env-file .env.docker exec backend npm run db:seed
```

For now, create products through the admin UI or use your own controlled seed data.

## Logs

Follow all logs:

```bash
docker compose --env-file .env.docker logs -f
```

Follow one service:

```bash
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker logs -f frontend
```

## Stop Containers

Stop without deleting data:

```bash
docker compose --env-file .env.docker down
```

Stop and remove PostgreSQL data:

```bash
docker compose --env-file .env.docker down -v
```

Only use `-v` when you intentionally want a clean database.

## Backups

Docker volumes are not a backup strategy. For real staging or production, also use:

- Managed database backups or PITR if your provider supports it
- External backup storage such as S3, Backblaze, Google Drive, or provider snapshots
- The backup scripts documented in `docs/BACKUP_AND_RESTORE.md`

## Useful Validation Commands

Check the Compose file:

```bash
docker compose --env-file .env.docker config
```

Build containers:

```bash
docker compose --env-file .env.docker build
```

Start the stack:

```bash
docker compose --env-file .env.docker up
```

Check backend health:

```bash
curl http://localhost:5000/api/health
```

## Known Limitations

- OAuth uses placeholder values unless configured.
- ImageKit upload endpoints need ImageKit env vars.
- The frontend public API URL is baked into the Next.js build, so rebuild the frontend image when changing `NEXT_PUBLIC_API_URL`.
- This setup does not add production TLS, reverse proxy, autoscaling, or cloud deployment.
