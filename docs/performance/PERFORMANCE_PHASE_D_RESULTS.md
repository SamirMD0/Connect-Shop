# Performance Phase D Results

> Date: 2026-06-15
> Scope: Reduce Next.js SSR API fan-out for the homepage only.
> Status: Implemented for homepage aggregate data. No broad caching, database schema changes, rate-limit weakening, or frontend redesign were added.

## What Changed

The homepage SSR data path now uses one backend request instead of six.

New endpoint:

```text
GET /api/v1/homepage/full
```

Frontend call:

```text
frontend/src/app/page.tsx -> /api/homepage/full
```

The endpoint returns public homepage data only:

- `featuredProducts`
- `trendingProducts`
- `categories`
- `brands`
- `carouselSlides`
- `homepage`

No cart, user, session, checkout/order, auth, admin, upload, review mutation, or private data is included.

## Homepage Fan-Out

Before Phase D, `frontend/src/app/page.tsx` made these six backend HTTP requests during SSR:

1. `/api/products/featured`
2. `/api/products?sort=rating&limit=8`
3. `/api/categories`
4. `/api/brands`
5. `/api/carousel`
6. `/api/homepage`

After Phase D:

1. `/api/homepage/full`

Result:

- Old homepage SSR fan-out: `6` backend HTTP requests.
- New homepage SSR fan-out: `1` backend HTTP request.

## Partial Failure Behavior

The aggregate endpoint resolves each public section independently.

If one public section fails:

- The server logs the failed section.
- The response still returns `success: true`.
- The failed section falls back to an empty array or empty homepage content.
- `partialFailures` lists section names, without stack traces or private error details.

This keeps the homepage renderable while preserving server-side visibility into failures.

## Rate-Limit Classification

`GET /api/v1/homepage/full` and `HEAD /api/v1/homepage/full` are classified as safe public reads and use `publicReadLimiter`.

These remain excluded from public-read classification:

- `POST /api/v1/homepage/full`
- admin homepage routes under `/api/v1/admin/homepage`
- unknown routes
- auth/cart/orders/users/review mutation routes

## Expected Impact

Phase D reduces backend HTTP request amplification from homepage SSR. This should reduce:

- backend request count per homepage page view
- rate-limit bucket pressure
- connection overhead between Next.js SSR and the backend
- avoidable latency caused by six separate HTTP calls

## What Phase D Does Not Solve

Phase D does not:

- Add broad public-read caching.
- Reduce database query count inside the aggregate endpoint.
- Optimize SQL queries.
- Change store/category/product detail SSR fan-out.
- Add CDN or infrastructure scaling.
- Prove support for 1,000-5,000 concurrent users.

Phase C caching remains important because the aggregate endpoint still gathers multiple public data sections internally. Phase C was later implemented for the complete homepage aggregate response and public brands.

## Validation

Commands run:

```powershell
cd backend
npm run build
npm test

cd frontend
npm run lint
npm run typecheck
npm run build
```

Results:

- `cd backend && npm run build`: passed.
- `cd backend && npm test`: passed, `92` tests, `0` failures.
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm run build`: passed.
- `cd frontend && npm run typecheck`: passed after the build regenerated `.next/types`.

Safe local k6 commands:

```powershell
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-smoke.js
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-small.js
```

Smoke result:

- Profile: `1 -> 2 -> 5` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- p95: `269.97ms`.
- p99: `428.65ms`.
- Max: `1.1s`.
- k6 429 counter: `0`.

Small result:

- Profile: `5 -> 10 -> 25` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- p95: `655.65ms`.
- p99: `883.83ms`.
- Max: `1.34s`.
- k6 429 counter: `0`.

## Follow-Up Status

Phase C was later implemented for selected safe public-read caching. The next performance phase should be Phase E database/query performance after fresh smoke/small k6 runs with frontend, backend, PostgreSQL, and Redis available.
