# Connect-shop Production Audit (Evidence-Backed)

## 1. Auth Middleware & Session Management
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/auth.service.ts`
- **Function:** `validateSession`
- **Code Evidence:**
  ```typescript
  const rows = await query<User & { session_id: string }>(
    `SELECT u.*, s.id AS session_id, s.mfa_verified_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL`,
    [tokenHash]
  );
  ```
- **Attack Prevented:** Post-logout token reuse. Since `destroySession` sets `revoked_at = NOW()`, stolen session cookies are immediately globally invalidated at the database level.

## 2. Admin Route Protection
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/middleware/admin.ts`
- **Function:** `isAdmin` and `requireAdminPermission`
- **Code Evidence:**
  ```typescript
    if (!hasAdminPermission(req.user)) {
      logAdminSuspiciousAction(req, 'admin_privileges_required');
      throw new ForbiddenError('Access denied: Admin privileges required');
    }
  ```
- **Attack Prevented:** Vertical Privilege Escalation. Standard users cannot hit admin endpoints.

## 3. Cart Ownership
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/cart.service.ts`
- **Query:** `getCart`
- **Code Evidence:**
  ```sql
     WHERE ci.user_id = $1 AND ci.expires_at > NOW()
  ```
- **Attack Prevented:** Insecure Direct Object Reference (IDOR). A user cannot fetch or modify cart items belonging to another `user_id`.

## 4. Order Ownership
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/orders.service.ts`
- **Function:** `getOrderById`
- **Code Evidence:**
  ```typescript
    const orders = await query<Order>(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );
  ```
- **Attack Prevented:** IDOR on order history. Users cannot view receipts or tracking numbers for orders they do not own.

## 5. Checkout Logic & Price Manipulation
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/orders.service.ts`
- **Function:** `resolveOrderItems`
- **Code Evidence:**
  ```sql
        SELECT p.id AS product_id, NULL::uuid AS variant_id, $2::int AS quantity,
               p.name, NULL::text AS variant_name, p.price, p.stock
        FROM products p
        WHERE p.id = $1
        FOR UPDATE
  ```
- **Attack Prevented:** Parameter Tampering. The checkout endpoint does not trust prices sent by the frontend JSON. It pulls the single source of truth `p.price` directly from the database during checkout.

## 6. Stock Race Conditions
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/orders.service.ts`
- **Function:** `createOrderFromItems` and `resolveOrderItems`
- **Code Evidence:**
  ```typescript
    if (item.stock < item.quantity) {
      throw new AppError(`Insufficient stock... Requested: ${item.quantity}, Available: ${item.stock}`, 400);
    }
  ```
  *(Combined with the `FOR UPDATE` row lock shown in section 5)*
- **Attack Prevented:** Overselling. The `FOR UPDATE` row-level lock ensures that if two users checkout the last item simultaneously, the database forces one transaction to wait, reads the newly updated stock, and throws the `Insufficient stock` error.

## 7. Checkout Spam Race Conditions
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/orders.service.ts`
- **Function:** `assertActiveCodOrderLimit`
- **Code Evidence:**
  ```typescript
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cod-order:${actorKey}`]);
  ```
- **Attack Prevented:** Transaction Race Conditions. Prevents a script from firing 100 simultaneous requests to bypass the `MAX_ACTIVE_COD_ORDERS = 2` limitation before the database writes the first order.

## 8. SQL Injection
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/products.service.ts`
- **Function:** `listProducts`
- **Code Evidence:**
  ```typescript
  if (options.search) {
    conditions.push(`p.name ILIKE $${paramIndex++}`);
    values.push(`%${options.search}%`);
  }
  ```
- **Attack Prevented:** SQL Injection. Dynamic queries are built using PostgreSQL's native parameterized bindings (`$1`, `$2`), completely immunizing the query from string escape and quote attacks.

## 9. Redis Cache Invalidation
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/services/products.service.ts`
- **Function:** `invalidateProductCaches`
- **Code Evidence:**
  ```typescript
  export async function invalidateProductCaches(slugs: string[] = []): Promise<void> {
    await delCache(...slugs.map((slug) => CACHE_KEYS.productSlug(slug)));
    await Promise.all([
      delCacheByPattern(CACHE_KEYS.featuredProductsPattern),
      delCacheByPattern(CACHE_KEYS.productListPattern),
    ]);
  }
  ```
- **Attack Prevented:** Stale Ecommerce Data. When an admin changes a product's price or stock, this function actively clears the Redis cache so users don't check out using outdated cached data.

## 10. CSRF & Session Cookie Config
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/middleware/csrf.ts`
- **Function:** `getCsrfCookieOptions` and `csrfProtection`
- **Code Evidence:**
  ```typescript
  function getCsrfCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true,
    };
  }
  // ...
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ForbiddenError('Invalid CSRF token');
  }
  ```
- **Attack Prevented:** Cross-Site Request Forgery (CSRF) via double-submit validation, and XSS cookie theft (blocked natively by `httpOnly`).

## 11. Rate Limiting
- **Status:** ✅ VERIFIED SAFE
- **File:** `backend/src/middleware/rateLimiter.ts`
- **Function:** `createRedisStore`
- **Code Evidence:**
  ```typescript
  import { RedisStore } from 'rate-limit-redis';
  // ...
  store: createRedisStore('rl:auth:')
  ```
- **Attack Prevented:** Brute force and credential stuffing. Uses distributed `rate-limit-redis` to prevent distributed botnet attacks scaling across multiple backend instances.

## 12. Database Constraints (Missing Indexes)
- **Status:** ❌ UNVERIFIED / MISSING
- **File:** Database Migrations
- **Code Evidence:** No `CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);` or equivalent exists in the current repo schema definition.
- **Attack Prevented:** Denial of Service (DoS) via slow queries. As `cart_items` grows, missing indexes will cause slow full table scans under load.

## 13. Missing CI/CD
- **Status:** ❌ UNVERIFIED / MISSING
- **File:** `.github/workflows`
- **Code Evidence:** The `.github/workflows` directory does not exist in the repository structure.
- **Attack Prevented:** Deployment regressions. Without automated test runners blocking Pull Requests, broken features can accidentally reach production.
