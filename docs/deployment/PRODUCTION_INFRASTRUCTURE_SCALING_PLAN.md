# Production Infrastructure Scaling Plan

> Date: 2026-06-17
> Scope: Phase F production infrastructure scaling plan only.
> Status: Planning implemented. No application code, rate limits, database schema, frontend pages, dependencies, auth, checkout, cart, orders, admin, uploads, reviews, CSRF, sessions, or user data logic were changed.

## Scope Boundary

This document defines the production architecture and validation path needed before any 1,000-5,000 concurrent-user claim can be made.

It does not prove that the current deployment supports 1,000-5,000 concurrent users. Local k6 results are useful for finding bottlenecks, but they are not production-capacity proof.

## Current Performance State

Latest known Phase E validation:

| Test | VUs | Checks | Failed HTTP requests | 429 responses | Overall p95 | Overall p99 | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Smoke | 1 -> 2 -> 5 | 100% | 0% | 0 | 480.17ms | 960.26ms | Passed |
| Small run 1 | 5 -> 10 -> 25 | 100% | 0% | 0 | 1.14s | 2.34s | Passed |
| Small run 2, warm cache | 5 -> 10 -> 25 | 100% | 0% | 0 | 1.05s | 3.97s | Passed |

Warm-cache page-level p95 observations:

| Page type | p95 |
| --- | ---: |
| Homepage | 1.66s |
| Store | 1.54s |
| Category store | 864.13ms |
| Product detail | 36.05ms |

Current interpretation:

- Phase E smoke and small tests passed locally.
- No failed requests and no 429 responses appeared in the latest smoke/small runs.
- Small-test p95 improved from the earlier Phase C.1 result of about 1.57s to 1.14s and 1.05s.
- p99 spikes are still present, especially in the second small run.
- The medium profile was not run after Phase E.
- Local smoke/small success does not prove production support for 1,000-5,000 users.

## Target Architecture

### Frontend

- Run the Next.js frontend as a production build, not `next dev`.
- Use the current standalone output path for container or VM hosting.
- Keep public browser API traffic pointed at the public backend URL.
- Keep server-side internal API traffic pointed at a private/internal backend URL when the platform supports it.
- Serve static Next.js assets through the hosting provider CDN or an edge CDN.
- Scale frontend instances independently from backend instances when using container/VM hosting.

Operational requirements:

- Build command: `cd frontend && npm run build`
- Start command: `cd frontend && PORT=3000 HOSTNAME=0.0.0.0 npm run start`
- Required environment examples: `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`, Sentry variables if enabled.

### Backend API

- Run the Express API as multiple backend replicas behind a load balancer once traffic exceeds a single instance.
- Keep `/api/health` available for platform health checks without depending on exhausted user/public rate-limit buckets.
- Preserve strict rate limits on auth, checkout, cart mutations, admin, uploads, reviews, and other sensitive routes.
- Keep public read routes under a separate finite public-read limiter.
- Use private network connectivity from frontend to backend where available.
- Use process supervision and restart policies from the platform or container orchestrator.

Operational requirements:

- Build command: `cd backend && npm run build`
- Start command: `cd backend && npm start`
- Required environment examples: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `FRONTEND_URL`, OAuth variables, ImageKit variables, Sentry variables if enabled, `DB_STATEMENT_TIMEOUT_MS`.

### PostgreSQL

- Use managed PostgreSQL for production.
- Enable automated backups and point-in-time recovery where available.
- Apply migrations during a controlled deployment window.
- Size maximum connections from the full deployment, not from one backend instance.
- Add PgBouncer or provider connection pooling before scaling backend replicas aggressively.
- Keep query timeout controls enabled.
- Use staging-size data with `EXPLAIN (ANALYZE, BUFFERS)` and `pg_stat_statements` before claiming production scale.
- Consider read replicas only after write consistency requirements and query patterns are clear.

Current constraint:

- The backend pool currently uses `max: 20`. With multiple replicas, total possible database connections can grow quickly. Production sizing must coordinate backend replica count, pool size, PgBouncer settings, and PostgreSQL connection limits.

### Redis

- Use managed Redis or a Redis-compatible provider for production.
- Use Redis for cache-aside public-read caching and rate-limit storage.
- Monitor Redis memory, evictions, latency, connection count, and errors.
- Keep application cache failures non-fatal for public reads.
- Avoid storing private user data in shared public cache keys.
- Define eviction and persistence settings according to provider capabilities.

### Images And Assets

- Serve product and carousel images through ImageKit or another image CDN.
- Do not route high-volume product image delivery through the backend API.
- Use image transformations and resized variants at the CDN edge where possible.
- Monitor image bandwidth, transformation count, cache hit ratio, and slow origin fetches.

### CDN And Edge

- Put static assets behind the frontend hosting CDN or a dedicated CDN.
- Cache immutable Next.js build assets aggressively.
- Cache images at the image CDN edge.
- Use CDN/WAF controls for obvious abusive traffic before it reaches the backend.
- Keep dynamic SSR HTML caching conservative until correctness and invalidation rules are explicitly designed.

### Monitoring And Observability

Required production monitoring:

- Uptime checks for frontend and backend `/api/health`.
- Request rate, p50, p95, p99, max latency, and error rate by route.
- HTTP 429 count by limiter and route group.
- Backend CPU, memory, event-loop delay, and process restarts.
- PostgreSQL CPU, memory, active connections, slow queries, locks, and disk usage.
- Redis latency, memory, evictions, hit/miss indicators where available, and connection errors.
- Frontend SSR/render duration by page type.
- Checkout and order creation error rates.
- Alerting for 5xx spikes, unexpected 429s on public reads, DB connection pressure, Redis failures, and health-check failures.

### Security And Proxy Configuration

- Keep sensitive route protections unchanged.
- Keep CSRF and validation protections unchanged.
- Configure trusted proxy behavior to match the actual hosting/load-balancer topology.
- Do not blindly trust forwarded IP headers from the public internet.
- Keep secrets in the hosting provider secret store.
- Use HTTPS at the edge and between private services where provider support allows it.
- Use WAF/bot controls for scraping and abusive public-read traffic rather than weakening application security limits.

## Scaling Stages

### Stage 0 - Local Development

Purpose:

- Functional validation, smoke testing, and bottleneck discovery.

Typical shape:

- One frontend process.
- One backend process.
- Local PostgreSQL.
- Local Redis.

Limits:

- Local success does not prove production capacity.
- Do not run 1,000+ VU tests locally.

### Stage 1 - Public Demo

Purpose:

- Low-traffic public deployment for manual review and small demos.

Typical shape:

- Managed frontend hosting.
- One backend instance.
- Managed PostgreSQL.
- Managed Redis.
- Image CDN enabled.

Validation:

- Smoke and small public-read k6 profiles.
- Health checks.
- Basic uptime monitoring.

### Stage 2 - Small Production

Purpose:

- Real low-volume ecommerce usage.

Typical shape:

- Frontend CDN/edge hosting.
- One to two backend instances.
- Managed PostgreSQL with backups.
- Managed Redis.
- Image CDN.
- Route-level monitoring and alerts.

Validation:

- Smoke, small, and medium tests in staging before promotion.
- No unexpected public-read 429s.
- Checkout and order creation remain reliable.

### Stage 3 - Real Ecommerce Production

Purpose:

- Higher-volume public traffic with operational expectations.

Typical shape:

- Multiple backend replicas behind a load balancer.
- PgBouncer or provider database pooling.
- Managed PostgreSQL sized for connection and query load.
- Managed Redis with memory and latency monitoring.
- CDN/WAF controls.
- Centralized logs and APM.

Validation:

- Staging 250 -> 500 VU test.
- Staging 500 -> 1,000 VU test.
- Database and Redis metrics reviewed during tests.
- p99 investigation completed for visible spikes.

### Stage 4 - Campaign Or Peak Traffic

Purpose:

- Sales events and traffic spikes up to 5x normal load.

Typical shape:

- Horizontally scaled backend.
- Pre-warmed caches.
- CDN and WAF rules verified.
- Database connection pooling and capacity headroom confirmed.
- Provider limits reviewed before the event.

Validation:

- Production-like 1,000 -> 5,000 VU tests only in safe staging or provider-approved environments.
- 5x peak tests only with explicit provider approval and a rollback plan.
- Checkout path protected and monitored separately.

## Load Testing Plan

### Local Tests

Run only when frontend, backend, PostgreSQL, and Redis are available locally:

```powershell
k6 run load-tests/k6/website-smoke.js
k6 run load-tests/k6/website-small.js
k6 run load-tests/k6/website-medium.js
```

Guidance:

- Smoke and small are the default local profiles.
- Medium is optional and depends on local machine capacity.
- Do not run 1,000+ VU tests locally.

### Staging Tests

Run against production-like staging with managed PostgreSQL, managed Redis, CDN behavior, and backend replicas:

- 250 -> 500 VUs.
- 500 -> 1,000 VUs.

Requirements:

- Use staging data that resembles production shape.
- Watch backend, database, Redis, and frontend metrics during the run.
- Verify public reads, not auth, checkout mutations, admin, uploads, or reviews, unless a separate safe test plan exists.

### Production-Like Tests

Run only in a safe environment with provider approval:

- 1,000 -> 5,000 VUs.
- Peak simulation up to 5x normal traffic.

Requirements:

- Confirm provider load-test policies.
- Confirm rate-limit and WAF rules.
- Confirm rollback and scale-down plan.
- Use synthetic/test data only.
- Do not target real customers or real payment/order flows.

## Pass/Fail Thresholds

Global public-read thresholds:

- Check pass rate: at least 99%.
- Failed HTTP request rate: less than 1%.
- Unexpected HTTP 429 responses on normal public browsing: 0.
- Overall p95: less than 1.5s for smoke/small.
- Overall p95: less than 2.0s for medium.
- p99: tracked and investigated, not ignored.
- Max latency: reviewed for long-tail stalls.

Page-level p95 targets:

| Page type | Target p95 |
| --- | ---: |
| Homepage | < 1.5s in smoke/small, < 2.0s in medium |
| Store | < 1.5s in smoke/small, < 2.0s in medium |
| Category store | < 1.5s in smoke/small, < 2.0s in medium |
| Product detail | < 1.0s in smoke/small, < 1.5s in medium |

Infrastructure thresholds:

- Backend CPU and memory must remain below sustained saturation.
- PostgreSQL active connections must stay below safe limits with headroom.
- Redis must show no sustained connection errors or memory eviction pressure.
- Health checks must remain 200 during normal public-read load.
- Checkout/order telemetry must show no regression during public-read testing.

## p99 Investigation Plan

p99 spikes remain visible after Phase E, so Phase G should investigate the long tail before any larger-capacity claim.

Investigation steps:

1. Capture page-level k6 trends for homepage, store, category, and product detail.
2. Compare cold-cache and warm-cache runs.
3. Add or review backend route timing logs in a non-invasive way before tuning.
4. Review frontend SSR duration and whether stalls happen before or after backend responses.
5. Enable `pg_stat_statements` in staging and inspect slow queries by total time and p99-like behavior.
6. Review PostgreSQL connection usage, locks, and query plans under realistic row counts.
7. Review Redis latency, cache misses, and cache parse/set/delete errors.
8. Watch Node.js CPU, memory, event-loop delay, and garbage collection behavior.
9. Confirm whether k6, frontend, backend, PostgreSQL, and Redis are competing for local resources during local tests.
10. Only tune after the slow layer is identified.

## Deployment Checklist

Before production traffic:

- Confirm environment variables for frontend and backend.
- Confirm `DATABASE_URL` points to managed PostgreSQL.
- Confirm `REDIS_URL` points to managed Redis.
- Confirm `SESSION_SECRET` is strong and stored securely.
- Confirm `FRONTEND_URL` and CORS origins match deployed domains.
- Confirm OAuth callback URLs match deployed domains.
- Confirm ImageKit variables are configured.
- Confirm Sentry or selected monitoring variables are configured.
- Confirm `DB_STATEMENT_TIMEOUT_MS` is set intentionally.
- Confirm trusted proxy settings match the hosting topology.
- Run backend migrations with `cd backend && npm run db:migrate`.
- Run backend build with `cd backend && npm run build`.
- Run frontend build with `cd frontend && npm run build`.
- Verify backend health with `GET /api/health`.
- Verify frontend homepage returns 200.
- Verify Redis is connected and cache failures are not appearing in logs.
- Verify PostgreSQL backups and restore policy.
- Verify CDN/image delivery.
- Verify rollback path for frontend and backend.
- Verify log retention and alert routing.
- Run smoke and small k6 profiles before promotion.

## Cost And Scaling Notes

Exact monthly cost is TBD because it depends on provider choice, region, traffic, image bandwidth, data size, Redis memory, database tier, monitoring retention, and replica counts.

Cost categories:

- Frontend hosting and CDN bandwidth.
- Backend instance count and CPU/memory tier.
- Managed PostgreSQL tier, storage, backups, and connection pooling.
- Managed Redis tier and memory.
- Image CDN storage, transformations, and bandwidth.
- WAF/security add-ons.
- Monitoring/APM/log retention.
- Domain, TLS, and email/provider add-ons if applicable.

Cost approach:

- Start with the smallest tier that passes smoke/small staging tests.
- Scale backend replicas only after metrics show backend saturation.
- Scale PostgreSQL only after query and connection metrics justify it.
- Scale Redis based on latency, memory, eviction pressure, and rate-limit/cache traffic.
- Re-run k6 after every infrastructure change and document the result.

## Phase G Readiness

Phase G can start as a staging/load-testing planning and validation phase after this document is reviewed.

Phase G should not start by running huge local tests. It should start by defining the staging environment, provider limits, metrics collection, test data, and pass/fail gates. A 1,000-5,000 concurrent-user support claim is not safe until production-like tests pass in an approved environment.
