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

## Thresholds

Smoke test thresholds:

- `http_req_failed` rate must be lower than `1%`
- `http_req_duration` p95 must be lower than `800ms`
- `checks` pass rate must be higher than `95%`

Read-load thresholds:

- `http_req_failed` rate must be lower than `1%`
- `http_req_duration` p95 must be lower than `1000ms`
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

