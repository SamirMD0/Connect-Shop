# Performance and Scalability Plan

> **Status:** Phases A, B, B.1, C, D, E, F, G, H, I, J, K, L, and M are implemented for their documented scopes. Phase N final deployment validation is pending deployed Vercel/Render URLs and provider details. Paired website medium and staging/production-like large-scale validation are not complete.
> **Date:** 2026-06-17
> **Scope:** Performance baseline analysis and scaling roadmap toward the 1,000-5,000 concurrent-user target.

---

## 1. Current Performance Status

Recent k6 testing and Phase H log review established the following current local baseline:

### Smoke Run
* **Traffic:** 1 -> 2 -> 5 VUs
* **Checks:** 100% passed
* **Failed Requests:** 0%
* **429 Responses:** 0
* **Latency (p95):** 656.15ms
* **Latency (p99):** 1.97s
* **Result:** Passed global and page-level smoke thresholds.

### Small Production-Style Run 1
* **Traffic:** 5 -> 10 -> 25 VUs
* **Checks:** 100% passed
* **Failed Requests:** 0%
* **429 Responses:** 0
* **Latency (p95):** 809.64ms
* **Latency (p99):** 1.34s
* **Result:** Passed global and page-level small thresholds.

### Small Production-Style Run 2, Warm Cache
* **Traffic:** 5 -> 10 -> 25 VUs
* **Checks:** 100% passed
* **Failed Requests:** 0%
* **429 Responses:** 0
* **Latency (p95):** 781.1ms
* **Latency (p99):** 1.17s
* **Result:** Passed global and page-level small thresholds.

### Medium Run, Phase G
* **Traffic:** 50 -> 100 -> 250 VUs
* **Checks:** 100% passed
* **Failed Requests:** 0%
* **Frontend-page k6 429 Responses:** 0
* **Latency (p95):** 5.75s
* **Latency (p99):** 7.06s
* **Latency (max):** 10.53s
* **Result:** Completed without frontend-visible correctness failures or frontend-visible 429s, but failed global and page-level latency thresholds. Homepage was the slowest page type by p95 at 6.73s.

### Medium Run, Phase H Manual Validation
* **Traffic:** 50 -> 100 -> 250 VUs
* **Checks:** 100% passed
* **Failed Requests:** 0% from the frontend-page k6 perspective
* **Frontend-page k6 429 Responses:** 0
* **Latency (p95):** 6.18s
* **Latency (p99):** 8.34s
* **Latency (max):** 10.62s
* **Backend log finding:** Public-read endpoints returned `429 Too Many Requests` with `ratelimit-remaining: 0`.
* **Frontend log finding:** Next.js SSR received backend `ApiError` 429 responses and returned fallback HTML, hiding backend 429s from page-level k6 status checks.
* **Result:** Failed latency thresholds and exposed backend public-read limiter exhaustion during medium local load.

### Historical Heavy Run (Before Later Optimizations)
* **Traffic:** 50 -> 100 -> 250 VUs
* **Checks:** 100% passed
* **Failed Requests:** 0% (from the k6 HTTP perspective)
* **Latency (p95):** ~8.2s
* **Latency (max):** ~19s
* **Bottleneck Encountered:** The backend limiter reached `ratelimit-remaining: 0`, and frontend SSR received backend `429 Too Many Requests` responses.
* **Result:** This remains useful historical evidence of the original bottleneck, but it is not the current post-Phase E baseline.

### Summary
The application passes local API smoke, small, and Phase K medium public-read tests with 0 backend 429s after route-specific public-read buckets were added. However, Redis provider request quota was exhausted during Phase K validation, causing cache and fail-open rate-limit store calls to degrade. Phase L keeps public-read/general limiters availability-biased but changes sensitive Redis-backed limiters to fail closed when Redis is configured and store commands fail. Local tests still do not prove production support for 1,000-5,000 concurrent users.

After Phase L hardening, a user-provided backend API medium run completed with 0 backend 429s, 0 failed HTTP requests, p95 `474.45ms`, p99 `642.21ms`, and lowest `rate_limit_remaining` `3,801`. The provided backend log sample showed successful 200 responses with rate-limit headers and no Redis quota/error strings in the scanned sample.

---

## 2. Current Architecture Review

### Traffic Flow
1. **User Browser** requests a page (e.g., `/` or `/store`) from the Next.js Frontend Server.
2. **Next.js SSR** executes server components (e.g., `frontend/src/app/page.tsx`).
3. **Frontend Server** makes internal HTTP requests to the Backend API to fetch data required for rendering.
4. **Backend API** processes requests, fetching data from PostgreSQL or Redis cache.
5. **Next.js** compiles the HTML and sends it back to the User Browser.
6. **Images** are loaded directly by the browser (currently via ImageKit if configured).

### The SSR API Fan-out Problem
Because Next.js pages are dynamically rendered (SSR), a single user request to the homepage triggers a "fan-out" of multiple backend API requests.

For example, `frontend/src/app/page.tsx` executes a `Promise.all` block fetching:
1. `/api/products/featured`
2. `/api/products` (trending)
3. `/api/categories`
4. `/api/brands`
5. `/api/carousel`
6. `/api/homepage`

**1 user homepage load = 6 backend API requests.**
If 100 concurrent users hit the homepage, the backend receives 600 API requests instantly. The current `generalLimiter` is set to 2,000 requests per 15 minutes in development and 600 requests per 15 minutes in production, so public browsing traffic can rapidly exhaust the rate-limit bucket for the frontend server's IP.

Current verified SSR fan-out after Phase D:

| Page | Backend API calls during SSR | Current source |
| --- | ---: | --- |
| Homepage `/` | 1 | `frontend/src/app/page.tsx` via `GET /api/v1/homepage/full` |
| Store `/store` | 2 | `frontend/src/app/store/page.tsx` |
| Category store `/store?category=:slug` | 2 | `frontend/src/app/store/page.tsx` |
| Product detail `/store/:slug` | Up to 3 | `frontend/src/app/store/[slug]/page.tsx` |

Before Phase D, the homepage made 6 backend HTTP requests: featured products, rating-sorted products, categories, brands, carousel, and homepage CMS. Phase D reduced that normal SSR path to one aggregate request.

Product detail can call `/api/products/:slug` once in `generateMetadata`, once in the page render, and `/api/products?category=:slug&limit=5` for related products when the product has a category. `generateStaticParams` also calls `/api/products?limit=100`, but that is build/static-generation work rather than normal per-request SSR fan-out.

---

## 3. Bottleneck Analysis

Based on current architecture, k6 results, and Phase H log review, the primary remaining bottlenecks are:

1. **Redis Provider Request Quota:** Phase K API medium passed with 0 backend 429s, but backend logs showed the Redis provider quota was exhausted (`ERR max requests limit exceeded`). Cache and fail-open public-read/general limiter store operations degraded, so Redis capacity is now a blocker for trustworthy medium/staging validation.
2. **Homepage Aggregate Long Tail:** API medium showed `backend_homepage_full_duration` p95 at `2.16s`, even though overall public API p95 was `1.44s`.
3. **p99 Latency Spikes:** Smoke/small p95 now passes locally, but p99 spikes remain visible and need route-level, database, Redis, and frontend SSR timing investigation before larger capacity claims.
4. **Store and Homepage Long Tail:** Homepage, store, and category store remain the slowest public page types under medium load.
5. **Medium/Staging Unknowns:** The local medium profile needs to be re-run with sufficient Redis capacity and paired frontend website validation before production conclusions.
6. **Database Query Costs:** Product list count queries, search/spec filters, and cold-cache misses remain possible pressure points at larger data sizes.
7. **Database Connection Scaling:** The backend pool is currently sized per process. Multiple backend replicas require coordinated PostgreSQL connection pooling and capacity planning.
8. **Backend Single-Instance Limits:** A single Node.js backend process has finite CPU/event-loop capacity. Production traffic requires horizontal scaling behind a load balancer.
9. **Local Machine Limitations:** Local k6 tests run the load generator, frontend, backend, PostgreSQL, and Redis on the same hardware, so they are useful for bottleneck discovery but not production proof.

Resolved or reduced bottlenecks:

* Safe public storefront reads now use a separate `publicReadLimiter`.
* Phase K split public reads into route-specific finite buckets and added a verified server-only SSR bucket.
* Phase L hardened Redis-backed limiter failure modes so auth/admin/checkout/cart/wishlist/review/upload/sensitive action limiters fail closed on Redis store errors when Redis is configured.
* `/api/health` is mounted before the general limiter so health checks do not depend on exhausted user/public traffic buckets.
* Homepage SSR fan-out was reduced from 6 backend requests to 1 aggregate request.
* Selected safe public reads are cached in Redis.
* Public product listing/detail indexes were added for verified query patterns.

---

## 4. Capacity Target Clarification

### Traffic Definitions
* **Demo Traffic:** 1-10 concurrent users. (Current system passes).
* **Small Business Traffic:** 50-100 concurrent users. (Current system struggles with rate limits and latency).
* **Normal Production Target:** 1,000–5,000 concurrent users.
* **Peak Target:** Up to 5x normal traffic (5,000–25,000 users) during sales/campaigns.

### The Reality of Scale
Code alone cannot guarantee support for 5,000 concurrent users. Achieving these targets requires **infrastructure**:
* **Local k6 tests cannot prove production capacity.** A 250 VU local test is a stress signal for bottlenecks, not a final proof of performance.
* **1,000–5,000 users requires staging/production-like testing** on actual cloud infrastructure.
* **Graceful degradation** is the goal: during a 5x peak, the system should prioritize checkouts and serve cached pages to browsers rather than crashing the database.

---

## 5. Phase Breakdown

To safely reach the production targets, the work must be implemented in the following phases:

### Phase A — Measurement & Baseline
**Status:** Implemented for structured measurement; deeper resource profiling remains a measurement gap.

* Document current k6 results (completed in `docs/PERFORMANCE_BASELINE_RESULTS.md`).
* Add structured smoke/small/medium public-read k6 stage scripts (completed under `load-tests/k6/`).
* Measure exact API fan-out per page (completed for Home, Store, Category Store, and Product Detail).
* Record baseline p95, p99, failed requests, and 429s (supported by updated k6 metrics; known baseline results documented).
* Identify definitively whether the frontend CPU, backend CPU, DB connections, or rate limiter is the precise first point of failure (partially complete: the first observed failure mode is backend rate-limit exhaustion; CPU, DB, and Redis resource metrics still need instrumentation).

### Phase B — Public Read Rate-Limit Plan
**Status:** Implemented for safe public storefront reads.

* Design a separate `publicReadLimiter` with significantly higher thresholds for safe `GET` routes (completed).
* Assign public read routes to this dedicated bucket rather than the `generalLimiter` (completed).
* **Note on IP Whitelisting:** Avoid whitelisting the frontend server's IP. In production environments with CDNs or reverse proxies, IP whitelisting can be dangerous and spoofable without strict infrastructure controls. Rely on route-specific limits and caching instead.
* **Crucial:** Keep strict limits on auth, checkout, cart, admin, upload, and reviews (preserved).
* Document abuse risks (e.g., scraping) and expected production limits (documented in `docs/PERFORMANCE_PHASE_B_RESULTS.md`).

Implemented public-read coverage:

* `GET` / `HEAD /api/v1/products`
* `GET` / `HEAD /api/v1/products/*`
* `GET` / `HEAD /api/v1/categories`
* `GET` / `HEAD /api/v1/categories/*`
* `GET` / `HEAD /api/v1/brands`
* `GET` / `HEAD /api/v1/brands/*`
* `GET` / `HEAD /api/v1/carousel`
* `GET` / `HEAD /api/v1/homepage`

The `generalLimiter` skips only requests classified by `isPublicReadRequest`; it still applies to unknown routes and sensitive/non-public routes. `publicReadLimiter` is finite and environment-aware: 10,000 requests / 15 minutes in development, 5,000 requests / 15 minutes in production.

### Phase C — Public Read Caching Plan
**Status:** Implemented for selected safe public reads; broader cache strategy remains limited by local validation.

* Audit API calls on homepage, store, product, and category pages (completed; see `docs/PERFORMANCE_PHASE_C_RESULTS.md`).
* Identify cacheable public data (products, categories, brands, homepage layout) (completed).
* Identify private/user-specific data that **must not** be cached (cart state, user profile) (completed).
* Add Redis cache-aside behavior for selected heavy public routes (completed for `/api/v1/homepage/full` and public brands).
* Extend cache invalidation strategies for product/category/brand/carousel/homepage writes (completed).

Implemented public cache coverage:

* `homepage:full:v1`, TTL `60s`, used by `GET /api/v1/homepage/full`.
* `brands:public:v1`, TTL `600s`, used by `GET /api/v1/brands`.
* Existing public caches for carousel, homepage CMS, categories, featured products, product details, and short-TTL product lists remain in place.

Private/user-specific data remains excluded from shared public cache keys.

### Phase D — SSR/API Fan-out Reduction
**Status:** Implemented for homepage only.

* Reduce duplicate SSR API calls.
* Consolidated homepage data into `GET /api/v1/homepage/full`, reducing the homepage 6-request fan-out to 1 request.
* Avoid unnecessary server requests during client-side hydration.
* Preserve SEO and data correctness.

Store/category/product detail fan-out remains unchanged and should be handled separately.

### Phase E — Database & Query Performance
**Status:** Implemented for public-read query audit and verified index additions; production-scale query profiling remains pending.

* Identify heavy DB queries using local query audit and EXPLAIN (completed for public storefront reads; `pg_stat_statements` remains future staging work).
* Check and verify indexes for product listing, category filtering, brand filtering, and product details (completed; see `docs/PERFORMANCE_PHASE_E_RESULTS.md`).
* Add justified public-read indexes matching real query patterns (completed in `012_public_read_product_indexes`).
* Review the pagination strategy (offset remains unchanged; count queries remain a known cost).
* Review database connection pool settings (completed; pool max remains hard-coded at 20).
* Document PostgreSQL scaling requirements (partially documented; infrastructure sizing remains Phase F).

### Phase F — Infrastructure Scaling Plan
**Status:** Implemented as a production infrastructure scaling plan. No infrastructure changes were applied.

Documented in `docs/PRODUCTION_INFRASTRUCTURE_SCALING_PLAN.md`:

* **Frontend:** Production Next.js build, standalone/container hosting path, CDN/static asset delivery, and internal API URL strategy.
* **Backend:** Multiple Express replicas behind a load balancer, health-check requirements, and strict preservation of sensitive endpoint limits.
* **Database:** Managed PostgreSQL, backups, migration windows, connection budgeting, and PgBouncer/provider pooling requirements.
* **Redis:** Managed Redis for cache/rate-limit storage, memory/latency monitoring, and fail-open cache behavior.
* **Images/assets:** ImageKit or equivalent image CDN for product/carousel image delivery.
* **CDN/edge:** Static asset caching, image edge caching, WAF/bot controls, and conservative dynamic HTML caching.
* **Monitoring:** Uptime checks, route latency, p95/p99, 429s, DB, Redis, backend process metrics, and checkout/order telemetry.
* **Security/proxy:** Provider-aligned trusted proxy behavior, HTTPS, secrets management, and no weakening of sensitive route protections.
* **Scaling stages:** Local development, public demo, small production, real ecommerce production, and campaign/peak traffic.
* **Load-test safety:** Large 1,000-5,000 VU and 5x peak tests are staging/provider-approved only, not local defaults.

### Phase G — Load Testing Plan
**Status:** Implemented for local public-read validation and p99 investigation documentation. Staging/production-like large-scale validation is not complete.

* **Smoke test:** 1-5 VUs to verify functionality.
* **Small test:** 5 → 10 → 25 VUs to verify baseline optimizations.
* **Medium test:** 50 → 100 → 250 VUs to verify rate limit and cache fixes.
* **Large test (Staging Only):** 500 → 1,000 VUs on production-equivalent infrastructure.
* **Peak/Stress test:** 5x traffic simulation to find the infrastructure breaking point.
* Define thresholds for pass/fail (e.g., HTTP 200 > 99%, p95 < 1.5s).

Current Phase G local result:

* Smoke passed.
* Small cold/semi-cold passed.
* Small warm passed.
* Medium completed with 100% checks, 0 failed frontend-page HTTP requests, and 0 k6-visible 429s, but failed latency thresholds. Phase H later confirmed backend public-read 429s hidden by frontend fallback HTML responses.
* Homepage was the slowest medium page by p95.
* Results are documented in `docs/PERFORMANCE_PHASE_G_RESULTS.md`.

### Phase H — Bottleneck Attribution and Observability
**Status:** Implemented for env-gated instrumentation and local medium-load attribution. No tuning was applied.

Implemented observability:

* Backend request timing, event-loop delay, memory summaries, cache counters, and central DB helper slow-query logging.
* Frontend server-side fetch timing and public page render-prep timing.
* All new instrumentation is disabled unless `PERF_LOGGING_ENABLED=true`.

Phase H manual validation found:

* Small public-read load passed with p95 `394.22ms`, p99 `508.01ms`, 0 failed frontend HTTP requests, and 0 k6-visible 429s.
* Medium public-read load failed latency thresholds with p95 `6.18s`, p99 `8.34s`, and max `10.62s`.
* Backend logs confirmed public-read limiter exhaustion during medium: backend public read endpoints returned `429` with `ratelimit-remaining: 0`.
* Frontend logs confirmed SSR received backend `ApiError` 429 responses.
* k6 still reported 0 page-level 429 responses because the frontend returned fallback HTML `200` responses.

Current Phase H conclusion:

* The confirmed first local medium-load bottleneck is backend public-read rate-limit exhaustion hidden behind frontend fallback rendering.
* The current frontend-page k6 profile is useful for user-facing latency, but insufficient by itself for backend 429 detection.
* Next work should improve backend API status visibility in load tests before changing rate limits, cache behavior, database queries, or infrastructure.

Detailed results are documented in `docs/PERFORMANCE_PHASE_H_RESULTS.md`.

### Phase I — Backend Public-Read API Visibility
**Status:** Implemented for k6 measurement. No rate limits or app behavior were changed.

Implemented:

* Added `load-tests/k6/api-public-read.js`.
* The script targets the backend directly with `API_BASE_URL`, defaulting to `http://localhost:5000`.
* Supported profiles:
  * `PROFILE=smoke`: `1 -> 2 -> 5` VUs.
  * `PROFILE=small`: `5 -> 10 -> 25` VUs.
  * `PROFILE=medium`: `50 -> 100 -> 250` VUs.
* Tested safe public-read APIs:
  * `GET /api/v1/homepage/full`
  * `GET /api/v1/products?limit=12&sort=newest`
  * `GET /api/v1/categories`
  * `GET /api/v1/brands`
  * `GET /api/v1/carousel`
  * `GET /api/v1/products/:slug` when a product slug exists
  * `GET /api/v1/products?limit=12&category=:slug` when a category slug exists
* Excluded auth, cart, checkout/orders, admin, uploads, review/question mutations, and private/user APIs.

New metrics:

* `backend_http_429_responses`
* `backend_public_api_duration`
* endpoint-specific backend public API duration trends
* `rate_limit_remaining`, `rate_limit_limit`, and `rate_limit_reset` when exposed by response headers

New validation rule:

* Medium and staging public-read validation must pair frontend website k6 tests with backend API public-read k6 tests.
* Frontend website tests prove rendered pages return acceptable HTML.
* Backend API tests prove backend public APIs avoided 429s.
* A frontend website pass does not override backend API 429 failures.

Detailed results and commands are documented in `docs/PERFORMANCE_PHASE_I_RESULTS.md`.

Current Phase I local result:

* API smoke passed: public API p95 `187.65ms`, p99 `254.49ms`, 0 backend 429s, minimum `rate_limit_remaining` `9585`.
* API small passed: public API p95 `240.68ms`, p99 `358.61ms`, 0 backend 429s, minimum `rate_limit_remaining` `3339`.
* API medium failed: public API p95 `330.23ms`, p99 `540.07ms`, but `backend_http_429_responses` reached `59,215`, failed HTTP requests reached `94.66%`, and `rate_limit_remaining` reached `0`.
* Paired frontend website medium failed latency thresholds with p95 `12.43s`, but still reported 0 frontend-visible 429s.
* This confirms backend public-read API k6 must be used alongside frontend website k6 during medium and staging validation.

### Phase J — Public-Read Limiter Strategy
**Status:** Implemented as planning only. No rate limits or app behavior were changed.

Phase J documents the strategy for the next implementation phase after Phase I confirmed backend public-read limiter exhaustion.

Key conclusions:

* Browser public traffic, Next.js SSR traffic, and local k6 API traffic are different traffic shapes and should not be treated as identical.
* The current `publicReadLimiter` is one finite shared bucket for all public-read routes per limiter key.
* Current public-read limits are 10,000 requests / 15 minutes in development and 5,000 requests / 15 minutes in production.
* The current bucket uses Redis when available via `rate-limit-redis`, standard rate-limit headers, and the default express-rate-limit keying behavior.
* Phase I smoke used 415 API requests, small used 6,246 API requests, and medium attempted 62,554 API requests.
* Medium failed because it exceeded the available public-read bucket capacity, reaching 59,215 backend 429s and `rate_limit_remaining = 0`.

Recommended Phase K direction:

* Keep all sensitive limiters strict and unchanged.
* Keep public-read limits finite.
* Make public-read limits environment-configurable.
* Add route-specific public-read buckets so one endpoint cannot exhaust all public reads.
* Consider a separate verified internal SSR public-read bucket using a server-only secret.
* Avoid IP whitelisting.
* Avoid blindly trusting `X-Forwarded-For`.
* Avoid one unlimited public bucket.

Detailed strategy is documented in `docs/PERFORMANCE_PHASE_J_PUBLIC_READ_LIMITER_STRATEGY.md`.

### Phase K — Safe Public-Read Limiter Strategy
**Status:** Implemented for route-specific public-read buckets and verified internal SSR bucket. Redis capacity remains a validation blocker.

Implemented:

* Route-specific finite public-read buckets:
  * homepage
  * product list/search
  * product detail
  * metadata
  * fallback public read
* Verified internal SSR public-read bucket using the server-only `INTERNAL_SSR_API_SECRET`.
* Frontend server-side API calls add `x-connect-shop-ssr-secret` only when running on the server and only when the secret is configured.
* Missing or invalid SSR secret falls back to normal direct public-read buckets.
* No IP whitelist was added.
* No signed original-client keying was added.
* `X-Forwarded-For` is not used for SSR privilege.
* Sensitive limiters were preserved.

Environment-configurable variables:

* `PUBLIC_READ_WINDOW_MS`
* `PUBLIC_READ_HOMEPAGE_LIMIT`
* `PUBLIC_READ_PRODUCT_LIST_LIMIT`
* `PUBLIC_READ_PRODUCT_DETAIL_LIMIT`
* `PUBLIC_READ_METADATA_LIMIT`
* `PUBLIC_READ_FALLBACK_LIMIT`
* `PUBLIC_READ_SSR_LIMIT`
* `INTERNAL_SSR_API_SECRET`

Validation:

* Backend build passed.
* Backend tests passed, 110 tests.
* Frontend lint passed.
* Frontend typecheck passed.
* Frontend build timed out locally and still needs a clean completion.
* API smoke passed: p95 `262.66ms`, 0 backend 429s.
* API small passed: p95 `237.1ms`, 0 backend 429s.
* API medium passed API thresholds: p95 `1.44s`, 0 backend 429s.
* Frontend website medium was not provided in the Phase K result set and still needs to be run.

Important caveat:

* Backend logs showed Redis provider request quota exhaustion during validation: `ERR max requests limit exceeded`.
* Because rate-limit Redis store errors fail open, Phase K API medium is not a clean staging-readiness proof until Redis capacity is corrected and re-tested.

Detailed results are documented in `docs/PERFORMANCE_PHASE_K_RESULTS.md`.

### Phase L — Redis Capacity And Limiter Failure Modes
**Status:** Implemented for documentation, limiter failure policy, tests, and user-provided API medium validation. Paired website medium and frontend production build remain pending.

Implemented:

* Documented the Redis provider quota error observed during Phase K: `ERR max requests limit exceeded. Limit: 500000, Usage: 500000`.
* Documented why Phase K medium is not a clean limiter-capacity proof once the Redis rate-limit store exceeded provider quota.
* Added local Redis validation instructions using `redis://localhost:6379`.
* Audited Redis-backed limiter failure modes.
* Kept public-read and general limiters fail-open for availability, with explicit logging.
* Changed auth, checkout, cart mutation, wishlist mutation, review mutation, upload, admin read, admin mutation, and sensitive admin action limiters to fail closed on Redis store errors when Redis is configured.
* Added Redis store error logging with limiter name, Redis prefix, command name, failure kind, and failure policy.
* Added tests covering fail-open/fail-closed limiter policy and quota classification logging.
* Recorded a user-provided API medium pass: 0 backend 429s, 0 failed HTTP requests, p95 `474.45ms`, p99 `642.21ms`, max `1.38s`, and lowest `rate_limit_remaining` `3,801`.

Important caveat:

* If Redis is not configured, express-rate-limit uses its memory store. That is acceptable for local single-process development but not production multi-replica enforcement.
* API smoke/small, paired website medium, and frontend production build should be completed against the intended Redis target before staging confidence.

Detailed results and commands are documented in `docs/PERFORMANCE_PHASE_L_REDIS_CAPACITY.md`.

### Phase M — Production/Demo Deployment Setup
**Status:** Implemented for deployment documentation and environment examples. No production deployment was performed.

Implemented:

* Created `docs/DEPLOYMENT_PRODUCTION_GUIDE.md`.
* Documented Vercel frontend deployment settings.
* Documented Render backend deployment settings.
* Documented managed PostgreSQL setup, migration command, backup/PITR checks, and connection-pool caveats.
* Documented managed Redis setup, local Redis k6 path, quota monitoring, and why free/low-quota Redis is not suitable for repeated medium load tests.
* Documented ImageKit setup.
* Documented custom domain setup for `https://yourdomain.com` and `https://api.yourdomain.com`.
* Documented post-deploy backend/frontend/k6 smoke validation.
* Updated `backend/.env.example` and `frontend/.env.example` with placeholder-only deployment variables.
* Updated `README.md` with deployment and performance documentation links.

Important caveat:

* Phase M does not deploy the application, does not use real credentials, and does not prove 1,000-5,000 concurrent-user support.
* Real deployment validation can begin only after production env values are configured in Vercel/Render and a clean frontend production build is confirmed.

### Phase N — Final Deployment Validation
**Status:** Pending external deployment details and validation results.

Created:

* `docs/PHASE_N_FINAL_DEPLOYMENT_VALIDATION.md`

Pending inputs/results:

* deployed frontend URL
* deployed backend URL
* database provider/status
* Redis provider/tier/status
* ImageKit/CDN status
* backend endpoint checks
* frontend page checks
* COD/manual order validation
* admin validation
* environment/security checks
* k6 smoke results
* optional small results if Redis capacity is confirmed

Important caveat:

* Phase N cannot be marked complete until the deployed Vercel/Render URLs and validation results are recorded. No production-scale support claim is safe from Phase N alone.

---

## 6. Security Rules

During all optimization phases, the following rules are immutable:
* **Do not weaken auth limits** (`authLimiter`).
* **Do not weaken checkout/order limits** (`checkoutLimiter`).
* **Do not weaken cart mutation limits** (`cartMutationLimiter`).
* **Do not weaken admin limits** (`adminMutationLimiter`, `sensitiveAdminActionLimiter`).
* **Do not weaken upload limits** (`uploadLimiter`).
* **Do not disable CSRF** protections.
* **Do not bypass input validation** for the sake of speed.
* **Do not cache private or sensitive data** in shared/public Redis keys.

---

## 7. Recommended Implementation Order

1. **Phase A:** Baseline measurement and structured k6 scripts. Completed for public-read measurement scaffolding.
2. **Phase B:** Public read limiter adjustments (to prevent immediate 429s during SSR). Completed for the current storefront read routes.
3. **Phase D:** SSR fan-out reduction (homepage request consolidation completed; remaining pages still pending).
4. **Phase C:** Public read caching. Completed for selected anonymous public reads.
5. **Phase E:** DB/query performance. Completed for verified public-read indexes; staging-scale profiling remains.
6. **Phase F:** Infrastructure scaling plan documentation. Completed in `docs/PRODUCTION_INFRASTRUCTURE_SCALING_PLAN.md`.
7. **Phase G:** Local public-read k6 validation and p99 investigation documented; staging-safe and production-like validation remains incomplete.
8. **Phase H:** Env-gated observability and bottleneck attribution documented; backend public-read 429 visibility must be improved in tests before tuning.
9. **Phase I:** Backend public-read API k6 visibility added; run paired frontend/backend tests before public-read limiter tuning.
10. **Phase J:** Public-read limiter strategy documented. Phase K implementation can start, but it must not blindly raise one shared public bucket.
11. **Phase K:** Route-specific public-read buckets and verified SSR bucket implemented. Redis capacity, frontend website medium, and frontend build completion remain before staging validation.
12. **Phase L:** Redis capacity blocker documented and Redis-backed sensitive limiter failure modes hardened. User-provided API medium passed after hardening, but paired website medium and frontend production build remain before staging validation.
13. **Phase M:** Production/demo deployment guide and env examples implemented. Real deployment and post-deploy validation remain manual/provider steps.
14. **Phase N:** Final deployment validation record created. Complete it after deployed URLs and provider details are available.

---

## 8. Acceptance Criteria

Progress can only be claimed when:
* **Smoke/small tests:** p95 latency is < 1.5s for local public-read validation.
* **Medium test:** p95 latency is < 2s for local or staging public-read validation.
* **p99:** Long-tail spikes are documented and investigated before larger capacity claims.
* **Rate Limits:** Public pages do not unexpectedly hit 429 errors during normal browsing or SSR.
* **Backend API Visibility:** Medium and staging public-read validation includes backend API-level k6 checks, not only frontend page checks.
* **Limiter Strategy:** Public-read limiter changes preserve finite limits, sensitive route protections, and abuse-risk documentation.
* **Security:** Checkout, auth, admin, and mutation rate limits remain strictly enforced.
* **Builds:** No failed frontend or backend builds (`npm run build` succeeds).
* **Data Integrity:** No private user data is exposed via public caches.
* **Honesty:** k6 results are documented truthfully, acknowledging the limitations of local testing.

---

## 9. Risks

* **Raising limits too much:** Making public read limits too high exposes the backend to aggressive scraping or DDoS.
* **Caching private data:** Accidental caching of user-specific pricing or cart states.
* **DB pool exhaustion:** Opening too many DB connections under load can crash PostgreSQL.
* **Redis failure:** If Redis goes down, the application must fallback gracefully to the database (cache-aside) without cascading failure.
* **False confidence:** Assuming a successful local k6 test means the application can handle 5,000 users in production.
* **Over-engineering:** Building complex caching logic before addressing simple SSR fan-out issues.

---

## 10. Final Recommendation

**What to do next:** 
Use `docs/PHASE_N_FINAL_DEPLOYMENT_VALIDATION.md` to record deployed URLs, backend/frontend checks, COD order validation, admin validation, Redis/log status, and k6 smoke results. After Phase N passes, plan provider-approved 250 -> 500 VU public-read staging testing only if Redis/PostgreSQL capacity is confirmed.

**What not to do yet:** 
Do not claim 1,000-5,000 concurrent-user support yet. Do not run huge 1,000+ VU tests locally. Do not weaken security settings, auth flow, checkout/order protections, admin limits, CSRF, validation, or sensitive mutation rate limits.

**What requires infrastructure:** 
True support for 1,000-5,000 concurrent users requires managed PostgreSQL, managed Redis, CDN/image edge delivery, multiple backend replicas behind a load balancer, connection pooling, monitoring/APM, alerting, and staging/production-like load testing.

**Conclusion:** The codebase now has structured measurement, public-read limiter separation, health-check protection, homepage fan-out reduction, selected public-read caching, verified public-read indexes, a production infrastructure scaling plan, local Phase G public-read validation, Phase H observability, Phase I backend API-level public-read k6 visibility, Phase J public-read limiter strategy, Phase K route-specific limiter implementation, Phase L Redis failure-mode hardening, and Phase M deployment documentation. The user-provided Phase L API medium run passed with 0 backend 429s, but paired frontend website medium, frontend production build, real deployment, and provider-approved staging tests remain. A 1,000-5,000 concurrent-user support claim is not safe until production-like tests pass in an approved environment with adequate Redis/PostgreSQL capacity.
