# Performance Baseline Results

> Date: 2026-06-15
> Scope: Phase A measurement and baseline only.
> Status: Baseline documented. Phase B public-read limiter changes are documented in `docs/PERFORMANCE_PHASE_B_RESULTS.md`; Phase D homepage fan-out reduction is documented in `docs/PERFORMANCE_PHASE_D_RESULTS.md`.

## Scope

This baseline covers read-only public browsing traffic through the Next.js frontend:

- Homepage: `/`
- Store page: `/store`
- Category-filtered store page: `/store?category=:slug`
- Product detail page: `/store/:slug`

The baseline does not cover login, cart mutation, checkout, admin, uploads, reviews, or other mutating flows.

## Environment

Known local test environment from the available terminal output:

- Frontend URL: `http://localhost:3000`
- Backend URL: `http://localhost:5000`
- Frontend command for the earlier successful production-style result: `npx next start --port 3000` after `npm run build`
- Frontend command for the Phase A validation run: service was already running on port 3000; exact command was not reverified
- Backend command: local backend was already running on port 5000; exact command was not reverified
- Database: local database available during the tests; exact engine status was not captured in the k6 output
- Redis/rate-limit store: not independently verified from the k6 output; rate-limit headers and backend logs confirm rate limiting was active
- k6 runner: same local machine as frontend/backend

Local results should be treated as bottleneck signals, not production capacity proof.

## Verified SSR API Fan-Out

The frontend SSR pages were inspected directly.

These are the Phase A baseline counts before Phase D:

| Page | Frontend file | Backend API calls during SSR | Notes |
| --- | --- | ---: | --- |
| Homepage `/` | `frontend/src/app/page.tsx` | 6 | Calls `/api/products/featured`, `/api/products?sort=rating&limit=8`, `/api/categories`, `/api/brands`, `/api/carousel`, and `/api/homepage` in one `Promise.all`. |
| Store `/store` | `frontend/src/app/store/page.tsx` | 2 | Calls `/api/products` with filters and `/api/categories`. |
| Category store `/store?category=:slug` | `frontend/src/app/store/page.tsx` | 2 | Same as store, with the category query parameter included in the product-list request. |
| Product detail `/store/:slug` | `frontend/src/app/store/[slug]/page.tsx` | Up to 3 | `generateMetadata` calls `/api/products/:slug`; the page calls `/api/products/:slug` again; related products call `/api/products?category=:slug&limit=5` when the product has a category. |

Additional build-time note:

- `generateStaticParams` in `frontend/src/app/store/[slug]/page.tsx` calls `/api/products?limit=100` during build/static generation, not per normal page request.

Phase D update:

- Homepage `/` now uses `GET /api/v1/homepage/full` as the normal SSR path.
- New homepage backend HTTP call count: `1`.
- Store, category store, and product detail counts are unchanged from the Phase A baseline.

## k6 Profiles Added

The public website k6 profiles now live under `load-tests/k6/`:

- `website-smoke.js`: `1 -> 2 -> 5` VUs
- `website-small.js`: `5 -> 10 -> 25` VUs
- `website-medium.js`: `50 -> 100 -> 250` VUs
- `website-load.js`: shared implementation, selectable with `K6_PROFILE=smoke|small|medium`

The scripts collect:

- Standard k6 HTTP duration metrics with p50, p95, p99, and max
- Failed request percentage
- Check pass percentage
- `homepage_duration`
- `store_duration`
- `category_store_duration`
- `product_detail_duration`
- `http_429_responses`
- `rate_limit_remaining` when the target exposes rate-limit headers

## Known Baseline Results

### Phase A Smoke Validation

Command:

```powershell
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-smoke.js
```

Profile shape:

- `1 -> 2 -> 5` VUs

Observed result:

- Checks: `100%`
- Failed HTTP requests: `0%`
- p95: `348.21ms`
- p99: `661.54ms`
- Max duration: `723.19ms`
- 429 responses counted by k6: `0`
- Result: passed the local p95 target of `< 1500ms`

Per-page p95:

- Homepage: `450.61ms`
- Store: `380.74ms`
- Category store: `293.99ms`
- Product detail: `8.57ms`

Slowest page type by p95:

- Homepage

### Phase A Small Production-Style Validation

Command:

```powershell
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-small.js
```

Profile shape:

- `5 -> 10 -> 25` VUs

Observed result:

- Checks: `100%`
- Failed HTTP requests: `0%`
- p95: `456.03ms`
- p99: `677.76ms`
- Max duration: `1.27s`
- 429 responses counted by k6: `0`
- Result: passed the local p95 target of `< 1500ms`

Per-page p95:

- Homepage: `636.17ms`
- Store: `397.96ms`
- Category store: `408.84ms`
- Product detail: `64.32ms`

Slowest page type by p95:

- Homepage

Medium profile status:

- Not rerun during this update. The earlier `50 -> 100 -> 250` local run already showed backend rate-limit exhaustion and p95 degradation, so Phase A avoided another limiter-saturating local run.

### Earlier Small Run

Profile shape:

- `2 -> 3 -> 5` VUs
- Short local ramp/hold durations

Observed result:

- Checks: `100%`
- Failed HTTP requests: `0%`
- p95: about `551ms`
- 429s: none observed in the reported k6 output
- Result: passed the local p95 target of `< 1500ms`

Meaning:

- The application handles light local public browsing traffic when the frontend is running in production mode.

What it does not prove:

- It does not prove support for 1,000-5,000 concurrent users.
- It does not prove peak campaign capacity.
- It does not isolate database, Redis, backend CPU, or frontend CPU limits.

### Earlier Medium/Heavy Local Run

Profile shape:

- `50 -> 100 -> 250` VUs

Observed result:

- Checks: `100%`
- Failed HTTP requests from k6 perspective: `0%`
- p95: about `8.2s`
- Max duration: about `19.46s`
- Backend rate limiter reached `ratelimit-remaining: 0`
- Frontend SSR received backend `429 Too Many Requests` errors
- Result: failed the local p95 target of `< 1500ms`

Meaning:

- The first clearly observed bottleneck was public read traffic exhausting the backend general rate limiter through Next.js SSR API fan-out.
- The app did not immediately crash, but public page rendering degraded badly under this local stress profile.

What it does not prove:

- It does not prove the database is the first bottleneck.
- It does not prove the application can or cannot handle this same traffic on staging/production infrastructure.
- It does not justify weakening security-sensitive limits.

## Current Interpretation

The immediate scaling risk is the combination of:

1. Next.js SSR pages making multiple backend API calls per page request.
2. Public read routes sharing the backend `generalLimiter`.
3. Local k6, frontend, backend, database, and Redis competing for the same machine resources.

Phase B can start after this baseline because Phase A has enough evidence to evaluate public read rate-limit behavior separately from auth, checkout, cart, admin, upload, review, CSRF, and validation protections.

## Remaining Measurement Gaps

- Capture CPU and memory for frontend, backend, database, Redis, and k6 during each run.
- Capture database connection counts and slow queries.
- Verify Redis status and rate-limit store behavior explicitly.
- Export k6 JSON summaries for repeatable comparison.
- Re-run the smoke and small profiles after rate-limit windows are reset.
- Run medium only when the local machine is not already saturated.
