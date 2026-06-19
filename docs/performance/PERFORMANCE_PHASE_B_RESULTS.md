# Performance Phase B Results

> Date: 2026-06-15
> Scope: Safe public-read rate-limit strategy only.
> Status: Implemented; no caching, API consolidation, frontend API changes, or database query changes were made.

## What Changed

Phase B splits safe public storefront reads out of the lower `generalLimiter` bucket.

The backend now has:

- `generalLimiter`: still protects all non-public-read routes.
- `publicReadLimiter`: protects only safe public storefront `GET` and `HEAD` reads.
- `isPublicReadRequest`: a tested route-classification helper used by both limiters.

This avoids legitimate Next.js SSR fan-out consuming the same general bucket used by broader application traffic.

## Phase B.1 Health Check Adjustment

`GET /api/health` is now mounted before `generalLimiter`.

Reason:

- Deployment platforms, uptime checks, and load balancers use `/api/health` to decide whether the backend process is alive.
- If `/api/health` depends on a user traffic rate-limit bucket, a previous load test or traffic spike can make a healthy backend return `429`.
- A false `429` health check can cause hosting infrastructure to mark the backend unhealthy even though the process can still serve traffic.

The health response remains basic and non-sensitive:

- `success`
- `message`
- `timestamp`
- `environment`

No admin, auth, cart, checkout/order, upload, review, user, or storefront route was moved before the general limiter.

## Public Read Routes Covered

The following safe read paths use `publicReadLimiter`:

- `GET` / `HEAD /api/v1/products`
- `GET` / `HEAD /api/v1/products/*`
- `GET` / `HEAD /api/v1/categories`
- `GET` / `HEAD /api/v1/categories/*`
- `GET` / `HEAD /api/v1/brands`
- `GET` / `HEAD /api/v1/brands/*`
- `GET` / `HEAD /api/v1/carousel`
- `GET` / `HEAD /api/v1/homepage`
- `GET` / `HEAD /api/v1/homepage/full`

Important exclusions:

- `GET /api/v1/carousel/admin` is not classified as public read.
- `POST`, `PATCH`, `PUT`, and `DELETE` are not classified as public read.
- Auth, cart, checkout/order, admin, upload, wishlist mutation, review/question mutation, and user routes are not classified as public read.

## General Limiter Skip Behavior

`generalLimiter` skips only requests that pass `isPublicReadRequest`.

That means:

- Safe storefront reads avoid double limiting.
- Unknown routes still use `generalLimiter`.
- Sensitive routes still use `generalLimiter` plus their existing route-specific limiters where applicable.
- No frontend server IP allowlist was added.
- No blanket public-route bypass was added.

## Limit Choice

Current limits:

- `generalLimiter`: 2,000 requests / 15 minutes in development, 600 / 15 minutes in production.
- `publicReadLimiter`: 10,000 requests / 15 minutes in development, 5,000 / 15 minutes in production.

The production public-read value is higher than the general limiter because one SSR page request can trigger multiple backend reads. It is still finite, IP/keyed by the existing rate-limit behavior, backed by the same Redis-store strategy when available, and does not apply to mutations or private endpoints.

## Sensitive Limiters Preserved

These limiters were not weakened:

- `authLimiter`
- `checkoutLimiter`
- `cartMutationLimiter`
- `wishlistMutationLimiter`
- `reviewMutationLimiter`
- `uploadLimiter`
- `adminReadLimiter`
- `adminMutationLimiter`
- `sensitiveAdminActionLimiter`

## Expected Impact

Phase B should reduce incorrect `429 Too Many Requests` pressure for normal public browsing and Next.js SSR fan-out.

It does not guarantee lower latency by itself. The earlier medium run showed p95 latency around `8.2s`; if a future medium run has no 429s but still has high p95, the remaining bottleneck is likely frontend SSR fan-out, backend/database work, or local machine saturation.

## What Phase B Does Not Solve

Phase B does not:

- Add caching.
- Consolidate homepage API calls.
- Modify frontend API behavior.
- Optimize database queries.
- Add infrastructure scaling.
- Prove support for 1,000-5,000 concurrent users.

## Validation

Backend validation run:

```powershell
cd backend
npm run build
npm test
```

Result:

- `npm run build`: passed.
- `npm test`: passed, `80` tests passed, `0` failed.
- New classifier coverage confirms public read routes are included and auth/cart/orders/admin/users/reviews/mutations are excluded.

Local service check before k6:

- `GET http://localhost:3000/`: `200`
- `GET http://localhost:5000/api/health`: `429` because the general limiter bucket was still exhausted from earlier local stress testing.
- `GET http://localhost:5000/api/v1/products?limit=1`: `200`, confirming public reads were using the separate public-read bucket.

Phase B.1 update:

- `/api/health` was moved before `generalLimiter`, so future health checks do not depend on exhausted user/public traffic buckets.

Public-read k6 validation:

```powershell
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-smoke.js
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-small.js
```

Smoke result:

- Profile: `1 -> 2 -> 5` VUs
- Checks: `100%`
- Failed HTTP requests: `0%`
- p95: `261.11ms`
- p99: `1.06s`
- Max: `1.57s`
- k6 429 counter: `0`

Small result:

- Profile: `5 -> 10 -> 25` VUs
- Checks: `100%`
- Failed HTTP requests: `0%`
- p95: `879.73ms`
- p99: `1.75s`
- Max: `2.38s`
- k6 429 counter: `0`

Medium remains optional locally and was not rerun in this Phase B validation:

```powershell
$env:FRONTEND_URL='http://localhost:3000'; $env:BASE_URL='http://localhost:5000'; k6 run load-tests/k6/website-medium.js
```

## Follow-Up Status

Phase C and Phase D were later implemented:

- Phase D reduced homepage SSR fan-out to `GET /api/v1/homepage/full`.
- Phase C added selected safe public-read caching for the homepage aggregate and public brands.
