# Performance Phase E Results

> Date: 2026-06-17
> Scope: Database/query performance and index verification for public storefront reads.
> Status: Implemented for verified public-read index coverage. No API response shapes, auth, checkout, cart, orders, admin permissions, uploads, reviews, CSRF, sessions, user data, rate limiters, or frontend pages were changed.

## Slow Query Audit

The public storefront read path is centered on `backend/src/services/products.service.ts` and `backend/src/repositories/product.repository.ts`.

### Store Product Listing

Code path:

- `GET /api/v1/products`
- `products.controller.ts -> listProducts`
- `ProductRepository.countProducts`
- `ProductRepository.listProducts`

SQL shape:

- Count query joins `products`, `categories`, parent `categories`, and `brands`.
- Page query selects `p.*`, brand display fields, category display fields.
- Pagination uses `LIMIT/OFFSET`.
- Default sort is `p.is_featured DESC, p.created_at DESC`.
- Supported sort keys are whitelisted: price ascending/descending, newest, rating, popular.
- Filters include category slug/parent slug, brand legacy/name/slug, price range, rating, ids, search, parent category, and specs.

Observations:

- The API response still needs product metadata and display fields, so Phase E did not remove columns or change response shape.
- Product list always computes a total count, which is useful for pagination but remains a cost under high traffic.
- Search/spec filters remain potentially expensive; Phase C keeps them short-TTL cached, but Phase E did not add broad JSON/spec indexes.

### Category Product Listing

Code path:

- `GET /store?category=:slug` on the frontend.
- Backend product list filter: `(c.slug = $1 OR pc.slug = $1)`.

SQL shape:

- Uses category and parent-category joins.
- Product rows join by `p.category_id`.
- Default sort remains `p.is_featured DESC, p.created_at DESC`.

Observations:

- Existing category slug uniqueness supports category lookup.
- Existing `products(category_id)` supports filtering.
- Phase E adds a composite category/sort index for the common category page order.

### Product Detail by Slug

Code path:

- `GET /api/v1/products/:slug`
- `ProductRepository.getBySlug`

SQL shape:

- Product lookup by `p.slug`.
- Joins category and brand display data.
- Then loads gallery images by `product_id ORDER BY sort_order ASC`.
- Then loads variants by `product_id ORDER BY created_at ASC`.

Observations:

- Product slug was already indexed.
- Product image/variant lookups had product ID indexes but not product ID plus order-column indexes.
- Phase E adds ordered child-row indexes for those two detail queries.

### Homepage Aggregate Internal Product Queries

The homepage uses `GET /api/v1/homepage/full` after Phase D and is cached by Phase C.

Internal product-related work includes:

- featured products: `WHERE p.is_featured = true ORDER BY p.rating DESC LIMIT $1`
- trending products: `listProducts({ sort: 'rating', limit: 8 })`
- optional active homepage brand sections: `WHERE p.brand_id = $1 ORDER BY <controlled sort>`
- optional active homepage category sections: `WHERE p.category_id = $1 OR c.parent_id = $1 ORDER BY <controlled sort>`

Observations:

- Phase C caches the complete homepage aggregate for `60s`, reducing repeated DB work.
- Cold misses can still execute the internal product queries.
- Homepage dynamic brand/category sections are resolved with `Promise.all`; this is not an N+1 inside a single product list, but many active homepage sections can still create multiple DB queries on cold cache misses.

## Existing Indexes Found

Relevant indexes already present before Phase E:

- `products(slug)` and unique `products(slug)`
- `products(category_id)`
- `products(brand_id)`
- `products(is_featured)`
- `products(price)`
- `products(created_at DESC)`
- `products(rating DESC)`
- `products USING GIN (name gin_trgm_ops)`
- `categories(slug)` unique
- `categories(parent_id)`
- `brands(slug)` unique and `brands(slug)`
- `brands(is_active)`
- `product_images(product_id)`
- `product_variants(product_id)`

## Indexes Added

Migration:

```text
backend/src/db/migrations/012_public_read_product_indexes.sql
```

Added indexes:

- `idx_products_featured_created_at`
  - `products(is_featured DESC, created_at DESC)`
  - Matches default store sort.
- `idx_products_category_featured_created_at`
  - `products(category_id, is_featured DESC, created_at DESC)`
  - Matches category-filtered store pages using the default sort.
- `idx_products_brand_featured_created_at`
  - `products(brand_id, is_featured DESC, created_at DESC)`
  - Matches brand-filtered product listing when brand ID is used and homepage brand sections.
- `idx_products_featured_rating`
  - `products(rating DESC) WHERE is_featured = true`
  - Matches featured product query.
- `idx_product_images_product_sort`
  - `product_images(product_id, sort_order ASC)`
  - Matches product detail gallery query.
- `idx_product_variants_product_created_at`
  - `product_variants(product_id, created_at ASC)`
  - Matches product detail variant query.

The same indexes were added to `backend/src/db/schema.sql` for fresh database builds.

## Query Changes

No SQL query behavior was changed in Phase E.

Reason:

- Current API response shape is broad and existing frontend expectations are unknown.
- The local database is too small to prove that removing selected columns or changing count behavior is safe.
- Indexes matched real query patterns without changing behavior.

## EXPLAIN Findings

Local PostgreSQL was available and `EXPLAIN (ANALYZE, BUFFERS)` was run.

Important limitation:

- The local seed data contained only a tiny product set, so PostgreSQL often chose sequential scans because scanning one row is cheaper than using an index.
- These local plans are useful for verifying query shape, not for proving production-scale planner behavior.

Findings before Phase E:

- Store default page used a sequential scan on `products` plus an explicit sort by `p.is_featured DESC, p.created_at DESC`.
- Featured products used a sequential scan on `products` with `Filter: is_featured` plus an explicit sort by `p.rating DESC`.
- Product by slug used `idx_products_slug`.
- Category pages used `idx_products_category_id`.
- Product image and variant detail queries had product ID indexes but not combined product/order-column indexes.

Findings after Phase E:

- New indexes were present in `pg_indexes`.
- Product image query used `idx_product_images_product_sort`.
- Product variant query used `idx_product_variants_product_created_at`.
- Store/featured product list queries still used sequential scans on the tiny local product table; this is expected with one product and does not invalidate the composite indexes for larger tables.

## Pool Setting Review

Current PostgreSQL pool configuration in `backend/src/config/db.ts`:

- `max: 20`
- `idleTimeoutMillis: 30000`
- `connectionTimeoutMillis: 5000`
- `statement_timeout: env.DB_STATEMENT_TIMEOUT_MS`

Environment support:

- `DATABASE_URL` is environment configurable.
- `DB_STATEMENT_TIMEOUT_MS` is environment configurable and defaults to `10000`.
- Pool `max`, idle timeout, and connection timeout are currently hard-coded.

Assessment:

- `max: 20` is reasonable for local/small single-instance use.
- For staging/production, pool max should be coordinated with PostgreSQL max connections, backend replica count, and any PgBouncer setting.
- Phase E did not tune pool values blindly.

## Migration Result

Command run:

```powershell
cd backend
npm run db:migrate
```

Result:

- Applied migration: `012_public_read_product_indexes`.
- Migration completed successfully.

The migration runner wraps migrations in a transaction, so Phase E did not use `CREATE INDEX CONCURRENTLY`. For production, apply during a low-traffic window or update the migration strategy before using concurrent index creation.

## Validation

Backend and frontend validation run:

```powershell
cd backend
npm run build
npm test

cd frontend
npm run lint
npm run typecheck
npm run build
```

Results:

- `cd backend && npm run build`: passed.
- `cd backend && npm test`: passed, `101` tests, `0` failures.
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run build`: passed.

Service status before k6:

- `GET http://localhost:5000/api/health`: `200`.
- `GET http://localhost:3000/`: `200`.
- Redis port `6379`: reachable.
- PostgreSQL port `5432`: reachable.

k6 validation run:

```powershell
cd D:\User\Documents\PorfolioProjects\ElecSHOP
k6 run load-tests/k6/website-smoke.js
k6 run load-tests/k6/website-small.js
k6 run load-tests/k6/website-small.js
```

Smoke result:

- Profile: `1 -> 2 -> 5` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- 429 responses: `0`.
- Overall p95: `480.17ms`.
- Overall p99: `960.26ms`.
- Homepage p95: `743.04ms`.
- Store p95: `627.48ms`.
- Category store p95: `468ms`.
- Product detail p95: `7.96ms`.
- Result: passed the local `<1500ms` p95 threshold.

Small run 1:

- Profile: `5 -> 10 -> 25` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- 429 responses: `0`.
- Overall p95: `1.14s`.
- Overall p99: `2.34s`.
- Homepage p95: `1.86s`.
- Store p95: `1.37s`.
- Category store p95: `953ms`.
- Product detail p95: `48.14ms`.
- Result: passed the local `<1500ms` overall p95 threshold.

Small run 2, warm-cache comparison:

- Profile: `5 -> 10 -> 25` VUs.
- Checks: `100%`.
- Failed HTTP requests: `0%`.
- 429 responses: `0`.
- Overall p95: `1.05s`.
- Overall p99: `3.97s`.
- Homepage p95: `1.66s`.
- Store p95: `1.54s`.
- Category store p95: `864.13ms`.
- Product detail p95: `36.05ms`.
- Result: passed the local `<1500ms` overall p95 threshold.

Comparison against Phase C.1:

- Phase C.1 small overall p95 was about `1.57s` and failed the threshold.
- Phase E small run 1 overall p95 improved to `1.14s`.
- Phase E small run 2 overall p95 improved to `1.05s`.
- Store p95 improved from about `2.52s` to `1.37s` on run 1 and `1.54s` on run 2.
- Category p95 improved from about `1.93s` to `953ms` on run 1 and `864.13ms` on run 2.
- Homepage p95 improved from about `1.83s` to `1.86s` on run 1 and `1.66s` on run 2; this remains the slowest p95 page in the warm run.

Medium profile was not run; local smoke/small validation was enough for Phase E.

## Remaining Bottlenecks

- Product list count queries still run for every cache miss.
- Search and specs filtering remain potentially expensive at scale.
- Brand filter currently supports legacy `p.brand`, `b.name`, and `b.slug` with an `OR`, which can limit index usefulness.
- Homepage/store/category p99 spikes remain visible locally and may involve frontend CPU/event-loop pressure rather than only database latency.
- Real planner behavior needs staging-size data to validate these indexes under realistic row counts.

## Next Phase

Phase F infrastructure scaling plan can start after k6 smoke/small validation is rerun and compared against the Phase C.1 numbers.
