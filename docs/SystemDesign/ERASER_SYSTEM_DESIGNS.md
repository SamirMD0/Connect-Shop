# Eraser System Designs

These diagrams are generated from the current Connect-shop / ElecSHOP repository structure and docs. They are intended for Eraser.io Diagram-as-Code use before production/demo deployment.

Sources inspected include backend app/routes/controllers/services/middleware/config, `backend/src/db/schema.sql`, backend migrations, frontend app/components/context/lib files, env examples, README, deployment docs, and performance scaling docs.

## 1. System Architecture Diagram

This diagram shows the main runtime components: public storefront, admin dashboard, Next.js frontend, Express API, PostgreSQL, Redis-backed cache/rate limiting, ImageKit/CDN, Resend email, COD/manual checkout, and the clearly future online payment webhook path.

```eraser
title ElecSHOP System Architecture

User Browser [icon: user]
Admin Browser [icon: shield]
ImageKit CDN [icon: image]
Resend Email [icon: mail]

Vercel Frontend [icon: vercel] {
  Next.js App Router [icon: nextdotjs]
  Public Storefront [icon: shopping-bag]
  Admin Dashboard [icon: layout-dashboard]
  Auth UI [icon: log-in]
  Cart Context [icon: shopping-cart]
  Wishlist Context [icon: heart]
  API Client [icon: code]
}

Render Backend API [icon: server] {
  Express App [icon: nodejs]
  Helmet CORS CSRF Sanitizers [icon: lock]
  Auth Middleware [icon: key]
  Admin Role Middleware [icon: shield-check]
  Rate Limiters [icon: gauge]
  Public Read Limiter Buckets [icon: list-filter]
  Controllers [icon: route]
  Services [icon: boxes]
  Cache Layer [icon: database-zap]
}

Managed PostgreSQL [icon: postgresql] {
  Users Sessions Auth Tokens
  Products Categories Brands Variants
  Cart Orders Order Items
  Reviews Wishlists Coupons Promotions
  Homepage Carousel Admin Audit Security Events
}

Managed Redis [icon: redis] {
  Public Read Cache Keys
  Rate Limit Buckets
  Route Specific Public Buckets
  SSR Bucket
}

Future Payment Provider [icon: credit-card, color: gray]
Future Webhook Endpoint [icon: webhook, color: gray]

User Browser > Vercel Frontend: Public browsing HTTPS
User Browser > ImageKit CDN: Product and carousel images
Vercel Frontend > Render Backend API: API fetches /api/v1/*
Vercel Frontend > Render Backend API: SSR public reads with server-only INTERNAL_SSR_API_SECRET
Render Backend API > Managed PostgreSQL: SQL queries and transactions
Render Backend API > Managed Redis: Cache get/set, rate-limit store
Render Backend API > ImageKit CDN: Admin image uploads through backend
Render Backend API > Resend Email: Verification, password reset, order confirmation

User Browser > Cart Context: Guest cart in localStorage
Cart Context > Render Backend API: Auth cart API /api/v1/cart
User Browser > Render Backend API: COD checkout /api/v1/orders
Render Backend API > Managed PostgreSQL: Create COD order, order_items, decrement stock

Admin Browser > Admin Dashboard: /admin protected UI
Admin Dashboard > Render Backend API: /api/v1/admin/*
Render Backend API > Auth Middleware: Session cookie validation
Auth Middleware > Admin Role Middleware: customer/support/manager/admin/super_admin checks
Admin Role Middleware > Controllers: Authorized admin actions

Future Payment Provider > Future Webhook Endpoint: Planned/Future only
Future Webhook Endpoint > Render Backend API: Not currently implemented
```

Notes:

- Current checkout supports Cash on Delivery/manual payment only.
- Online payment provider webhook is not implemented and is shown only as planned/future.
- Redis free/low-quota tiers are not suitable for repeated medium k6 load tests.
- Local k6 should use local Docker Redis; staging/production should use paid/higher-capacity Redis.

## 2. ERD / Database Diagram

This ERD includes the real table names and important fields from `backend/src/db/schema.sql` and migrations. It is grouped to stay readable while still showing relationships.

```eraser
title ElecSHOP Database ERD

users [icon: users] {
  id uuid pk
  google_id varchar unique nullable
  email varchar unique
  name varchar
  avatar_url text
  role customer|support|manager|admin|super_admin
  phone varchar nullable
  password_hash text nullable
  email_verified_at timestamptz nullable
  mfa_enabled boolean
  mfa_secret text nullable
  mfa_confirmed_at timestamptz nullable
  deleted_at timestamptz nullable
}

sessions [icon: key] {
  id uuid pk
  user_id uuid fk
  token varchar unique
  expires_at timestamptz
  revoked_at timestamptz nullable
  mfa_verified_at timestamptz nullable
}

auth_tokens [icon: ticket] {
  id uuid pk
  user_id uuid fk
  token_hash text unique
  purpose email_verification|password_reset
  expires_at timestamptz
  used_at timestamptz nullable
}

oauth_states [icon: shield] {
  id uuid pk
  state_hash varchar unique
  expires_at timestamptz
  used_at timestamptz nullable
}

user_addresses [icon: map-pin] {
  id uuid pk
  user_id uuid fk
  recipient_name varchar
  phone varchar
  address_line1 text
  city varchar
  country varchar
  is_default boolean
}

categories [icon: grid] {
  id serial pk
  name varchar unique
  slug varchar unique
  image_url text
  parent_id integer fk nullable
  depth integer
}

brands [icon: tag] {
  id serial pk
  name varchar unique
  slug varchar unique
  logo_url text
  is_active boolean
}

products [icon: package] {
  id uuid pk
  name varchar
  slug varchar unique
  price decimal
  compare_at_price decimal nullable
  image_url text
  category_id integer fk
  brand_id integer fk nullable
  sku varchar unique nullable
  stock integer
  rating decimal
  review_count integer
  is_featured boolean
  specs jsonb
}

product_images [icon: image] {
  id serial pk
  product_id uuid fk
  image_url text
  alt_text varchar
  sort_order integer
  is_primary boolean
}

product_variants [icon: boxes] {
  id uuid pk
  product_id uuid fk
  sku varchar unique
  name varchar
  price decimal
  stock integer
  attributes jsonb
  image_url text
}

product_questions [icon: message-circle] {
  id uuid pk
  product_id uuid fk
  user_id uuid fk nullable
  question text
  answer text nullable
  answered_at timestamptz nullable
}

cart_items [icon: shopping-cart] {
  id serial pk
  user_id uuid fk
  product_id uuid fk
  variant_id uuid fk nullable
  quantity integer
  expires_at timestamptz
}

orders [icon: receipt] {
  id uuid pk
  user_id uuid fk nullable
  guest_email varchar nullable
  status confirmed|processing|shipped|delivered|cancelled
  subtotal decimal
  tax_amount decimal
  shipping_cost decimal
  discount_amount decimal
  coupon_code varchar nullable
  total decimal
  shipping_address jsonb
  payment_method varchar default cash_on_delivery
  payment_status varchar default pending
  delivery_slot varchar nullable
  tracking_number varchar nullable
  cancelled_at timestamptz nullable
}

order_items [icon: list] {
  id serial pk
  order_id uuid fk
  product_id uuid fk
  variant_id uuid fk nullable
  quantity integer
  price_at_purchase decimal
  variant_name varchar nullable
}

order_status_history [icon: history] {
  id serial pk
  order_id uuid fk
  status varchar
  note text nullable
  created_by uuid fk nullable
}

return_requests [icon: undo] {
  id uuid pk
  order_id uuid fk
  user_id uuid fk nullable
  reason text
  status requested|approved|rejected|refunded
}

wishlists [icon: heart] {
  user_id uuid pk fk
  product_id uuid pk fk
}

reviews [icon: star] {
  id uuid pk
  product_id uuid fk
  user_id uuid fk
  rating integer
  status pending|published|hidden|rejected
  moderated_by uuid fk nullable
}

carousel_slides [icon: images] {
  id serial pk
  title varchar
  subtitle text
  image_url text
  link_url text
  display_order integer
  is_active boolean
}

homepage_brand_product_sections [icon: layout] {
  id uuid pk
  brand_id integer fk
  title varchar
  product_limit 4|8|12
  sort_key newest|rating|price_asc|price_desc
  layout grid|rail
  is_active boolean
}

homepage_category_product_sections [icon: layout] {
  id uuid pk
  category_id integer fk
  title varchar
  product_limit 4|8|12
  sort_key newest|rating|price_asc|price_desc
  layout grid|rail
  is_active boolean
}

promotions [icon: megaphone] {
  id serial pk
  title varchar
  image_url text
  link_url text
  starts_at timestamptz nullable
  ends_at timestamptz nullable
  is_active boolean
}

homepage_blocks [icon: panel-top] {
  id uuid pk
  block_type varchar
  brand_product_section_id uuid fk nullable
  category_product_section_id uuid fk nullable
  promotion_id integer fk nullable
  display_order integer
  is_active boolean
}

coupons [icon: badge-percent] {
  id serial pk
  code varchar unique
  type percent|fixed
  value decimal
  usage_limit integer nullable
  used_count integer
  is_active boolean
}

coupon_usage [icon: ticket-check] {
  id serial pk
  coupon_id integer fk
  order_id uuid fk
  user_id uuid fk nullable
  guest_email varchar nullable
}

abandoned_cart_recovery [icon: clock] {
  id serial pk
  user_id uuid fk unique
  cart_total decimal
  item_count integer
  status pending|sent|dismissed
}

notifications [icon: bell] {
  id uuid pk
  user_id uuid fk nullable
  type varchar
  title varchar
  read_at timestamptz nullable
}

newsletter_subscribers [icon: mail] {
  id uuid pk
  email varchar unique
  status subscribed|unsubscribed
}

admin_audit_logs [icon: file-clock] {
  id uuid pk
  actor_id uuid fk nullable
  action varchar
  target_type varchar
  target_id text
  status_code integer
  payload jsonb
}

security_events [icon: shield-alert] {
  id uuid pk
  event_type varchar
  severity info|warning|high|critical
  user_id uuid fk nullable
  session_id uuid nullable
  metadata jsonb
}

users.id < sessions.user_id
users.id < auth_tokens.user_id
users.id < user_addresses.user_id
users.id < cart_items.user_id
users.id < orders.user_id
users.id < order_status_history.created_by
users.id < return_requests.user_id
users.id < wishlists.user_id
users.id < reviews.user_id
users.id < reviews.moderated_by
users.id < notifications.user_id
users.id < admin_audit_logs.actor_id
users.id < security_events.user_id

categories.id < products.category_id
categories.id < categories.parent_id
brands.id < products.brand_id
products.id < product_images.product_id
products.id < product_variants.product_id
products.id < product_questions.product_id
products.id < cart_items.product_id
products.id < order_items.product_id
products.id < wishlists.product_id
products.id < reviews.product_id
product_variants.id < cart_items.variant_id
product_variants.id < order_items.variant_id
orders.id < order_items.order_id
orders.id < order_status_history.order_id
orders.id < return_requests.order_id
orders.id < coupon_usage.order_id
brands.id < homepage_brand_product_sections.brand_id
categories.id < homepage_category_product_sections.category_id
homepage_brand_product_sections.id < homepage_blocks.brand_product_section_id
homepage_category_product_sections.id < homepage_blocks.category_product_section_id
promotions.id < homepage_blocks.promotion_id
coupons.id < coupon_usage.coupon_id
```

Notes:

- There is no separate `roles` table; roles are constrained strings on `users.role`.
- There is no separate `carts` table; authenticated carts are rows in `cart_items`, while guest carts live in frontend localStorage.
- Product and variant stock both exist. Cart and order items can reference `variant_id`.

## 3. Auth & Role Flow

This diagram shows email/password auth, Google OAuth, email verification, password reset, session cookies, MFA for admin access, and role-based admin permissions.

```eraser
title Auth and Role Flow

Public User [icon: user]
Frontend Auth Pages [icon: monitor] {
  Register Page /auth/register
  Login Page /auth/login
  Verify Email Page /auth/verify-email
  Forgot Password Page /auth/forgot-password
  Reset Password Page /auth/reset-password
  Google Callback Page /auth/callback
}

Auth API [icon: key] {
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/verify-email
  POST /api/v1/auth/forgot-password
  POST /api/v1/auth/reset-password
  GET /api/v1/auth/google
  GET /api/v1/auth/google/callback
  GET /api/v1/auth/me
  POST /api/v1/auth/logout
  GET DELETE /api/v1/auth/sessions
}

Auth Services [icon: boxes] {
  registerWithPassword
  loginWithPassword
  createSession
  validateSession
  verifyEmailToken
  requestPasswordReset
  resetPassword
  OAuth State
}

Security Controls [icon: shield] {
  authLimiter
  CSRF for unsafe cookie requests
  Progressive Login Cooldown
  MFA Setup Verify
  Session Revocation
  Security Events
}

Database [icon: postgresql] {
  users
  sessions
  auth_tokens
  oauth_states
  security_events
}

Admin Route Guard [icon: shield-check] {
  requireAuth
  isAdmin
  requireAdminMfa
  requireAdminPermission
  requireFreshAdminMfa for role changes
}

Roles [icon: users] {
  customer
  support
  manager
  admin
  super_admin
}

Public User > Register Page /auth/register: email name password phone
Register Page /auth/register > POST /api/v1/auth/register: create account
POST /api/v1/auth/register > registerWithPassword: hash password
registerWithPassword > users: insert customer
registerWithPassword > auth_tokens: email_verification token
registerWithPassword > createSession: signed elecshop_session cookie
registerWithPassword > Security Events: none unless failure

Public User > Login Page /auth/login: email password
Login Page /auth/login > POST /api/v1/auth/login: credentials
POST /api/v1/auth/login > authLimiter: brute-force limit
POST /api/v1/auth/login > loginWithPassword: verify password_hash
loginWithPassword > createSession: revoke old sessions then create session
loginWithPassword > sessions: token hash expires_at
loginWithPassword > Public User: signed httpOnly cookie
loginWithPassword > Unauthorized: invalid credentials or cooldown

Public User > GET /api/v1/auth/google: start OAuth
GET /api/v1/auth/google > oauth_states: store state hash
GET /api/v1/auth/google > Google OAuth [icon: google]: redirect
Google OAuth > GET /api/v1/auth/google/callback: code and state
GET /api/v1/auth/google/callback > OAuth State: consume signed state
GET /api/v1/auth/google/callback > users: upsert google_id email profile
GET /api/v1/auth/google/callback > createSession: signed cookie

Forgot Password Page /auth/forgot-password > POST /api/v1/auth/forgot-password: email
POST /api/v1/auth/forgot-password > auth_tokens: password_reset token
POST /api/v1/auth/forgot-password > Resend or mock email [icon: mail]: reset link
Reset Password Page /auth/reset-password > POST /api/v1/auth/reset-password: token password
POST /api/v1/auth/reset-password > users: update password_hash
POST /api/v1/auth/reset-password > sessions: revoke all sessions

Protected API [icon: lock] > requireAuth: signed cookie
requireAuth > validateSession: token hash lookup
validateSession > sessions: not expired not revoked
validateSession > users: attach req.user
requireAuth > Unauthorized: missing invalid expired session

Admin Dashboard /admin [icon: layout-dashboard] > Admin Route Guard: admin UI access
Admin Route Guard > Roles: role permission lookup
Roles > Protected Admin Routes: support manager admin super_admin
Roles > Forbidden: customer or insufficient permission
Admin Route Guard > MFA Setup Verify: require admin MFA
Admin Role Change > requireFreshAdminMfa: fresh code within configured minutes
```

Notes:

- Email verification is implemented through `auth_tokens`, but login does not block unverified email in the inspected code.
- Admin routes require admin privileges and MFA through backend middleware and frontend admin layout.
- There is no separate roles table.

## 4. Product + Variant Model

This diagram focuses on catalog data, purchasable variants, images, category/brand relationships, and how cart/order rows can point at a selected variant.

```eraser
title Product and Variant Model

Catalog Admin [icon: shield]
Public Storefront [icon: shopping-bag]

Product [icon: package] {
  products.id uuid pk
  name
  slug unique
  description
  price
  compare_at_price
  image_url
  category_id fk
  brand_id fk nullable
  brand legacy text nullable
  sku unique nullable
  stock
  rating
  review_count
  is_featured
  specs jsonb
  meta_title
  meta_description
}

Category [icon: grid] {
  categories.id serial pk
  name unique
  slug unique
  image_url
  parent_id nullable
  depth
}

Brand [icon: tag] {
  brands.id serial pk
  name unique
  slug unique
  logo_url
  description
  is_active
}

Product Images [icon: image] {
  product_images.id serial pk
  product_id fk
  image_url
  alt_text
  sort_order
  is_primary
}

Product Variants [icon: boxes] {
  product_variants.id uuid pk
  product_id fk
  sku unique
  name
  price
  stock
  attributes jsonb
  image_url
}

Cart Item [icon: shopping-cart] {
  cart_items.product_id fk
  cart_items.variant_id nullable fk
  quantity
}

Order Item [icon: receipt] {
  order_items.product_id fk
  order_items.variant_id nullable fk
  quantity
  price_at_purchase
  variant_name
}

Product Questions [icon: message-circle]
Reviews [icon: star]
Wishlists [icon: heart]

Catalog Admin > Product: create update delete
Catalog Admin > Product Images: upload via /api/v1/admin/uploads/image
Product > Category: belongs to
Product > Brand: belongs to optional brand_id
Product > Product Images: has many gallery images
Product > Product Variants: has many variants
Product > Product Questions: has many questions
Product > Reviews: has many reviews
Product > Wishlists: many users via wishlists table

Public Storefront > Product: list, filter, sort, search
Public Storefront > Product Variants: select variant when present
Cart Item > Product: product_id required
Cart Item > Product Variants: variant_id optional
Order Item > Product: product_id required
Order Item > Product Variants: variant_id optional snapshot
Product Variants > Order Item: variant_name captured at purchase
```

Notes:

- Variant-level purchasing is supported where `variant_id` is present in cart/order items.
- If `variant_id` is absent, stock and price come from `products`.
- Variant attributes are JSONB; specific color/size/storage keys are not enforced by schema.

## 5. Cart + Checkout Flow

This diagram shows both guest and authenticated carts, stock checks, duplicate item handling, COD checkout, abuse protection, order creation, and failure states.

```eraser
title Cart and Checkout Flow

Guest Browser [icon: user]
Logged In User [icon: user-check]
Frontend Cart Context [icon: shopping-cart] {
  Guest localStorage cart
  Auth cart sync
  Add update remove clear
}

Backend Cart API [icon: server] {
  GET /api/v1/cart
  POST /api/v1/cart
  PATCH /api/v1/cart/:itemId
  DELETE /api/v1/cart/:itemId
}

Checkout Page [icon: credit-card] {
  Delivery address
  Phone
  Coupon code
  Delivery slot
  Payment method cash_on_delivery
}

Orders API [icon: receipt] {
  POST /api/v1/orders optionalAuth
  checkoutLimiter
  placeOrder
  placeGuestOrder
}

Checkout Transaction [icon: database] {
  pg_advisory_xact_lock for COD actor
  SELECT products or variants FOR UPDATE
  stock validation
  coupon validation FOR UPDATE
  INSERT orders status confirmed
  INSERT order_items
  decrement product or variant stock
  INSERT order_status_history
  clear authenticated cart
}

Database [icon: postgresql] {
  cart_items
  products
  product_variants
  orders
  order_items
  coupons
  coupon_usage
  order_status_history
}

Failure States [icon: alert-triangle] {
  cart empty
  invalid quantity
  insufficient stock
  invalid expired coupon
  active COD order limit
  unauthenticated cart API
}

Guest Browser > Frontend Cart Context: add item
Frontend Cart Context > Guest localStorage cart: store product_id variant_id quantity expires_at
Guest localStorage cart > Checkout Page: hydrate items from public product APIs
Checkout Page > POST /api/v1/orders optionalAuth: guestEmail items shippingAddress COD

Logged In User > Frontend Cart Context: add item
Frontend Cart Context > POST /api/v1/cart: productId quantity variantId
POST /api/v1/cart > requireAuth [icon: lock]: required
POST /api/v1/cart > cartMutationLimiter [icon: gauge]
POST /api/v1/cart > products: stock lookup
POST /api/v1/cart > product_variants: variant stock lookup if variant_id
POST /api/v1/cart > cart_items: insert or increment duplicate row
Logged In User > Checkout Page: use server cart
Checkout Page > POST /api/v1/orders optionalAuth: shippingAddress COD coupon deliverySlot

POST /api/v1/orders optionalAuth > checkoutLimiter
checkoutLimiter > Checkout Transaction
Checkout Transaction > Failure States: business rule failure
Checkout Transaction > orders: create status confirmed payment_status pending
Checkout Transaction > order_items: snapshot price variant_name
Checkout Transaction > products: decrement stock when no variant
Checkout Transaction > product_variants: decrement stock when variant selected
Checkout Transaction > coupons: increment used_count
Checkout Transaction > coupon_usage: record coupon use
Checkout Transaction > order_status_history: confirmed Order placed
Checkout Transaction > cart_items: clear auth user cart
Orders API > Resend or mock email [icon: mail]: async order confirmation
```

Notes:

- Guest cart is localStorage-based and sent as order items during guest checkout.
- Authenticated cart is server-side in `cart_items`.
- Checkout decrements stock at order creation. There is no pre-payment reservation flow because online payment is not implemented.
- Active COD order protection allows at most 2 active COD orders per user or guest phone actor.

## 6. Payment Webhook Flow

The current implemented path is COD/manual payment only. The future online payment webhook path is included only as a clearly marked planned/future extension.

```eraser
title Payment Flow: Current COD and Future Webhook

Current Implemented COD Path [color: green] {
  Customer [icon: user]
  Checkout Page [icon: shopping-cart]
  POST /api/v1/orders [icon: server]
  Orders Service [icon: boxes]
  orders table [icon: postgresql]
  order_items table [icon: list]
  Admin Orders Page [icon: layout-dashboard]
  Manual Fulfillment [icon: truck]
}

Planned Future Online Payment Path [color: gray] {
  Payment Provider [icon: credit-card]
  Webhook Endpoint [icon: webhook]
  Signature Verification [icon: shield-check]
  Idempotency Check [icon: fingerprint]
  Payment Event Log [icon: file-clock]
  Update Payment Status [icon: receipt]
  Send Confirmation Email [icon: mail]
}

Customer > Checkout Page: choose cash_on_delivery
Checkout Page > POST /api/v1/orders: paymentMethod cash_on_delivery
POST /api/v1/orders > Orders Service: normalizePaymentMethod
Orders Service > orders table: payment_method cash_on_delivery
Orders Service > orders table: payment_status pending
Orders Service > orders table: status confirmed
Orders Service > order_items table: item snapshot
Orders Service > Admin Orders Page: order visible to admin
Admin Orders Page > Manual Fulfillment: update status confirmed processing shipped delivered cancelled

Payment Provider > Webhook Endpoint: Planned/Future only
Webhook Endpoint > Signature Verification: Not implemented
Signature Verification > Idempotency Check: Not implemented
Idempotency Check > Payment Event Log: Not implemented
Payment Event Log > Update Payment Status: Not implemented
Update Payment Status > Send Confirmation Email: Not implemented
```

Notes:

- No online payment provider webhook endpoint exists in the inspected backend routes.
- `payment_method` defaults to `cash_on_delivery`.
- `payment_status` defaults to `pending`.
- Admin order status can be updated, but no automatic paid-after-delivery workflow was found.

## 7. Order State Machine

This diagram uses the actual constrained order statuses and implemented transitions. Admin status updates are broad within the allowed set; customer cancellation is restricted to confirmed/processing.

```eraser
title Order State Machine

Start [shape: circle]
Confirmed [color: blue] {
  status confirmed
  created by checkout
  payment_method cash_on_delivery
  payment_status pending
}
Processing [color: yellow] {
  status processing
  admin updated
}
Shipped [color: purple] {
  status shipped
  admin updated
  tracking fields optional
}
Delivered [color: green] {
  status delivered
  admin updated
  return request allowed
}
Cancelled [color: red] {
  status cancelled
  cancelled_at optional for customer cancellation
}

Return Requested [color: gray] {
  return_requests.status requested
}
Return Approved [color: gray] {
  return_requests.status approved
}
Return Rejected [color: gray] {
  return_requests.status rejected
}
Refunded [color: gray] {
  return_requests.status refunded
  order_status_history status refunded
}

Order History [icon: history] {
  order_status_history
  status
  note
  created_by
}

Start > Confirmed: POST /api/v1/orders
Confirmed > Processing: admin update
Processing > Shipped: admin update
Shipped > Delivered: admin update
Confirmed > Cancelled: customer cancel or admin update
Processing > Cancelled: customer cancel or admin update
Shipped > Cancelled: admin update only
Delivered > Return Requested: customer return request
Return Requested > Return Approved: admin return update
Return Requested > Return Rejected: admin return update
Return Approved > Refunded: admin return update

Confirmed > Order History: Order placed
Processing > Order History: Updated by admin
Shipped > Order History: Updated by admin or tracking updated
Delivered > Order History: Updated by admin
Cancelled > Order History: Cancelled by customer or Updated by admin
Return Requested > Order History: return_requested
Refunded > Order History: refunded
```

Notes:

- Actual `orders.status` values are `confirmed`, `processing`, `shipped`, `delivered`, and `cancelled`.
- Schema default is `confirmed`; code inserts orders as `confirmed`.
- `ACTIVE_COD_ORDER_STATUSES` includes `pending` and `out_for_delivery`, but those are not valid `orders.status` values in the current schema/admin status list.
- Transition restrictions are partly workflow-driven; admin can set any allowed order status through `updateOrderStatus`.

## 8. Inventory Flow

This diagram shows product/variant stock, admin management, low-stock alerts, cart checks, checkout locks, order-time decrement, and the production improvement around reservation/locking.

```eraser
title Inventory Flow

Admin Inventory UI [icon: alert-triangle] {
  /admin/inventory
  low stock alerts
}

Admin Product UI [icon: package] {
  /admin/products
  create product
  update product
  CSV import export
}

Inventory Data [icon: postgresql] {
  products.stock
  product_variants.stock
}

Public Product UI [icon: shopping-bag] {
  ProductCard
  ProductDisplay
  StockBadge
  AddToCartClient
}

Cart Stock Check [icon: shopping-cart] {
  addToCart
  updateCartItemQuantity
  getAvailableStock
}

Checkout Stock Lock [icon: lock] {
  resolveOrderItems
  SELECT product FOR UPDATE
  SELECT variant FOR UPDATE OF pv
  item.stock >= quantity
}

Order Stock Decrement [icon: database-zap] {
  UPDATE products stock = stock - quantity
  UPDATE product_variants stock = stock - quantity
  invalidateProductCaches
}

Failure Outcomes [icon: x-circle] {
  insufficient stock
  selected variant unavailable
  invalid quantity
}

Admin Product UI > Inventory Data: set product stock and variant stock
Admin Inventory UI > Inventory Data: read low stock threshold
Inventory Data > Public Product UI: show stock availability
Public Product UI > Cart Stock Check: add/update quantity
Cart Stock Check > Inventory Data: read product or variant stock
Cart Stock Check > Failure Outcomes: insufficient stock at cart time
Cart Stock Check > cart_items [icon: shopping-cart]: insert or update quantity

Checkout Page [icon: credit-card] > Checkout Stock Lock: submit COD order
Checkout Stock Lock > Inventory Data: row-level lock for selected items
Checkout Stock Lock > Failure Outcomes: out of stock at checkout
Checkout Stock Lock > Order Stock Decrement: order creation succeeds
Order Stock Decrement > Inventory Data: decrement product or variant stock
Order Stock Decrement > Redis Cache [icon: redis]: invalidate product caches
```

Notes:

- Inventory is decremented at order creation, not reserved before checkout.
- Product-level stock is used when `variant_id` is null; variant-level stock is used when `variant_id` is present.
- Potential production improvement: reservation/locking window before payment if online payments are added later.
- Customer cancellation currently changes order status but inspected code did not restock cancelled items.

## 9. Admin Dashboard Structure

This diagram maps actual frontend admin routes to backend admin route groups, permissions, and managed DB entities.

```eraser
title Admin Dashboard Structure

Admin Layout [icon: layout-dashboard] {
  /admin
  AdminSidebar
  AuthContext
  MFA gate
}

Admin Route Protection [icon: shield-check] {
  requireAuth
  isAdmin
  requireAdminMfa
  adminReadLimiter
  adminMutationLimiter
  adminAudit
  requireAdminPermission
}

Admin Pages [icon: monitor] {
  Overview /admin
  Homepage /admin/homepage
  Carousel /admin/carousel
  Products /admin/products
  Categories /admin/categories
  Brands /admin/brands
  Customers /admin/customers
  Orders /admin/orders
  Reviews /admin/reviews
  Inventory /admin/inventory
  Promotions /admin/promotions
  Coupons /admin/coupons
  Search /admin/search
  Security /admin/security
}

Admin API Groups [icon: server] {
  GET /api/v1/admin/analytics/monthly-revenue
  /api/v1/admin/products
  /api/v1/admin/categories
  /api/v1/admin/brands
  /api/v1/admin/users
  /api/v1/admin/orders
  /api/v1/admin/returns
  /api/v1/admin/reviews
  /api/v1/admin/homepage
  /api/v1/admin/promotions
  /api/v1/admin/coupons
  /api/v1/admin/search
  /api/v1/admin/security/*
  POST /api/v1/admin/uploads/image
}

Permissions [icon: key] {
  analytics
  products
  orders
  customers
  admin_roles
  reviews
  content
  homepage
  marketing
  security
  settings
}

Managed Entities [icon: postgresql] {
  users
  products
  categories
  brands
  orders
  order_status_history
  return_requests
  reviews
  carousel_slides
  homepage_blocks
  homepage sections
  promotions
  coupons
  security_events
  admin_audit_logs
}

Admin Layout > Admin Route Protection: page access requires admin role and MFA
Admin Route Protection > Permissions: role permission map
Permissions > Forbidden [icon: ban]: insufficient role permission

Overview /admin > GET /api/v1/admin/analytics/monthly-revenue: analytics
Products /admin/products > /api/v1/admin/products: products permission
Products /admin/products > POST /api/v1/admin/uploads/image: uploadLimiter + ImageKit/local fallback
Categories /admin/categories > /api/v1/admin/categories: products permission
Brands /admin/brands > /api/v1/admin/brands: products permission
Customers /admin/customers > /api/v1/admin/users: customers permission
Customers /admin/customers > /api/v1/admin/users/:id/role: admin_roles + fresh MFA
Orders /admin/orders > /api/v1/admin/orders: orders permission
Orders /admin/orders > /api/v1/admin/orders/:id/status: update status
Orders /admin/orders > /api/v1/admin/orders/:id/tracking: update tracking
Orders /admin/orders > /api/v1/admin/returns/:id/status: returns
Reviews /admin/reviews > /api/v1/admin/reviews: reviews permission
Homepage /admin/homepage > /api/v1/admin/homepage: homepage permission
Carousel /admin/carousel > /api/v1/carousel admin routes: content permission
Inventory /admin/inventory > /api/v1/admin/inventory/alerts: products permission
Promotions /admin/promotions > /api/v1/admin/promotions: marketing permission
Coupons /admin/coupons > /api/v1/admin/coupons: marketing permission
Search /admin/search > /api/v1/admin/search: analytics permission
Security /admin/security > /api/v1/admin/security/*: security permission

Admin API Groups > Managed Entities: CRUD, moderation, analytics, audit
Admin Route Protection > admin_audit_logs: record admin actions
Security /admin/security > security_events: health events alerts
```

Notes:

- Sidebar items are filtered by frontend `hasAdminPermission`, and backend enforces permissions independently.
- Admin MFA is required for admin layout access; role changes require fresh MFA.
- Carousel admin routes are mounted under `/api/v1/carousel` with admin controller logic, not only under `/api/v1/admin`.

## 10. Deployment Architecture

This diagram shows the planned deployment stack from the repo docs: Vercel frontend, Render backend, managed PostgreSQL, paid/higher-capacity Redis, ImageKit/CDN, Resend, Sentry/logs, health checks, smoke tests, local Docker Redis for k6, and security constraints.

```eraser
title Deployment Architecture

Developer [icon: user-cog]
GitHub Repo [icon: github]
CI Build Checks [icon: githubactions] {
  backend build and tests
  frontend lint typecheck build
  security scans
}

Production Edge [icon: globe] {
  Custom Domain yourdomain.com
  API Domain api.yourdomain.com
}

Vercel Frontend [icon: vercel] {
  Next.js App Router
  Public Storefront
  Admin UI
  Server-side API fetches
  NEXT_PUBLIC_API_URL
  INTERNAL_API_URL
  INTERNAL_SSR_API_SECRET server-only
}

Render Backend [icon: server] {
  Express API
  /api/health
  CORS FRONTEND_URL
  publicReadLimiter
  strict sensitive limiters
  controllers services
}

Managed PostgreSQL [icon: postgresql] {
  DATABASE_URL backend-only
  migrations
  backups PITR
  connection pool max 20 per process
}

Managed Redis Paid Tier [icon: redis] {
  REDIS_URL backend-only
  cache keys
  rate-limit buckets
  monitor quota latency errors
}

ImageKit CDN [icon: image] {
  public image delivery
  backend upload API keys
  browser safe URL endpoint
}

Resend Email [icon: mail] {
  optional RESEND_API_KEY backend-only
  verification reset order emails
}

Sentry and Provider Logs [icon: activity] {
  frontend Sentry optional
  backend Sentry optional
  Render logs
  Vercel logs
}

Local Load Test Environment [icon: laptop] {
  k6 local
  Docker Redis redis:7-alpine
  local Postgres
  no free Redis medium tests
}

Post Deploy Validation [icon: check-circle] {
  backend health check
  API public smoke
  website smoke
  COD test order
  admin order review
}

Developer > GitHub Repo: push code
GitHub Repo > CI Build Checks: validate
GitHub Repo > Vercel Frontend: deploy frontend
GitHub Repo > Render Backend: deploy backend

Custom Domain yourdomain.com > Vercel Frontend: browser HTTPS
API Domain api.yourdomain.com > Render Backend: API HTTPS
Vercel Frontend > Render Backend: SSR and browser API calls
Render Backend > Managed PostgreSQL: SQL and migrations
Render Backend > Managed Redis Paid Tier: cache and rate limits
Render Backend > ImageKit CDN: admin image uploads
Vercel Frontend > ImageKit CDN: public image loads
Render Backend > Resend Email: optional email sends
Vercel Frontend > Sentry and Provider Logs: optional frontend errors
Render Backend > Sentry and Provider Logs: backend errors and request logs

k6 local > Docker Redis redis:7-alpine: local medium validation support
k6 local > Render Backend: smoke or approved small tests only
k6 local > Vercel Frontend: website smoke
Post Deploy Validation > Render Backend: GET /api/health and public APIs
Post Deploy Validation > Vercel Frontend: homepage store product cart checkout
Post Deploy Validation > Admin UI: confirm COD order in admin

Security Notes [icon: lock] {
  INTERNAL_SSR_API_SECRET must not be NEXT_PUBLIC
  DATABASE_URL and REDIS_URL backend-only
  do not trust X-Forwarded-For blindly
  do not IP-whitelist frontend server
  keep auth checkout cart admin upload review limits strict
  COD manual payment separate from future webhook
}

Security Notes > Vercel Frontend: only browser-safe NEXT_PUBLIC values
Security Notes > Render Backend: private secrets in provider env store
Security Notes > Managed Redis Paid Tier: paid/higher-capacity for staging production
```

Notes:

- Vercel handles Next.js runtime automatically; the standalone start script is mainly for self-hosted/container runs.
- Upstash free/low-quota Redis is not suitable for repeated medium load testing.
- Do not run medium/heavy k6 against production/demo unless provider capacity and approval are confirmed.
- Phase N final deployment validation is pending deployed URLs/provider details.
