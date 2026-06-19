# k6 Performance Tests

This folder contains read-only k6 tests for ElecSHOP API performance and stability.

k6 complements Playwright. Playwright verifies real browser behavior for flows such as checkout. k6 checks API response time, error rate, and stability under modest local or staging traffic.

These tests must not be run against production without explicit permission.

## Install k6

Windows:

```powershell
winget install k6 --source winget
```

Verify:

```powershell
k6 version
```

Linux/macOS installation options are documented at:

```text
https://grafana.com/docs/k6/latest/set-up/install-k6/
```

## Safe Targets

Safe default targets:

- local backend from `cd backend && npm run dev`
- local Docker backend from `docker compose --env-file .env.docker up --build`
- staging, only with permission and test data

Unsafe target:

- real production, unless the owner explicitly approves the test window, load profile, and target URL

The scripts default to:

```text
http://localhost:5000
```

If `BASE_URL` is not localhost or another local host, the scripts print a safety warning.

## Start the Backend Locally

Backend dev server:

```powershell
cd backend
npm run dev
```

Docker stack:

```powershell
docker compose --env-file .env.docker up --build
```

Docker may expose the backend on `http://localhost:5000` or `http://localhost:5001` depending on `BACKEND_PORT`.

## Smoke Test

The smoke test is a fast sanity/performance check. It covers:

- `GET /api/health`
- `GET /api/v1/products?limit=12&sort=newest`
- `GET /api/v1/products/:slug` when at least one product exists

Run with the default backend URL:

```powershell
k6 run load-tests/k6/smoke.js
```

Run against Docker backend port `5001`:

```powershell
$env:BASE_URL="http://localhost:5001"; k6 run load-tests/k6/smoke.js
```

Git Bash:

```bash
BASE_URL="http://localhost:5001" k6 run load-tests/k6/smoke.js
```

Bash:

```bash
BASE_URL="http://localhost:5001" k6 run load-tests/k6/smoke.js
```

## API Read Load Test

The read-load test is a modest public browsing test. It covers:

- `GET /api/health`
- `GET /api/v1/homepage`
- `GET /api/v1/products?limit=12&sort=newest`
- `GET /api/v1/products/:slug` when at least one product exists
- `GET /api/v1/categories`
- `GET /api/v1/brands`

Run:

```powershell
k6 run load-tests/k6/api-read-load.js
```

Override the target URL:

```powershell
$env:BASE_URL="http://localhost:5001"; k6 run load-tests/k6/api-read-load.js
```

Override the default load:

```powershell
$env:K6_VUS="5"; $env:K6_DURATION="20s"; k6 run load-tests/k6/api-read-load.js
```

Git Bash or bash:

```bash
BASE_URL="http://localhost:5001" K6_VUS="5" K6_DURATION="20s" k6 run load-tests/k6/api-read-load.js
```

## Website Public-Read Load Tests

The website load tests are read-only public browsing tests for frontend pages. They cover:

- `GET /`
- `GET /store`
- `GET /store?category=:slug` when at least one category exists
- `GET /store/:slug` when at least one product exists

They do not include login, cart mutation, checkout, admin, uploads, reviews, or other mutating flows.

Important limitation:

- Website tests prove the rendered frontend pages returned acceptable HTML responses.
- Website tests do not prove the backend public APIs avoided `429` responses, because frontend SSR can catch backend API errors and still return fallback HTML with status `200`.
- Medium and staging validation must pair website tests with `api-public-read.js` so backend public-read 429s are visible.

They use:

- `FRONTEND_URL` for the Next.js website, defaulting to `http://localhost:3000`
- `BASE_URL` for the backend API used during setup, defaulting to `http://localhost:5000`

The scripts report the normal k6 HTTP metrics plus:

- p50, p95, p99, and max through `summaryTrendStats`
- `homepage_duration`
- `store_duration`
- `category_store_duration`
- `product_detail_duration`
- `http_429_responses`
- `rate_limit_remaining` when the response exposes rate-limit headers

### Smoke Website Test: 1 -> 2 -> 5 VUs

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-smoke.js
```

Equivalent generic command:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; $env:K6_PROFILE="smoke"; k6 run load-tests/k6/website-load.js
```

### Small Production-Style Website Test: 5 -> 10 -> 25 VUs

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-small.js
```

Equivalent generic command:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; $env:K6_PROFILE="small"; k6 run load-tests/k6/website-load.js
```

### Medium Stress Website Test: 50 -> 100 -> 250 VUs

Run this only when the local machine has enough CPU/RAM and after the smoke and small profiles are clean:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-medium.js
```

Equivalent generic command:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; $env:K6_PROFILE="medium"; k6 run load-tests/k6/website-load.js
```

### Staging-Only Large Tests

Do not run 1,000+ VU tests locally. Large 500, 1,000, 5,000, and peak tests belong on approved staging infrastructure with production-like database, Redis, CDN, and backend capacity.

Example staging-only shape, not a default local command:

```text
500 -> 1000 VUs or 1000 -> 2500 -> 5000 VUs on approved staging only
```

## Backend API Public-Read Tests

`api-public-read.js` hits safe backend public-read APIs directly. It exists to make backend public-read failures visible when frontend SSR fallback behavior would otherwise hide them from website-page k6 checks.

Covered endpoints:

- `GET /api/v1/homepage/full`
- `GET /api/v1/products?limit=12&sort=newest`
- `GET /api/v1/categories`
- `GET /api/v1/brands`
- `GET /api/v1/carousel`
- `GET /api/v1/products/:slug` when at least one product slug is discovered
- `GET /api/v1/products?limit=12&category=:slug` when at least one category slug is discovered

Excluded endpoints:

- auth
- cart
- checkout/orders
- admin
- uploads
- review/question mutations
- user/private endpoints

The script uses:

- `API_BASE_URL` for the backend API, defaulting to `http://localhost:5000`
- `BASE_URL` as a fallback if `API_BASE_URL` is not set
- `PROFILE=smoke`, `PROFILE=small`, or `PROFILE=medium`

Metrics include:

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

### Smoke Backend API Test: 1 -> 2 -> 5 VUs

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="smoke"; k6 run load-tests/k6/api-public-read.js
```

### Small Backend API Test: 5 -> 10 -> 25 VUs

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="small"; k6 run load-tests/k6/api-public-read.js
```

### Medium Backend API Test: 50 -> 100 -> 250 VUs

Run this only when the local machine has enough CPU/RAM and after smoke and small pass:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="medium"; k6 run load-tests/k6/api-public-read.js
```

Backend API thresholds:

- `http_req_failed` rate must be lower than `1%`
- `checks` pass rate must be higher than `95%`
- `backend_http_429_responses` must be `0`
- `backend_public_api_duration` p95 must be lower than `1.5s` for smoke/small
- `backend_public_api_duration` p95 must be lower than `2.0s` for medium

## Thresholds

Smoke test thresholds:

- `http_req_failed` rate must be lower than `1%`
- `http_req_duration` p95 must be lower than `800ms`
- `checks` pass rate must be higher than `95%`

Read-load thresholds:

- `http_req_failed` rate must be lower than `1%`
- `http_req_duration` p95 must be lower than `1000ms`
- `checks` pass rate must be higher than `95%`

Website load thresholds:

- `http_req_failed` rate must be lower than `1%`
- `http_req_duration` p95 must be lower than `1500ms`
- `checks` pass rate must be higher than `95%`

If a threshold fails, k6 exits with a non-zero status code. That is useful for future CI/staging gates, but these tests are not required in normal CI yet.

## Empty Catalog Behavior

If the product list is empty, the tests still check health and product list behavior. Product detail requests are skipped with a warning instead of failing the whole run only because no product exists.

## Checkout and Order Load Tests

Mutating checkout/order tests are not enabled by default and were not added in this phase.

Any future checkout smoke/load script must:

- live separately from read-only tests
- require `ALLOW_MUTATING_TESTS=true`
- target local or staging only
- use test data only
- clearly warn that it can create orders
- respect CSRF/session protections instead of bypassing security

## GitHub Actions

No k6 GitHub Actions workflow was added in this phase.

Add a manual `workflow_dispatch` workflow later only after there is a stable test seed or staging backend. Do not make k6 required on every pull request until the target environment and data are reliable.
