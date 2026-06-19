# Production Deployment Guide

> Target stack: Vercel frontend, Render backend, managed PostgreSQL, managed Redis, ImageKit/CDN images, and Cash on Delivery/manual order flow.
> This guide uses placeholders only. Do not paste real secrets into documentation or commits.

## Deployment Scope

This guide covers a production/demo deployment path for Connect-shop / ElecSHOP. It does not claim support for 1,000-5,000 concurrent users. Production-scale claims require provider-approved staging tests with adequate PostgreSQL, Redis, backend, image CDN, and monitoring capacity.

Recommended domains:

- Frontend: `https://yourdomain.com`
- Backend API: `https://api.yourdomain.com`

## 1. Prerequisites

- GitHub repository connected to Vercel and Render.
- Managed PostgreSQL database.
- Managed Redis, such as a paid/pay-as-you-go Upstash instance or another production-capable Redis provider.
- ImageKit account and URL endpoint/API keys.
- Optional Google OAuth credentials if Google sign-in is enabled.
- No real customer/payment testing during load tests.

## 2. Backend On Render

Create a Render Web Service for the backend.

Recommended settings:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Runtime | Node |
| Build command | `cd backend && npm install && npm run build` |
| Start command | `cd backend && npm start` |
| Health check path | `/api/health` |
| Instance type | Start with a paid instance for real demo/production testing |

Render should inject `PORT`; the backend reads it from `process.env.PORT`.

Required backend environment variables:

```env
NODE_ENV=production
PORT=<render-provided-port-or-placeholder>
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
DB_STATEMENT_TIMEOUT_MS=10000
REDIS_URL=rediss://default:PASSWORD@HOST:PORT
SESSION_SECRET=<long-random-secret-at-least-32-chars>
FRONTEND_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=<google-client-id-or-placeholder>
GOOGLE_CLIENT_SECRET=<google-client-secret-or-placeholder>
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback
INTERNAL_SSR_API_SECRET=<same-server-only-secret-as-frontend>
IMAGEKIT_PUBLIC_KEY=<imagekit-public-key>
IMAGEKIT_PRIVATE_KEY=<imagekit-private-key>
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
IMAGEKIT_FOLDER=/connect-shop
COOKIE_MAX_AGE=604800000
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.0
PERF_LOGGING_ENABLED=false
```

Optional backend variables:

```env
PUBLIC_READ_WINDOW_MS=900000
PUBLIC_READ_HOMEPAGE_LIMIT=
PUBLIC_READ_PRODUCT_LIST_LIMIT=
PUBLIC_READ_PRODUCT_DETAIL_LIMIT=
PUBLIC_READ_METADATA_LIMIT=
PUBLIC_READ_FALLBACK_LIMIT=
PUBLIC_READ_SSR_LIMIT=
RESEND_API_KEY=
LOG_PRETTY=false
INITIALIZE_DATABASE=false
```

Notes:

- Keep public-read limits blank unless a staging result justifies changing them.
- Do not use Upstash free/low-quota Redis for production load testing.
- Do not expose `SESSION_SECRET`, `IMAGEKIT_PRIVATE_KEY`, `GOOGLE_CLIENT_SECRET`, `REDIS_URL`, `DATABASE_URL`, or `INTERNAL_SSR_API_SECRET`.
- `/api/health` is intentionally mounted before general user traffic rate limits for deployment and load balancer health checks.

## 3. Frontend On Vercel

Create a Vercel project for the frontend.

Recommended settings:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Framework preset | Next.js |
| Build command | `cd frontend && npm install && npm run build` |
| Output | Vercel handles Next.js automatically |

Start behavior:

- Vercel runs the Next.js runtime automatically.
- `frontend/scripts/start-standalone.mjs` is mainly for self-hosted/container production runs, not the normal Vercel path.

Required frontend environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
INTERNAL_API_URL=https://api.yourdomain.com
INTERNAL_SSR_API_SECRET=<same-server-only-secret-as-backend>
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=ELECTRO SHOP
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
NEXT_PUBLIC_BUSINESS_PHONE="+961 00 000 000"
NEXT_PUBLIC_BUSINESS_WHATSAPP="+96100000000"
NEXT_PUBLIC_BUSINESS_EMAIL=support@example.com
NEXT_PUBLIC_BUSINESS_ADDRESS=Lebanon
NEXT_PUBLIC_BUSINESS_HOURS="Monday to Saturday, 9:00 AM - 8:00 PM"
```

Optional frontend variables:

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
PERF_LOGGING_ENABLED=false
PERF_SLOW_REQUEST_MS=1000
PERF_SLOW_FETCH_MS=
PERF_SLOW_RENDER_MS=
```

Security rules:

- `INTERNAL_SSR_API_SECRET` must never be prefixed with `NEXT_PUBLIC`.
- Backend secrets must never appear in browser bundles.
- Only variables that are safe for browsers should use `NEXT_PUBLIC_*`.

## 4. PostgreSQL Deployment

Steps:

1. Create a managed PostgreSQL database.
2. Copy its external connection string into Render as `DATABASE_URL`.
3. Confirm the provider has backups enabled.
4. Enable point-in-time recovery if available for the chosen plan.
5. Check max connections and reserve capacity for migrations/admin tools.
6. Keep the backend pool size in mind: the current backend pool uses max `20` connections per backend process.
7. Run migrations after the backend build succeeds.

Migration command:

```bash
cd backend && npm run db:migrate
```

Validation:

- Render backend starts without PostgreSQL connection errors.
- `GET https://api.yourdomain.com/api/health` returns 200.
- Backend logs show successful PostgreSQL connection.

## 5. Redis Deployment

Production/staging Redis should be a paid/higher-capacity managed Redis provider.

Use Redis for:

- shared rate-limit buckets
- public-read cache keys
- route-specific public-read limiter state

Do not use Upstash free/low-quota Redis for repeated medium k6 load tests. Phase K exhausted an Upstash-compatible quota with:

```text
ERR max requests limit exceeded. Limit: 500000, Usage: 500000.
```

Local k6 testing should use local Redis:

```powershell
docker run -d --name elecshop-redis -p 6379:6379 redis:7-alpine
```

Or start an existing local container:

```powershell
docker start elecshop-redis
```

Set the backend variable:

```env
REDIS_URL=redis://localhost:6379
```

Production/staging should use the provider URL, commonly `rediss://...` for TLS-capable managed Redis.

Monitor:

- command/request quota
- Redis latency
- Redis connection errors
- evictions
- cache get/set failures
- rate-limit store errors

## 6. ImageKit Setup

Steps:

1. Create or choose an ImageKit account.
2. Copy the URL endpoint to frontend and backend variables.
3. Copy public/private API keys to Render backend only.
4. Set `IMAGEKIT_FOLDER=/connect-shop` or another deployment-specific folder.
5. Confirm admin uploads work in a non-production test environment before real launch.

Backend variables:

```env
IMAGEKIT_PUBLIC_KEY=<imagekit-public-key>
IMAGEKIT_PRIVATE_KEY=<imagekit-private-key>
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
IMAGEKIT_FOLDER=/connect-shop
```

Frontend variable:

```env
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
```

## 7. Custom Domains

Frontend domain on Vercel:

1. Add `yourdomain.com` and `www.yourdomain.com` in Vercel.
2. Update DNS records as Vercel instructs.
3. Set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`.

Backend domain on Render:

1. Add `api.yourdomain.com` in Render custom domains.
2. Update DNS records as Render instructs.
3. Set backend `FRONTEND_URL=https://yourdomain.com`.
4. Set frontend `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`.
5. Set frontend `INTERNAL_API_URL=https://api.yourdomain.com`.

OAuth callback update if Google OAuth is used:

```text
https://api.yourdomain.com/api/v1/auth/google/callback
```

## 8. Post-Deploy Validation Checklist

Backend:

- `GET https://api.yourdomain.com/api/health` returns 200.
- `GET https://api.yourdomain.com/api/v1/homepage/full` returns 200 JSON.
- No Redis quota or connection errors in logs.
- No PostgreSQL connection errors in logs.
- Rate-limit headers are present on public API responses.

Frontend:

- `GET https://yourdomain.com` returns 200.
- Store page returns 200.
- Product detail page returns 200.
- Images load from configured storage/CDN.
- Cart flow works.
- Cash on Delivery checkout/order flow works if enabled for the deployment.
- Admin login and key admin pages work with authorized users.

k6 smoke validation from a controlled environment:

```powershell
$env:FRONTEND_URL="https://yourdomain.com"; $env:BASE_URL="https://api.yourdomain.com"; k6 run load-tests/k6/website-smoke.js
$env:API_BASE_URL="https://api.yourdomain.com"; $env:PROFILE="smoke"; k6 run load-tests/k6/api-public-read.js
```

Optional small run only after Redis capacity is confirmed:

```powershell
$env:FRONTEND_URL="https://yourdomain.com"; $env:BASE_URL="https://api.yourdomain.com"; k6 run load-tests/k6/website-small.js
$env:API_BASE_URL="https://api.yourdomain.com"; $env:PROFILE="small"; k6 run load-tests/k6/api-public-read.js
```

Do not run medium on free/low-quota Redis.

## 9. Migration And Release Order

Recommended order:

1. Provision PostgreSQL and Redis.
2. Configure backend env in Render.
3. Deploy backend.
4. Run backend migrations.
5. Validate backend health and homepage API.
6. Configure frontend env in Vercel.
7. Deploy frontend.
8. Validate public storefront pages.
9. Validate auth/admin/cart/checkout manually with safe test data.
10. Run smoke k6 only after basic manual validation passes.

## 10. Rollback Notes

Backend rollback:

- Use Render deploy history to roll back to the previous successful backend deploy.
- Do not roll back database migrations blindly if they have already modified production data.
- If a migration is suspected, pause writes and inspect the migration impact first.

Frontend rollback:

- Use Vercel deployment history to promote the previous successful deployment.
- Confirm `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`, and `NEXT_PUBLIC_SITE_URL` still point to the intended backend/domain.

Redis/PostgreSQL rollback:

- Prefer provider snapshots/backups.
- Do not flush production Redis unless the operational impact is understood.
- Do not run destructive database commands as part of rollback without a tested restore plan.

## 11. Known Deployment Caveats

- Local and demo k6 results do not prove 1,000-5,000 concurrent-user support.
- Upstash free/low-quota Redis is not enough for repeated medium load tests.
- Production-like validation requires managed PostgreSQL, managed Redis, provider monitoring, and approved staging load tests.
- Payments are currently Cash on Delivery/manual order flow; no live payment gateway validation is covered by this guide.
