# Performance Phase H Results

> Date: 2026-06-17
> Scope: Bottleneck attribution and observability for medium-load public-read latency.
> Status: Implemented for env-gated instrumentation and manual local validation review. No rate limits, cache behavior, database schema, frontend UI, auth, checkout, cart, orders, admin, uploads, reviews, CSRF, sessions, validation, or user logic were changed.

## Scope Boundary

Phase H added and validated observability only. It did not tune the system.

This phase did not claim support for 1,000-5,000 concurrent users and did not run 1,000+ VU tests locally.

Public-read validation covered:

- Homepage.
- Store page.
- Category-filtered store page.
- Product detail page.

It did not test login, cart mutation, checkout, orders, payments, admin, uploads, reviews, or user-specific flows.

## Instrumentation Added

Backend env-gated instrumentation:

- Slow request logging middleware.
- Event-loop delay and process memory summary logging.
- Redis/cache hit, miss, and error counters grouped by cache key family.
- Slow query logging for the central database `query()` helper.

Frontend env-gated instrumentation:

- Server-side backend fetch timing.
- Server component render-prep timing for public pages.

Environment flag:

```powershell
$env:PERF_LOGGING_ENABLED="true"
```

Supporting thresholds:

```powershell
$env:PERF_SLOW_REQUEST_MS="1000"
$env:PERF_SLOW_FETCH_MS="1000"
$env:PERF_SLOW_RENDER_MS="1000"
$env:PERF_SLOW_QUERY_MS="250"
$env:PERF_EVENT_LOOP_LOG_INTERVAL_MS="30000"
$env:PERF_CACHE_SUMMARY_INTERVAL_MS="30000"
```

The instrumentation is disabled by default unless `PERF_LOGGING_ENABLED=true`.

## Validation Commands

Code validation completed before manual k6 review:

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

| Command | Result |
| --- | --- |
| `cd backend && npm run build` | Passed |
| `cd backend && npm test` | Passed, 101 tests |
| `cd frontend && npm run lint` | Passed |
| `cd frontend && npm run typecheck` | Passed |
| `cd frontend && npm run build` | Passed |

## Manual Local Test Inputs

The user ran the public-read k6 profiles against local services:

```powershell
k6 run load-tests/k6/website-small.js
k6 run load-tests/k6/website-medium.js
```

Frontend and backend logs were reviewed from the pasted terminal output.

## Small Result

Profile:

- `5 -> 10 -> 25` VUs.

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| k6-visible 429 responses | 0 |
| HTTP requests | 4,394 |
| Iterations | 1,098 |
| Overall p95 | 394.22ms |
| Overall p99 | 508.01ms |
| Max latency | 2.26s |
| Result | Passed |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 473.12ms | 541.53ms | 601.99ms |
| Store | 346.33ms | 433.94ms | 695.19ms |
| Category store | 351.05ms | 468.84ms | 714.46ms |
| Product detail | 39.17ms | 50.61ms | 258.3ms |

Slowest page type by p95:

- Homepage, `473.12ms`.

Interpretation:

- Small public-read load passed cleanly.
- No backend 429 evidence was provided for this small run.

## Medium Result

Profile:

- `50 -> 100 -> 250` VUs.

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| k6-visible 429 responses | 0 |
| HTTP requests | 8,358 |
| Iterations | 2,089 |
| Overall p95 | 6.18s |
| Overall p99 | 8.34s |
| Max latency | 10.62s |
| Result | Failed latency thresholds |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 7.98s | 9.1s | 10.62s |
| Store | 5.64s | 8.29s | 10.17s |
| Category store | 5.55s | 8.22s | 10.61s |
| Product detail | 1.39s | 1.74s | 1.9s |

Thresholds crossed:

- `http_req_duration`.
- `homepage_duration`.
- `store_duration`.
- `category_store_duration`.

Thresholds passed:

- `checks`.
- `http_req_failed`.
- `http_429_responses` from the frontend k6 perspective.
- `product_detail_duration`.

Slowest page type by p95:

- Homepage, `7.98s`.

## Backend 429 Attribution

Confirmed from backend logs:

- The public-read limiter bucket reached `ratelimit-remaining: 0`.
- Backend returned `429 Too Many Requests` for public read endpoints during the medium run.
- Visible affected endpoints included:
  - `/api/v1/homepage/full`
  - `/api/v1/products?page=1&limit=12`
  - `/api/v1/products?page=1&limit=12&category=acs`
  - `/api/v1/categories`
- Visible backend 429 response times were low, around `66ms` to `104ms`.
- `ratelimit-policy` showed the public-read bucket as `10000;w=900`.

Confirmed from frontend logs:

- Next.js SSR received backend `ApiError` responses with status `429`.
- The frontend logged repeated:
  - `Error fetching store data: Error [ApiError]: Too many public browsing requests. Please try again later.`
  - `Error fetching homepage aggregate data: Error [ApiError]: Too many public browsing requests. Please try again later.`

Important correction:

- k6 reported `http_429_responses = 0` because it requested frontend HTML pages.
- The frontend caught backend 429 errors and still returned HTML `200` responses with fallback behavior.
- Therefore, k6's frontend-only 429 counter did not expose backend API 429s.

## Bottleneck Attribution

Confirmed first bottleneck under the local medium run:

- Public-read rate-limit bucket exhaustion during SSR-driven public browsing.

Evidence:

- Backend logs showed `429` responses with `ratelimit-remaining: 0`.
- Frontend logs showed SSR fetches receiving backend `429` errors.
- k6 page latency crossed thresholds while k6-visible HTTP failures stayed at `0%`.
- The frontend fallback behavior masked backend 429s from the frontend page-level k6 status checks.

Confirmed not the primary evidence from the pasted logs:

- Backend 429 responses were fast in the visible snippets, so the pasted 429 log lines themselves do not prove slow database queries.
- No pasted Redis error, cache JSON parse error, failed cache set/delete, PostgreSQL slow query, or event-loop delay log was provided.

Suspected but not proven:

- Next.js SSR pressure may amplify backend public-read requests during medium load.
- Local CPU pressure may contribute because k6, frontend, backend, PostgreSQL, and Redis run on the same machine.
- Cache misses or cache expiry could contribute to the long tail, but cache hit/miss summaries were not included in the pasted logs.
- Database connection pressure or slow queries could still contribute outside the visible 429 snippets, but no direct evidence was provided.

## What This Means

The small profile is healthy locally.

The medium profile is not healthy yet. It does not fail from the browser-facing k6 HTTP perspective, but backend public-read 429s are occurring and are hidden by frontend fallback rendering.

This means the current frontend-page k6 profile is useful for user-facing page latency, but insufficient by itself for backend public-read 429 detection.

## What This Does Not Prove

This does not prove:

- The app supports 1,000-5,000 concurrent users.
- Production will fail at 250 VUs.
- PostgreSQL is the first bottleneck.
- Redis is the first bottleneck.
- Rate limits should be increased without a separate abuse and infrastructure review.

## Recommended Next Targeted Phase

Before changing limits or optimizing queries, add measurement that makes backend public-read failures visible in the load test result.

Recommended next phase:

- Add a backend public-read API validation profile or extend k6 checks so backend 429s cannot be hidden behind frontend fallback HTML.
- Record backend status counts by endpoint during medium runs.
- Keep sensitive routes out of public-read load tests.
- Re-run small and medium with `PERF_LOGGING_ENABLED=true`.
- Only after that, evaluate whether the right fix is public-read limit tuning, CDN/WAF controls, further SSR fan-out reduction, cache tuning, or infrastructure scaling.

Staging remains required before larger claims:

- Provider-approved `250 -> 500` VU public-read test.
- Managed PostgreSQL.
- Managed Redis.
- Frontend/backend production builds.
- Backend route timing, frontend SSR timing, Redis metrics, PostgreSQL metrics, host CPU/event-loop metrics, and 429 status counts.
- No real customer/payment testing.

