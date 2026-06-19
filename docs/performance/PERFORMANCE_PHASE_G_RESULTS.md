# Performance Phase G Results

> Date: 2026-06-17
> Scope: Controlled local public-read load validation and p99 investigation notes.
> Status: Local smoke and small validation passed. Local medium completed with 0 failed frontend-page HTTP requests and 0 k6-visible 429s, but failed latency thresholds. Phase H later confirmed backend public-read 429s can be hidden behind frontend fallback HTML responses. No application behavior, rate limits, database schema, infrastructure configs, auth, checkout, cart, orders, admin, uploads, reviews, CSRF, sessions, validation, or user logic were changed.

## Scope Boundary

Phase G measured public storefront browsing only:

- Homepage.
- Store page.
- Category-filtered store page when a valid category slug was discovered.
- Product detail page when a valid product slug was discovered.

Phase G did not test login, cart mutation, checkout, orders, payments, admin, uploads, reviews, or user-specific flows.

This local validation does not prove support for 1,000-5,000 concurrent users.

## Test Script Updates

Updated `load-tests/k6/website-load.js` to enforce page-level thresholds for the existing custom metrics:

- `homepage_duration`
- `store_duration`
- `category_store_duration`
- `product_detail_duration`
- `http_429_responses`

Thresholds:

| Profile | Homepage p95 | Store p95 | Category store p95 | Product detail p95 | 429 responses |
| --- | ---: | ---: | ---: | ---: | ---: |
| Smoke | < 1.5s | < 1.5s | < 1.5s | < 1.0s | 0 |
| Small | < 1.5s | < 1.5s | < 1.5s | < 1.0s | 0 |
| Medium | < 2.0s | < 2.0s | < 2.0s | < 1.5s | 0 |

Global thresholds remain:

- `checks`: `rate>0.95`
- `http_req_failed`: `rate<0.01`
- `http_req_duration`: profile-aware p95 threshold

## Service Status

Checked before k6:

| Service | Check | Result |
| --- | --- | --- |
| Frontend | `GET http://localhost:3000/` | `200`, body returned |
| Backend | `GET http://localhost:5000/api/health` | `200` |
| PostgreSQL | TCP `localhost:5432` | reachable |
| Redis | TCP `localhost:6379` | reachable |
| Backend public cache path | `GET http://localhost:5000/api/v1/homepage/full` | `200`, body returned |

Checked after the medium run:

| Service | Check | Result |
| --- | --- | --- |
| Frontend | `GET http://localhost:3000/` | `200`, body returned |
| Backend | `GET http://localhost:5000/api/health` | `200` |

Redis status:

- Redis TCP port was reachable before testing.
- The backend public homepage aggregate endpoint returned `200`, which exercised a public cached read path.
- Direct backend Redis connection internals were not separately instrumented in this phase.

## k6 Commands

```powershell
k6 run load-tests/k6/website-smoke.js
k6 run load-tests/k6/website-small.js
k6 run load-tests/k6/website-small.js
k6 run load-tests/k6/website-medium.js
```

## Smoke Result

Profile:

- `1 -> 2 -> 5` VUs
- Duration: `55s`

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| 429 responses | 0 |
| HTTP requests | 258 |
| Iterations | 64 |
| Overall p95 | 656.15ms |
| Overall p99 | 1.97s |
| Max latency | 2.41s |
| Result | Passed |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 866.68ms | 1.79s | 1.94s |
| Store | 505.81ms | 1.8s | 2.41s |
| Category store | 616.61ms | 1.39s | 2s |
| Product detail | 10.22ms | 19.98ms | 28.89ms |

Slowest page type by p95:

- Homepage, `866.68ms`.

## Small Run 1 Result

Profile:

- `5 -> 10 -> 25` VUs
- Duration: `3m`

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| 429 responses | 0 |
| HTTP requests | 3,678 |
| Iterations | 919 |
| Overall p95 | 809.64ms |
| Overall p99 | 1.34s |
| Max latency | 2.46s |
| Result | Passed |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 979ms | 1.39s | 2s |
| Store | 1.01s | 1.62s | 2.46s |
| Category store | 745.48ms | 1.1s | 1.99s |
| Product detail | 40.06ms | 61.36ms | 94.25ms |

Slowest page type by p95:

- Store, `1.01s`.

## Small Run 2 Warm Result

Profile:

- `5 -> 10 -> 25` VUs
- Duration: `3m`

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| 429 responses | 0 |
| HTTP requests | 3,738 |
| Iterations | 934 |
| Overall p95 | 781.1ms |
| Overall p99 | 1.17s |
| Max latency | 3.64s |
| Result | Passed |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 1.07s | 1.72s | 3.64s |
| Store | 844.74ms | 1.11s | 3.39s |
| Category store | 542.49ms | 799.63ms | 1.23s |
| Product detail | 43.24ms | 73.01ms | 112.46ms |

Slowest page type by p95:

- Homepage, `1.07s`.

## Medium Result

Profile:

- `50 -> 100 -> 250` VUs
- Duration: `3m`

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| k6-visible 429 responses | 0 |
| HTTP requests | 9,718 |
| Iterations | 2,429 |
| Overall p95 | 5.75s |
| Overall p99 | 7.06s |
| Max latency | 10.53s |
| Result | Failed latency thresholds |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 6.73s | 8.93s | 10.53s |
| Store | 4.34s | 5.3s | 7.31s |
| Category store | 4.7s | 7.22s | 8.82s |
| Product detail | 1.28s | 1.78s | 1.82s |

Thresholds crossed:

- `http_req_duration`: p95 `5.75s`, target `<2.0s`.
- `homepage_duration`: p95 `6.73s`, target `<2.0s`.
- `store_duration`: p95 `4.34s`, target `<2.0s`.
- `category_store_duration`: p95 `4.7s`, target `<2.0s`.

Thresholds passed:

- `checks`: `100%`.
- `http_req_failed`: `0%`.
- `http_429_responses`: `0`.
- `product_detail_duration`: p95 `1.28s`, target `<1.5s`.

Slowest page type by p95:

- Homepage, `6.73s`.

Interpretation:

- Medium did not fail correctness checks.
- Medium did not show 429s from the frontend-page k6 perspective.
- Medium did expose local latency saturation on SSR-heavy public pages.
- This local result is a bottleneck signal, not production-scale proof.

Phase H correction:

- Later Phase H log review confirmed backend public-read endpoints did return `429 Too Many Requests` during a medium run while the frontend still returned HTML `200` responses.
- Therefore, the Phase G `0` value means only that k6 did not see 429s at the frontend page boundary.

## p99 Investigation Notes

Confirmed:

- Smoke and small p95 thresholds passed with 0 failed HTTP requests and no k6-visible 429s.
- Medium completed with 0 failed frontend-page HTTP requests and no k6-visible 429s, but page-level p95 and p99 latency rose sharply.
- Phase H later confirmed backend public-read 429s can be hidden by frontend fallback rendering.
- Backend health and frontend homepage still returned `200` after medium completed.
- Product detail remained much faster than homepage/store/category during medium, suggesting the slow path is not uniform across all pages.
- Homepage was the slowest medium page by p95 and p99.

Suspected, not confirmed:

- Frontend SSR pressure is likely part of the medium bottleneck because k6 requests hit rendered Next.js pages, not only backend JSON APIs.
- Local CPU or event-loop pressure is likely part of the medium bottleneck because k6, frontend, backend, PostgreSQL, and Redis were competing on the same local machine.
- Cache expiry or cold misses may contribute to long-tail homepage/store/category latency, but cache hit/miss metrics were not captured in this phase.
- PostgreSQL query pressure may contribute under medium load, especially product list count and category/store listing queries, but `pg_stat_statements`, connection counts, and slow-query logs were not captured in this phase.
- Redis latency/errors were not observed directly, but Redis internal latency metrics were not captured.

Not proven:

- This does not prove that production will fail at 250 VUs.
- This does not prove that the backend database is the first bottleneck.
- This does not prove support for 1,000-5,000 concurrent users.

## Log Notes

Available local log files found:

- `frontend/.next-dev-phase5.err.log`
- `frontend/.next-dev-phase5.out.log`
- `frontend/debug.log`

Observed in available frontend log tails:

- A Google Fonts network `EACCES` fallback warning.
- A Lit dev-mode warning.
- Older `/store` dev-server timings.

Limitations:

- These log files appear to be local/dev artifacts and were not sufficient to confirm current backend, Redis, or PostgreSQL warnings during the k6 run.
- Backend terminal logs were not available through this process.
- No Redis, PostgreSQL, or backend application error was confirmed from accessible logs.

## Bottleneck Summary

Current local bottleneck:

- SSR-heavy public page rendering under the medium profile.

Evidence:

- Medium public page p95 values exceeded thresholds: homepage `6.73s`, category `4.7s`, store `4.34s`.
- Product detail p95 remained under the medium product-detail threshold at `1.28s`.
- Correctness checks stayed at `100%`, frontend-page failed HTTP requests stayed at `0%`, and k6-visible 429s stayed at `0`.

Recommended next targeted phase:

- Staging-oriented p99 investigation with real resource metrics.
- Capture frontend SSR timing, backend route timing, PostgreSQL `pg_stat_statements`, DB connection usage, Redis latency/cache hit behavior, and host CPU/event-loop pressure during medium/staging profiles.
- Do not implement broad optimization until the slow layer is confirmed.

## Staging Test Plan

Next staging steps:

1. Prepare a staging environment with managed PostgreSQL, managed Redis, frontend production build, backend production build, and production-like environment variables.
2. Confirm provider load-test approval and rate/bandwidth limits before running tests.
3. Confirm rollback and scale-down plan.
4. Run staging public-read test: `250 -> 500` VUs.
5. If stable and approved, run staging public-read test: `500 -> 1,000` VUs.
6. Do not include real customer data, real payments, real checkout/order flows, admin actions, uploads, reviews, or user-specific mutation flows.
7. Capture required metrics during every staging run:
   - Frontend SSR duration by page type.
   - Backend route duration by endpoint.
   - HTTP status counts, especially 429 and 5xx.
   - PostgreSQL CPU, memory, active connections, slow queries, locks, and query plans.
   - Redis latency, memory, evictions, connection count, and cache/rate-limit errors.
   - Backend CPU, memory, event-loop delay, and process restarts.
   - CDN/WAF logs if enabled.
8. Define pass/fail before each run and document results without treating local tests as production proof.

## Validation

No backend/frontend build was required because only docs and k6 scripts were changed.

No application code was changed.
