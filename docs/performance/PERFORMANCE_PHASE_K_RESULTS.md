# Performance Phase K Results

> Date: 2026-06-19
> Scope: Safe public-read limiter strategy implementation.
> Status: Implemented for route-specific public-read buckets, environment-configurable finite limits, and verified server-only SSR bucket. This does not claim 1,000-5,000 concurrent-user support.

## Scope Boundary

Phase K changed only public-read limiter strategy and SSR request classification.

Unchanged:

- auth limiter
- checkout/order limiter
- cart mutation limiter
- wishlist mutation limiter
- review/question mutation limiter
- upload limiter
- admin read/mutation/sensitive action limiters
- CSRF behavior
- validation behavior
- sessions/user logic
- cache policy and TTL behavior
- database queries
- frontend page design

## Bucket Design

The previous single shared public-read bucket was replaced by route-family buckets:

| Bucket family | Routes |
| --- | --- |
| Homepage | `GET`/`HEAD /api/v1/homepage`, `/api/v1/homepage/full` |
| Product list/search | `GET`/`HEAD /api/v1/products` |
| Product detail | `GET`/`HEAD /api/v1/products/*` except metadata helpers |
| Metadata | `GET`/`HEAD /api/v1/categories*`, `/api/v1/brands*`, `/api/v1/carousel`, `/api/v1/products/categories` |
| Fallback public read | Future safe public homepage subroutes classified by the helper |
| Verified internal SSR | Server-side frontend calls with a valid SSR secret |

Each bucket remains:

- finite
- Redis-backed when Redis is available
- fail-open on Redis store errors, matching existing `passOnStoreError: true`
- observable through standard rate-limit headers
- environment-configurable

## Environment Variables

Added backend env variables:

| Variable | Development/test default | Production default | Notes |
| --- | ---: | ---: | --- |
| `PUBLIC_READ_WINDOW_MS` | `900000` | `900000` | 15 minutes |
| `PUBLIC_READ_HOMEPAGE_LIMIT` | `12000` | `2500` | Homepage aggregate/public homepage data |
| `PUBLIC_READ_PRODUCT_LIST_LIMIT` | `25000` | `3000` | Product list/search |
| `PUBLIC_READ_PRODUCT_DETAIL_LIMIT` | `12000` | `3000` | Product detail |
| `PUBLIC_READ_METADATA_LIMIT` | `40000` | `5000` | Categories, brands, carousel |
| `PUBLIC_READ_FALLBACK_LIMIT` | `10000` | `1500` | Future safe public fallback |
| `PUBLIC_READ_SSR_LIMIT` | `50000` | `10000` | Verified internal SSR calls |
| `INTERNAL_SSR_API_SECRET` | unset | unset | Enables SSR bucket when set on both frontend and backend |

The defaults are intentionally finite. Development/test defaults are sized for local Phase K medium validation with route buckets split. Production defaults remain conservative and must be tuned only with staging/provider metrics.

## SSR Secret Design

Backend:

- Reads `INTERNAL_SSR_API_SECRET`.
- Accepts the header `x-connect-shop-ssr-secret`.
- Uses timing-safe comparison through SHA-256 digests.
- Uses the SSR bucket only when the secret is valid.
- Missing or invalid secrets fall back to normal direct public-read route buckets.
- Does not grant SSR privileges based on IP.
- Does not trust `X-Forwarded-For` for SSR privilege.

Frontend:

- Adds `x-connect-shop-ssr-secret` only from server-side code.
- Reads only `process.env.INTERNAL_SSR_API_SECRET`.
- Does not use a `NEXT_PUBLIC_*` variable for the secret.
- Does not add the header from browser/client requests.
- Does not log the secret.

Safety check:

- Search found no `NEXT_PUBLIC_*SSR` or `NEXT_PUBLIC_*SECRET` secret variable use.

## Why IP Whitelisting Was Rejected

IP whitelisting was not used because frontend SSR traffic may come from provider-owned egress IPs, proxies, or changing infrastructure. A bad whitelist can become a bypass or break legitimate traffic after provider changes.

## Why X-Forwarded-For Was Not Trusted

Signed original-client keying was deliberately not implemented in Phase K. Trusting unverified forwarded headers is risky because clients can spoof those headers unless proxy behavior is fully controlled and verified.

## Tests And Build Validation

Backend:

| Command | Result |
| --- | --- |
| `cd backend && npm run build` | Passed |
| `cd backend && npm test` | Passed, 110 tests |

Backend tests cover:

- Public-read route classification.
- Route-family bucket mapping.
- Unsafe methods excluded from public-read buckets.
- Auth/cart/checkout/admin/upload/review/user routes excluded from public-read privileges.
- Valid SSR secret accepted.
- Missing SSR secret rejected.
- Invalid SSR secret rejected.
- Health route remains before general limiter.
- Existing sensitive limiter tests remain passing.

Frontend:

| Command | Result |
| --- | --- |
| `cd frontend && npm run lint` | Passed |
| `cd frontend && npm run typecheck` | Passed |
| `cd frontend && npm run build` | Timed out twice locally before completion |

Frontend build was not confirmed in this run because the command timed out after extended waits. It should be re-run when the dev server is stopped and `.next` is not being touched by another process.

## API k6 Results

The user ran the API public-read profiles against `http://localhost:5000`.

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
| Public API p95 | 262.66ms |
| Public API p99 | 313.1ms |
| Max latency | 2.81s |
| Lowest `rate_limit_remaining` | 11951 |
| Result | Passed |

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
| Public API p95 | 237.1ms |
| Public API p99 | 311.64ms |
| Max latency | 680.06ms |
| Lowest `rate_limit_remaining` | 11151 |
| Result | Passed |

### API Medium

Command:

```powershell
$env:API_BASE_URL="http://localhost:5000"; $env:PROFILE="medium"; k6 run load-tests/k6/api-public-read.js
```

Result:

| Metric | Value |
| --- | ---: |
| Checks | 100% |
| Failed HTTP requests | 0% |
| Backend 429 responses | 0 |
| Public API p95 | 1.44s |
| Public API p99 | 2.07s |
| Max latency | 2.74s |
| Lowest `rate_limit_remaining` | 10951 |
| Result | Passed API thresholds |

Endpoint note:

- `backend_homepage_full_duration` p95 was `2.16s`, above the medium per-endpoint target used for public API overall p95. This should be watched separately.

## Frontend Website Medium

The frontend website medium result was not provided with this Phase K result set.

Still required:

```powershell
$env:FRONTEND_URL="http://localhost:3000"; $env:BASE_URL="http://localhost:5000"; k6 run load-tests/k6/website-medium.js
```

## Redis Quota Warning

Backend logs showed repeated Redis provider quota errors:

```text
ERR max requests limit exceeded. Limit: 500000, Usage: 500000.
```

Observed effects:

- Cache reads failed and were treated as misses.
- Cache writes failed and were skipped.
- `express-rate-limit` Redis store calls failed and allowed requests because `passOnStoreError: true`.

Interpretation:

- Phase K API medium eliminated backend public-read 429s from the k6 perspective.
- However, the run also exhausted the Redis provider request quota.
- Because the rate-limit Redis store failed open after quota exhaustion, this local run is not a clean proof that the limiter buckets alone will hold under sustained medium/staging traffic.
- This is an infrastructure/Redis capacity bottleneck, not a reason to weaken sensitive limits.

Required before staging confidence:

- Use local Redis or a managed Redis tier that can sustain the intended k6 request volume.
- Monitor Redis request count, errors, latency, and evictions during load tests.
- Re-run API medium and frontend website medium with Redis capacity available.

## Remaining Bottlenecks

- Redis provider request quota was exhausted during local validation.
- Homepage aggregate p95 reached `2.16s` in API medium.
- Frontend website medium still needs to be run after Phase K.
- Frontend production build still needs a clean completion.
- Local tests still do not prove 1,000-5,000 concurrent-user support.

## Phase K Conclusion

Phase K implemented the safe limiter strategy from Phase J:

- route-specific finite public-read buckets
- environment-configurable limits
- verified internal SSR bucket
- no IP whitelisting
- no blind `X-Forwarded-For` trust
- sensitive limiter protections preserved

API smoke, small, and medium passed with 0 backend 429s. The next blocking issue is Redis capacity: the backend logs show the current Redis provider quota was exhausted during load testing, so staging validation should not start until Redis capacity/observability is corrected and the website medium plus frontend build validations complete.

