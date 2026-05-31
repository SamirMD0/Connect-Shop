# REDIS CACHE POLICY

Redis is optional for local development and recommended for production. If `REDIS_URL` is missing or Redis is unavailable, the backend continues serving requests directly from PostgreSQL.

## Cached Public Reads

| Endpoint | Cache key | TTL |
|---|---|---:|
| `GET /api/v1/homepage` | `homepage:active:v1` | 180 seconds |
| `GET /api/v1/categories` and `GET /api/v1/products/categories` | `categories:tree:v1` | 600 seconds |
| `GET /api/v1/products/featured?limit=...` | `products:featured:v1:limit=<limit>` | 180 seconds |
| `GET /api/v1/products/:slug` | `product:slug:v1:<slug>` | 180 seconds |
| `GET /api/v1/products?...` | `products:list:v1:<sha1-normalized-query>` | 45 seconds |
| `GET /api/v1/carousel` | `carousel:active:v1` | 180 seconds |

Product list cache keys include normalized public query parameters: `search`, `category`, `brand`, `min_price`, `max_price`, `min_rating`, `sort`, `page`, `limit`, `parent_id`, `ids`, and `specs`.

## Not Cached

- Auth endpoints, including `auth/me`, login, register, MFA, CSRF, password reset, and session checks.
- Cart and wishlist endpoints.
- Checkout and order creation.
- User order history and order detail.
- Admin permission checks and admin-only reads.
- Mutation responses.
- Error responses and not-found product detail responses.

## Invalidation

Cached public reads are invalidated by backend mutations:

- Product create/update/delete clears product detail, featured product, and product list caches.
- Category create/update/delete clears category and product list caches.
- Brand update/delete clears product public caches.
- Checkout/order creation clears affected product detail, featured, and product list caches after stock changes.
- Homepage CMS section/item create/update/delete clears homepage cache.
- Promotion create/update/delete clears homepage cache because legacy promotions can be merged into homepage content.
- Carousel slide create/update/delete clears carousel cache.

Pattern deletion is used only for internal cache namespaces such as `products:list:v1:*` and `products:featured:v1:*`.

## Failure Behavior

Redis errors are logged as warnings and treated as cache misses. Bad cached JSON is deleted and the request falls back to PostgreSQL. Cache failures must not change API response shapes or expose Redis errors to clients.
