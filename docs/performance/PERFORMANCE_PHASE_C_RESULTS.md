# Performance Phase C Results

> Date: 2026-06-16
> Scope: Safe public-read caching only.
> Status: Implemented for selected anonymous public reads. No rate-limit weakening, frontend behavior changes, database schema/index changes, private-data caching, or sensitive route changes were added.

## Cache Audit

Existing cache behavior before Phase C:

| Public data | Existing cache state | Notes |
| --- | --- | --- |
| Active carousel slides | Cached | `carousel:active:v1`, TTL `180s`. |
| Homepage CMS content | Cached | `homepage:active:v1`, TTL `180s`. |
| Categories tree | Cached | `categories:tree:v1`, TTL `600s`. |
| Featured products | Cached | `products:featured:v1:*`, TTL `180s`. |
| Product detail by slug | Cached | `product:slug:v1:*`, TTL `180s`. |
| Product list/store queries | Cached | Normalized SHA1 key, TTL `45s`. Short TTL limits arbitrary filter/search key growth. |
| Public brands | Not cached | Added in Phase C. |
| Homepage aggregate `/api/v1/homepage/full` | Not cached | Added in Phase C. |

Current verified SSR fan-out remains:

| Page | Backend API calls during SSR |
| --- | ---: |
| Homepage `/` | `1`, via `GET /api/v1/homepage/full` |
| Store `/store` | `2` |
| Category store `/store?category=:slug` | `2` |
| Product detail `/store/:slug` | Up to `3` |

## What Changed

Added cache-aside entries using the existing Redis helpers:

- `GET /api/v1/homepage/full`
  - Cache key: `homepage:full:v1`
  - TTL: `60s`
  - Stores only the complete anonymous public homepage aggregate response.
  - Does not cache degraded aggregate responses when `partialFailures` is non-empty.
- `GET /api/v1/brands`
  - Cache key: `brands:public:v1`
  - TTL: `600s`
  - Stores only active public brand data.

Redis behavior remains fail-open for reads:

- Redis unavailable: request falls back to database/service work.
- Redis write failure: request still succeeds.
- Bad JSON in Redis: key is deleted and the request treats it as a cache miss.

## Invalidation

Phase C extended existing invalidation so public caches are cleared after relevant writes:

- Homepage CMS/admin homepage changes invalidate `homepage:active:v1` and `homepage:full:v1`.
- Carousel changes invalidate `carousel:active:v1` and `homepage:full:v1`.
- Product changes invalidate product slug, featured-products, product-list, and homepage aggregate caches.
- Category changes invalidate category tree, product-list, and homepage aggregate caches.
- Brand changes invalidate public brands, product-list, and homepage aggregate caches.

No cart, auth, checkout, order, admin permission, upload, review, CSRF, session, or user-specific data is cached.

## What Was Intentionally Not Changed

- Public read rate limits were not changed.
- Sensitive endpoint limiters were not changed.
- Frontend API behavior was not changed.
- Database queries, schema, and indexes were not changed.
- Store/category/product detail SSR fan-out was not reduced.
- Product-list caching remains short TTL and normalized; no broad long-lived cache was added for arbitrary search/spec combinations.
- No claim is made that the app supports 1,000-5,000 concurrent users.

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
- `cd backend && npm test`: passed, `98` tests, `0` failures.
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run build`: passed.

Notes:

- The first frontend lint attempt was run in parallel with typecheck and hit the command timeout before producing a result. It was rerun with a longer timeout and passed.
- The first frontend build attempt hit the command timeout before producing a result. It was rerun with a longer timeout and passed.

## k6

Phase C requested smoke/small k6 only if services were available.

Service check result:

- `http://localhost:3000/`: connection refused.
- `http://localhost:5000/api/health`: connection refused.

k6 was not run in this turn because the frontend and backend services were not running. No k6 result is claimed for Phase C.

Previous Phase D local k6 reference results remain the latest available successful public-read runs:

- Smoke `1 -> 2 -> 5` VUs: p95 `269.97ms`, failed HTTP requests `0%`, 429 counter `0`.
- Small `5 -> 10 -> 25` VUs: p95 `655.65ms`, failed HTTP requests `0%`, 429 counter `0`.

## Phase C.1 Local Validation

> Date: 2026-06-17
> Source: Manual local run output provided from PowerShell.

Services:

- PostgreSQL: running locally.
- Redis: local Redis was started/reachable for the validation window.
- Backend API: running on `http://localhost:5000`; backend logs show public read responses returning `200`.
- Frontend: production build completed successfully.

Frontend startup note:

- `npm run start -- --port 3000` resolved incorrectly to `next start 3000` and failed with `Invalid project directory provided`.
- `npx next start --port 3000` started, but Next.js warned that `next start` is not the correct server for `output: 'standalone'`.
- The frontend `start` script was corrected to use a standalone start wrapper that copies `public` and `.next/static` into `.next/standalone`, then runs the generated standalone server.

Manual frontend production start for standalone builds:

```powershell
cd frontend
npm run build
$env:PORT="3000"
$env:HOSTNAME="localhost"
npm run start
```

Smoke profile:

- Profile: `1 -> 2 -> 5` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- 429 responses: `0`.
- Overall p95: `278.28ms`.
- Overall p99: `562.93ms`.
- Max: `1.05s`.
- Homepage p95: `417.3ms`.
- Store p95: `279.82ms`.
- Category store p95: `255.32ms`.
- Product detail p95: `8.6ms`.
- Result: passed the local `<1500ms` p95 threshold.

Small profile:

- Profile: `5 -> 10 -> 25` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- 429 responses: `0`.
- Overall p95: `1.57s`.
- Overall p99: `7.99s`.
- Max: `10.59s`.
- Homepage p95: `1.83s`.
- Store p95: `2.52s`.
- Category store p95: `1.93s`.
- Product detail p95: `34.23ms`.
- Result: failed the local `<1500ms` p95 threshold by a small margin.

Cold vs warm notes:

- The provided output includes one smoke run followed by one small run.
- A second small warm-cache run was not included, so cold/semi-cold vs warm comparison remains incomplete.

Log observations from the provided backend excerpt:

- Public read routes returned `200`.
- k6 counted `0` HTTP 429 responses.
- No Redis connection errors, cache JSON parse errors, cache set/delete errors, homepage partial failures, or DB errors were visible in the provided excerpt.
- Sample backend response times for public API requests were mostly around `136ms` to `190ms`, while k6 saw frontend page p99 spikes up to about `8-10s`.

Interpretation:

- Phase C caching prevented 429s during smoke/small local validation.
- The remaining small-profile bottleneck appears in frontend-rendered page durations, especially store/category/homepage p99 spikes, not product detail.
- Since sampled backend API response times were much lower than the slowest k6 page durations, the next investigation should separate frontend SSR CPU/event-loop pressure from backend/database query latency before changing database indexes.

## Remaining Risks

- Homepage aggregate cache reduces repeated work only when Redis is enabled and warm.
- Cold cache misses still execute the aggregate's internal service/database work.
- Store/category/product-detail pages still have their existing SSR fan-out.
- Product-list search/spec filters can still create many short-lived keys under diverse query traffic.
- Medium and large capacity must be tested on staging-like infrastructure; local tests do not prove 1,000-5,000 user support.

## Next Phase

Phase E can start if the next objective is database/query performance, but it should start from fresh smoke/small k6 runs with frontend, backend, PostgreSQL, and Redis running.
