# Performance Phase L Redis Capacity And Limiter Failure Modes

> Date: 2026-06-19
> Scope: Redis capacity validation guidance and rate-limiter Redis failure-mode hardening.
> Status: Implemented for documentation, limiter failure policy, tests, and user-provided API medium validation. API smoke/small reruns, paired website medium, and frontend production build remain pending.

## Scope Boundary

Phase L did not change public-read route buckets, public-read limits, frontend behavior, database schema, cache TTLs, auth logic, checkout/cart/order logic, admin behavior, uploads, reviews, CSRF, sessions, validation, or user data behavior.

## Redis Provider Finding

Backend logs from Phase K local API medium validation showed the Redis provider was Upstash-compatible and exhausted its request quota:

```text
ERR max requests limit exceeded. Limit: 500000, Usage: 500000.
```

This happened during the Phase K local API medium profile after route-specific public-read buckets were implemented.

Affected systems:

- Public cache reads failed and were treated as cache misses.
- Public cache writes failed and were skipped.
- Redis-backed rate-limit store calls failed.
- `express-rate-limit` allowed requests for fail-open limiters when Redis store calls failed.

Cache impact:

- Cache-aside behavior continued safely.
- No private data was cached.
- Redis failures increased database/backend work because cached reads became misses.

Rate-limiter impact:

- Public-read and broad general limiter store failures are allowed by policy for availability.
- Before Phase L, all Redis-backed limiters used `passOnStoreError: true`, so sensitive limiter store failures could also silently fail open.
- Phase L changed sensitive limiter failure policy so auth, admin, checkout, cart, wishlist, review, upload, and sensitive admin action limiters fail closed when Redis is configured but store commands fail.

## Why Phase K Medium Was Not Clean Proof

Phase K API medium showed 0 backend 429s and passed API thresholds, but Redis quota exhaustion means that result is not a clean limiter-capacity proof.

Reason:

- Once the Redis rate-limit store exceeded provider quota, Redis-backed limiter state could not be reliably read or written.
- Fail-open public-read limiters then allowed traffic instead of enforcing the Redis bucket.
- Therefore, the test demonstrated application availability under Redis quota exhaustion, but not sustained Redis-backed limiter enforcement.

This does not prove staging readiness and does not prove support for 1,000-5,000 concurrent users.

## Local Redis Load-Test Requirement

Repeated local smoke/small/medium k6 runs should use a local Redis instance or a higher-capacity managed Redis tier. Upstash free/low-quota instances are not suitable for repeated local medium load testing because rate-limit and cache traffic can consume provider request quota quickly.

Recommended local Redis command:

```powershell
docker run -d --name elecshop-redis -p 6379:6379 redis:7-alpine
```

If the container already exists:

```powershell
docker start elecshop-redis
```

Run the backend against local Redis:

```powershell
cd D:\User\Documents\PorfolioProjects\ElecSHOP\backend
$env:REDIS_URL="redis://localhost:6379"
npm start
```

Then run backend API load tests from the repository root:

```powershell
cd D:\User\Documents\PorfolioProjects\ElecSHOP
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="smoke"; k6 run load-tests/k6/api-public-read.js
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="small"; k6 run load-tests/k6/api-public-read.js
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="medium"; k6 run load-tests/k6/api-public-read.js
```

Run paired frontend website medium only after frontend/backend are both using the intended local services:

```powershell
cd D:\User\Documents\PorfolioProjects\ElecSHOP
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-medium.js
```

Expected clean-run log condition:

- no Redis quota errors
- no Redis connection errors
- no unexpected backend public-read 429s during normal public-read browsing profiles
- rate-limit headers present on public API responses

## Limiter Failure-Mode Audit

| Limiter | Store when Redis URL is configured | Store when Redis is disabled | Phase L failure policy on Redis store error | Rationale |
| --- | --- | --- | --- | --- |
| `publicReadLimiter` route-family buckets | Redis | express-rate-limit memory store | Fail open | Public anonymous reads should favor storefront availability; failures must log loudly and be monitored. |
| `generalLimiter` | Redis | express-rate-limit memory store | Fail open | Broad safety net for non-public routes. Dedicated sensitive limiters still protect sensitive flows after this layer. |
| `authLimiter` | Redis | express-rate-limit memory store | Fail closed | Brute-force protection must not silently disappear during Redis failure. |
| `checkoutLimiter` | Redis | express-rate-limit memory store | Fail closed | Order creation abuse protection is more important than accepting unlimited attempts during Redis failure. |
| `cartMutationLimiter` | Redis | express-rate-limit memory store | Fail closed | Mutation abuse protection should remain strict when Redis is configured but broken. |
| `wishlistMutationLimiter` | Redis | express-rate-limit memory store | Fail closed | Mutation abuse protection should remain strict when Redis is configured but broken. |
| `reviewMutationLimiter` | Redis | express-rate-limit memory store | Fail closed | Review/question spam protection should remain strict. |
| `uploadLimiter` | Redis | express-rate-limit memory store | Fail closed | Upload abuse can create storage and moderation risk. |
| `adminReadLimiter` | Redis | express-rate-limit memory store | Fail closed | Admin routes should not silently lose protection during Redis failures. |
| `adminMutationLimiter` | Redis | express-rate-limit memory store | Fail closed | Admin write paths must remain protected. |
| `sensitiveAdminActionLimiter` | Redis | express-rate-limit memory store | Fail closed | Sensitive admin/security actions must remain protected. |

When Redis is not configured, express-rate-limit uses its memory store. That is acceptable for local development and single-process demos, but production multi-replica deployments require managed Redis or another shared store.

## Logging Added

Redis rate-limit store errors now log:

- limiter name
- Redis key prefix
- Redis command name
- classified failure kind (`quota_exceeded`, `connection_error`, or `store_error`)
- failure policy (`fail-open` or `fail-closed`)
- whether the request will be allowed or blocked by that policy

Secrets and request bodies are not logged by this failure-path logging.

## Tests Added

Backend tests now verify:

- public-read and general limiters are configured fail-open on Redis store errors
- auth/admin/identity mutation limiters are configured fail-closed on Redis store errors
- Redis store failure logging includes failure policy and quota classification
- existing public-read route-family tests still cover sensitive route exclusions
- existing SSR secret tests still pass

These tests do not require a real Upstash outage.

## Remaining Validation

Clean k6 validation was not completed during the implementation pass because the running backend needed to be restarted against the intended Redis target. The user later provided a backend API medium result that passed against `http://localhost:5000`.

### User-Provided API Medium Result

Command:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="medium"; k6 run load-tests/k6/api-public-read.js
```

Result:

| Metric | Value |
| --- | ---: |
| VUs | 50 -> 100 -> 250 |
| Duration | 3m0s |
| Checks | 100% |
| Failed HTTP requests | 0% |
| Backend 429 responses | 0 |
| Backend public API p95 | 474.45ms |
| Backend public API p99 | 642.21ms |
| Max latency | 1.38s |
| HTTP requests | 57,395 |
| Lowest `rate_limit_remaining` | 3,801 |
| Result | Passed API medium thresholds |

Page/API-level p95:

| Endpoint metric | p95 |
| --- | ---: |
| `backend_homepage_full_duration` | 423.36ms |
| `backend_products_duration` | 534.34ms |
| `backend_categories_duration` | 434.24ms |
| `backend_brands_duration` | 504.43ms |
| `backend_carousel_duration` | 473.61ms |
| `backend_product_detail_duration` | 509.17ms |
| `backend_category_products_duration` | 395.71ms |

Log observation:

- The provided backend log sample showed 200 responses with rate-limit headers.
- A text scan of the provided log sample found no Redis quota errors, Redis connection errors, backend 429 responses, or error logs.
- The exact Redis target was not independently verified from the k6 command alone, so this is recorded as user-provided local API medium validation rather than staging proof.

Still required manual validation:

1. Start or confirm local Redis.
2. Restart backend with `REDIS_URL=redis://localhost:6379`.
3. Confirm backend health returns 200.
4. Run API smoke and API small against the same Redis target for a full Phase L sequence.
5. Run paired website medium if the local machine can handle it.
6. Watch backend logs for Redis quota/connection errors and unexpected backend 429s.
7. Run a clean frontend production build when the dev server is not writing `.next`.

## Phase L Conclusion

Phase L hardens Redis rate-limiter failure behavior and documents the Redis capacity blocker. Public storefront reads remain availability-biased, while sensitive flows no longer silently fail open when Redis is configured but store commands fail.

The user-provided API medium run passed with 0 backend 429s, p95 `474.45ms`, p99 `642.21ms`, and no Redis quota/error strings in the provided log sample. The next step is to complete API smoke/small, paired website medium, and frontend build validation against the intended Redis target. If those pass without Redis store errors or unexpected backend 429s, planning can move toward a provider-approved staging 250 -> 500 VU public-read test. This still does not justify a 1,000-5,000 concurrent-user support claim.
