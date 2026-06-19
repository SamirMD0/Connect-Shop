# Performance Phase I Results

> Date: 2026-06-17
> Scope: Backend public-read API k6 visibility for hidden 429 responses.
> Status: Implemented measurement script and documentation. No rate limits, caching behavior, database queries, frontend fallback behavior, auth, checkout, cart, orders, admin, uploads, reviews, CSRF, validation, sessions, or user logic were changed.

## Why Phase I Exists

Phase H found a measurement gap:

- k6 website tests requested frontend pages.
- Frontend SSR requested backend public APIs.
- Backend public APIs returned `429 Too Many Requests` under medium load.
- The frontend caught backend `ApiError` responses and rendered fallback HTML with status `200`.
- k6 saw the frontend `200` response and counted the page request as successful.

That means frontend-page k6 tests are useful for browser-facing page behavior, but they cannot prove backend public APIs avoided 429s.

Phase I makes backend public-read failures visible by adding a backend API-level k6 script.

## New Script

Created:

```text
load-tests/k6/api-public-read.js
```

Default backend target:

```text
http://localhost:5000
```

Override:

```powershell
$env:API_BASE_URL="http://localhost:5000"
```

`BASE_URL` is also supported as a fallback if `API_BASE_URL` is not set.

## Profiles

The script supports:

| Profile | Shape |
| --- | --- |
| `smoke` | `1 -> 2 -> 5` VUs |
| `small` | `5 -> 10 -> 25` VUs |
| `medium` | `50 -> 100 -> 250` VUs |

Select a profile with:

```powershell
$env:PROFILE="smoke"
```

`K6_PROFILE` is also supported as a fallback.

## Endpoints Tested

Always tested:

- `GET /api/v1/homepage/full`
- `GET /api/v1/products?limit=12&sort=newest`
- `GET /api/v1/categories`
- `GET /api/v1/brands`
- `GET /api/v1/carousel`

Conditionally tested when valid data exists:

- `GET /api/v1/products/:slug`
- `GET /api/v1/products?limit=12&category=:slug`

Excluded from this script:

- auth
- cart
- checkout/orders
- admin
- uploads
- review/question mutations
- user/private endpoints

## Metrics

Custom metrics:

- `backend_http_429_responses`
- `backend_public_api_duration`
- `backend_homepage_full_duration`
- `backend_products_duration`
- `backend_categories_duration`
- `backend_brands_duration`
- `backend_carousel_duration`
- `backend_product_detail_duration`
- `backend_category_products_duration`
- `rate_limit_remaining`
- `rate_limit_limit`
- `rate_limit_reset`

Header metrics are recorded only when the backend exposes numeric rate-limit headers.

## Pass/Fail Rules

Smoke and small:

- failed requests `< 1%`
- backend 429 count `= 0`
- public API overall p95 `< 1.5s`
- checks `> 95%`

Medium:

- failed requests `< 1%`
- backend 429 count `= 0`
- public API overall p95 `< 2.0s`
- checks `> 95%`

If medium fails because backend 429s appear, the result must be reported as a backend public-read limiter failure. Do not treat frontend website `200` responses as proof that backend APIs passed.

## Commands

Smoke:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="smoke"; k6 run load-tests/k6/api-public-read.js
```

Small:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="small"; k6 run load-tests/k6/api-public-read.js
```

Medium:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="medium"; k6 run load-tests/k6/api-public-read.js
```

Website medium pairing:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-medium.js
```

## Expected Validation Pairing

For medium and staging validation, run both:

1. Backend API public-read test.
2. Frontend website public-read test.

Interpretation:

- Backend API test proves backend public APIs did or did not return 429s.
- Frontend website test proves rendered pages did or did not return acceptable HTML responses.
- A frontend website pass does not override backend API 429 failures.

## Results

Local services were available:

| Service | Result |
| --- | --- |
| Backend `GET /api/health` | `200` |
| Frontend `GET /` | `200` |
| k6 | `v2.0.0` |

### API Smoke

Command:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="smoke"; k6 run load-tests/k6/api-public-read.js
```

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| Backend 429 responses | 0 |
| Public API p95 | 187.65ms |
| Public API p99 | 254.49ms |
| Max latency | 308.82ms |
| Lowest `rate_limit_remaining` | 9585 |
| Result | Passed |

Slowest endpoint by p95:

- `backend_homepage_full_duration`, p95 `244.23ms`.

### API Small

Command:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="small"; k6 run load-tests/k6/api-public-read.js
```

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| Backend 429 responses | 0 |
| Public API p95 | 240.68ms |
| Public API p99 | 358.61ms |
| Max latency | 651.47ms |
| Lowest `rate_limit_remaining` | 3339 |
| Result | Passed |

Slowest endpoint by p95:

- `backend_homepage_full_duration`, p95 `315.49ms`.

Observation:

- The public-read bucket still had remaining capacity at the end of small, but dropped from `9585` after smoke to a minimum of `3339` during small. This confirms the script exposes public-read bucket pressure directly.

### API Medium

Command:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="medium"; k6 run load-tests/k6/api-public-read.js
```

Result:

| Metric | Value |
| --- | ---: |
| Checks | 30.81% |
| Failed HTTP requests | 94.66% |
| Backend 429 responses | 59,215 |
| Public API p95 | 330.23ms |
| Public API p99 | 540.07ms |
| Max latency | 2.11s |
| Lowest `rate_limit_remaining` | 0 |
| Result | Failed |

Thresholds crossed:

- `backend_http_429_responses`: expected `0`, observed `59,215`.
- `checks`: expected `>95%`, observed `30.81%`.
- `http_req_failed`: expected `<1%`, observed `94.66%`.

Important interpretation:

- The public API p95 stayed below the medium threshold because most failed responses were fast `429` rejections.
- The medium API profile still failed. Passing latency is not meaningful when the backend is rejecting most requests.
- Phase I successfully made backend public-read 429s visible.

Rate-limit header observations:

- `rate_limit_limit`: `10000`.
- `rate_limit_remaining`: minimum `0`, median `0`.
- `rate_limit_reset`: p95 `614s`.

Slowest endpoint by p95:

- `backend_products_duration`, p95 `358.57ms`.

### Paired Frontend Website Medium

Command:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-medium.js
```

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Frontend failed HTTP requests | 0.04% |
| Frontend-visible 429 responses | 0 |
| Overall p95 | 12.43s |
| Overall p99 | 15.44s |
| Max latency | 16.92s |
| Result | Failed latency thresholds |

Page-level:

| Page type | p95 | p99 | Max |
| --- | ---: | ---: | ---: |
| Homepage | 11.98s | 15.16s | 16.42s |
| Store | 12.96s | 15.61s | 16.92s |

Warnings:

- Product detail page requests were skipped because setup could not discover a product slug.
- Category store page requests were skipped because setup could not discover a category slug.

Interpretation:

- This paired website run happened after the API medium run had exhausted the backend public-read bucket.
- The frontend website run still showed `http_429_responses = 0` at the page boundary.
- This confirms the Phase H/Phase I measurement gap: frontend website tests can hide backend public-read 429s.

## Phase I Conclusion

Backend public-read 429s are now measurable directly through k6.

Current local result:

- API smoke passed.
- API small passed.
- API medium failed because the public-read bucket reached `0` and returned `59,215` backend 429s.
- Paired frontend medium still reported `0` frontend-visible 429s, proving that frontend-page tests alone are insufficient.

The next phase can safely evaluate the public-read limiter strategy, but should still avoid blind tuning. The next work should use these API-level results to decide whether the fix belongs in limiter strategy, SSR/API request reduction, cache/CDN strategy, staging infrastructure, or a combination of those.
