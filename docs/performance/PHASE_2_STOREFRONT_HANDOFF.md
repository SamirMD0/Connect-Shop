# Phase 2 storefront waits and homepage work

Base remains main at 6d0d50815c82decb49727a5dc52c3d92920c7aee on SamirMD0/Connect-Shop.
Phase 1 local changes and the untracked frontend instruction files were preserved.
No services, migrations, database writes, deployments or pushes were performed.

## Behavior and configuration

| Setting | Default | Scope |
| --- | --- | --- |
| NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS | 5000 ms | Catalog GET/HEAD fetch plus body parsing; invalid/nonpositive values fall back to 5000; capped at 30000 |
| REDIS_CACHE_TIMEOUT_MS | 250 ms | Each public-cache GET, SETEX and corrupt-JSON cleanup |
| HOMEPAGE_OPTIONAL_TIMEOUT_MS | 1200 ms | Each optional aggregate section and the legacy CMS request; CMS collection/block resolution uses half this budget |

Rebuild the frontend after changing its NEXT_PUBLIC setting. Backend timeout settings
must be positive finite integers. Budgets are per operation, not a backend-wide HTTP
request deadline. Sequential cache operations can consume multiple budgets; the frontend
catalog deadline remains the outer loading bound, excluding compilation and rendering.
Timers depend on a responsive JavaScript event loop.

Essential aggregate sections (`featuredProducts`, `trendingProducts`, `categories`)
deliberately retain `DB_STATEMENT_TIMEOUT_MS` (default 10000 ms) as their database
statement bound, without an additional section deadline. A stalled statement may
therefore take up to 10 seconds to fail; pool acquisition, sequential statements and
cache waits can add time, so this is not a total aggregate-response SLA. Direct
connections use PostgreSQL statement cancellation; transaction-mode pooled endpoints
use the driver's query timeout. The frontend's default 5-second catalog deadline can
show `StorefrontUnavailable` before the backend settles. Changing the database timeout
changes this bound.

Only explicitly matched public products/categories/brands/carousel/homepage GET/HEAD routes enter the
frontend policy. Native fetch receives an AbortSignal, including during body consumption;
caller cancellation is preserved. There is no automatic request retry. Authentication,
admin requests, cart, checkout, orders and every write remain outside this policy.

The homepage displays a server-rendered unavailable state and a Retry button if the
aggregate rejects or reports failure in featured products, trending products or categories.
Successful empty results remain valid empty catalogs. Brands, carousel and CMS can fail
independently. Store listings retain products if optional categories fail. Product-detail
outages use the retry state; actual API 404s still use notFound. Product metadata and page
loading share a request-local React promise, with no shared authenticated-data cache.
Retry reloads the current URL, preserving its filters.

The public Redis cache has a dedicated connection. It skips commands until ready,
disables offline queues and command replay, and disconnects on failure/timeout. Recovery
is attempted on demand at most once per five seconds, without replaying old SETs. Existing
TTL values, cache keys, invalidation commands and sensitive rate-limit connection policy
are preserved. This adds one Redis connection per backend process when Redis is enabled.
Corrupt-JSON cleanup cannot block on the shared invalidation connection. Failure logs
contain fixed messages rather than cache keys, credentials or payloads.

Homepage aggregate and CMS share promises for the exact featured-8, rating-8, category
and brand reads. Newest-8 stays distinct; brand/category-specific product queries retain
their own filtering, sorting and limits. CMS receives raw brands as before, while the
aggregate keeps its active-brand filter. Optional block/collection failures preserve
successful blocks in their original order. Degraded CMS results are marked internally
and excluded from both aggregate and legacy CMS caches.

Homepage rendering retains its aggregate and CMS block ordering. Splitting optional
homepage content into a separate streamed response would require a new data contract and
layout decisions, exceeding a small change here. Optional aggregate waits are bounded
instead. Product-detail related products now stream through Suspense after the essential
product, metadata and structured data are available.

The placeholder homepage hero and missing countdown-product fallbacks were removed. Missing
promotions/testimonials are omitted rather than filled from placeholder content.
Configured content keeps its layout. No fallback catalog, price or stock is generated.

StoreImage sizes eligible unsigned HTTPS ImageKit images directly in their CDN URLs,
while Next's global unoptimized setting stays enabled. This avoids relying on a loader
that global passthrough would bypass. Width budgets include hero 1920, product cards 768,
main product 1280, thumbnails 160, brands/categories 400 and best-seller images 300.
Other fixed-width images use twice their displayed width; fixed pixel sizes are also
recognized. Other fill images use 1280. All widths are capped at 3840. These are fixed CDN
budgets, not a responsive srcset. Existing crop/effect query transformations are retained.
Local assets/uploads, non-ImageKit hosts, signed URLs, SVG/GIF and existing path transforms
retain passthrough behavior. Explicit image opt-outs/custom loaders are respected.
See [ImageKit transformations](https://imagekit.io/docs/transformations) and
[signed image delivery](https://imagekit.io/docs/media-delivery-basic-security).

## Checks

The new tests mock all service/database/Redis/fetch dependencies or render synthetic
components in process. They perform no network I/O or database writes. The test-specific
JSX configuration uses React's automatic JSX runtime without changing Next configuration.

From the repository root, with existing dependencies:

```powershell
node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tests/tsconfig.unit.json --test --test-concurrency=1 backend/tests/env.redis-url.test.ts backend/tests/public-cache-deadline.test.ts backend/tests/homepage.assembly.test.ts frontend/tests/unit/homepage-timing.test.ts frontend/tests/unit/public-read.test.ts frontend/tests/unit/storefront-image.test.ts
node backend/node_modules/typescript/bin/tsc --project backend/tsconfig.json --noEmit
node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit --incremental false
```

Verification completed: 38 focused tests passed (29 Phase 2 checks plus nine Phase 1
regressions). Both backend/frontend TypeScript checks passed without emitted output.
Targeted frontend lint returned zero errors; existing render-timing/state-effect warnings
remain. git diff --check passed. A final route check found authenticated /carousel/admin
under the carousel namespace; the explicit public-route allowlist excludes it, and the
regression suite confirms it receives neither the deadline nor automatic retry.

Do not run the full backend npm test script without a verified disposable database;
existing integration tests can write data. Tests cover hung headers/body parsing,
caller cancellation, exclusion of auth/writes, finite configuration, cache failure and
cooldown/recovery, unchanged TTLs, bounded corrupt-cache cleanup, request-local reuse,
CMS ordering/filtering/empty and partial results, rendered retry/promotion states and
rendered ImageKit sizing/passthrough.

## Measurement status and next-phase prerequisites

No startup or loading comparison is available. Rechecking Docker produced:
Docker Desktop Linux engine pipe dockerDesktopLinuxEngine not found. No disposable local
PostgreSQL database was verified. Backend startup launches cleanup writes, so no backend
or database integration test was started. Test durations are not startup measurements.

Use the exact local prerequisites, synthetic environment, backend/frontend launch commands
and separate readiness/compilation/first/warm measurements in
[the Phase 1 baseline](PHASE_1_STARTUP_BASELINE.md). Before launch, additionally set:

```powershell
# Backend terminal, using ONLY the verified disposable local services:
$env:REDIS_CACHE_TIMEOUT_MS = '250'
$env:HOMEPAGE_OPTIONAL_TIMEOUT_MS = '1200'
# Frontend terminal (set before build/dev launch):
$env:NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS = '5000'
```

Keep Redis disabled for the equivalent Phase 1 uncached baseline. If testing Redis,
verify a newly created disposable local Redis instance too, and record both phases with
the same connection/cache state. Never stop, clear or fault a shared or production cache.

After process readiness, without visiting/prefetching the homepage first:

```powershell
curl.exe --silent --show-error --max-time 10 --output NUL --write-out "health status=%{http_code} total_s=%{time_total}\n" http://127.0.0.1:5500/api/health
curl.exe --silent --show-error --max-time 120 --output phase2-home-first.html --write-out "first status=%{http_code} ttfb_s=%{time_starttransfer} total_s=%{time_total}\n" http://127.0.0.1:3500/
1..3 | ForEach-Object {
  curl.exe --silent --show-error --max-time 120 --output NUL --write-out "warm status=%{http_code} ttfb_s=%{time_starttransfer} total_s=%{time_total}\n" http://127.0.0.1:3500/
}
```

Save/inspect only synthetic local HTML. An HTTP 200 may be an unavailable state; verify
actual catalog content and logs, not just the status or aggregate timing outcome. Record
Node/npm versions, catalog/CMS fixtures, build/compilation state, environment mode,
readiness events, database/cache/process warmth and request deadline settings. Use a
clean browser to measure image bytes, usable-page timing and LCP; curl does not load
images. Compare both versions under these same conditions, labeling compilation,
process readiness, first response and warm response separately. ImageKit URL generation
was tested offline; live CDN bytes/visual quality and browser streaming still need local
preview verification with an authorized synthetic setup.

Expected warm-path benefits are fewer repeated service reads and smaller eligible image
transfers. Deadlines improve failure response time and bound cache/optional waits. None
eliminates a sleeping host's cold start, provisioning time, or database readiness retries.
Optional promise deadlines do not cancel already running PostgreSQL work; existing query
limits still apply. Tune budgets from actual measurements in the next phase; this work
is not a production-readiness claim.
