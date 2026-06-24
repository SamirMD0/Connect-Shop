# Eraser System Designs

These diagrams are generated from the current Connect-shop / ElecSHOP repository structure and docs. They are intended for Eraser.io Diagram-as-Code use before production/demo deployment.

Sources inspected include backend app/routes/controllers/services/middleware/config, `backend/src/db/schema.sql`, backend migrations, frontend app/components/context/lib files, env examples, README, deployment docs, and performance scaling docs.

## 1. System Architecture Diagram

This diagram shows the main runtime components: public storefront, admin dashboard, Next.js frontend, Express API, PostgreSQL, Redis-backed cache/rate limiting, ImageKit/CDN, Resend email, COD/manual checkout, and the clearly future online payment webhook path.

```eraser
cloud-architecture-diagram

// title ElecSHOP System Architecture

User Browser 
Admin Browser 
ImageKit CDN 
Resend Email 

Vercel Frontend [icon: vercel] {
  Next.js App Router 
  Public Storefront 
  Admin Dashboard 
  Auth UI 
  Cart Context 
  Wishlist Context 
  API Client 
}

Render Backend API  {
  Express App [icon: node-js]
  Helmet CORS CSRF Sanitizers 
  Auth Middleware 
  Admin Role Middleware 
  Rate Limiters 
  Public Read Limiter Buckets 
  Controllers 
  Services 
  Cache Layer 
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

Future Payment Provider [color: gray]
Future Webhook Endpoint [color: gray]

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
entity-relationship-diagram

// title ElecSHOP Database ERD

users  {
  id uuid pk
  google_id string
  email string
  name string
  avatar_url string
  role string
  phone string
  password_hash string
  email_verified_at datetime
  mfa_enabled boolean
  mfa_secret string
  mfa_confirmed_at datetime
  deleted_at datetime
}

sessions  {
  id uuid pk
  user_id uuid fk
  token string
  expires_at datetime
  revoked_at datetime
  mfa_verified_at datetime
}

auth_tokens  {
  id uuid pk
  user_id uuid fk
  token_hash string
  purpose string
  expires_at datetime
  used_at datetime
}

oauth_states  {
  id uuid pk
  state_hash string
  expires_at datetime
  used_at datetime
}

user_addresses  {
  id uuid pk
  user_id uuid fk
  recipient_name string
  phone string
  address_line1 string
  city string
  country string
  is_default boolean
}

categories  {
  id integer
  name string
  slug string
  image_url string
  parent_id integer
  depth integer
}

brands  {
  id integer
  name string
  slug string
  logo_url string
  is_active boolean
}

products  {
  id uuid pk
  name string
  slug string
  price float
  compare_at_price float
  image_url string
  category_id integer
  brand_id integer
  sku string
  stock integer
  rating float
  review_count integer
  is_featured boolean
  specs json
}

product_images  {
  id integer
  product_id uuid fk
  image_url string
  alt_text string
  sort_order integer
  is_primary boolean
}

product_variants  {
  id uuid pk
  product_id uuid fk
  sku string
  name string
  price float
  stock integer
  attributes json
  image_url string
}

product_questions  {
  id uuid pk
  product_id uuid fk
  user_id uuid fk nullable
  question string
  answer string
  answered_at datetime
}

cart_items  {
  id integer
  user_id uuid fk
  product_id uuid fk
  variant_id uuid fk nullable
  quantity integer
  expires_at datetime
}

orders  {
  id uuid pk
  user_id uuid fk nullable
  guest_email string
  status string
  subtotal float
  tax_amount float
  shipping_cost float
  discount_amount float
  coupon_code string
  total float
  shipping_address json
  payment_method string
  payment_status string
  delivery_slot string
  tracking_number string
  cancelled_at datetime
}

order_items  {
  id integer
  order_id uuid fk
  product_id uuid fk
  variant_id uuid fk nullable
  quantity integer
  price_at_purchase float
  variant_name string
}

order_status_history  {
  id integer
  order_id uuid fk
  status string
  note string
  created_by uuid fk nullable
}

return_requests  {
  id uuid pk
  order_id uuid fk
  user_id uuid fk nullable
  reason string
  status string
}

wishlists  {
  user_id uuid [pk, fk]
  product_id uuid [pk, fk]
}

reviews  {
  id uuid pk
  product_id uuid fk
  user_id uuid fk
  rating integer
  status string
  moderated_by uuid fk nullable
}

carousel_slides  {
  id integer
  title string
  subtitle string
  image_url string
  link_url string
  display_order integer
  is_active boolean
}

homepage_brand_product_sections  {
  id uuid pk
  brand_id integer
  title string
  product_limit 4|8|12
  sort_key newest|rating|price_asc|price_desc
  layout grid|rail
  is_active boolean
}

homepage_category_product_sections  {
  id uuid pk
  category_id integer
  title string
  product_limit 4|8|12
  sort_key newest|rating|price_asc|price_desc
  layout grid|rail
  is_active boolean
}

promotions  {
  id integer
  title string
  image_url string
  link_url string
  starts_at datetime
  ends_at datetime
  is_active boolean
}

homepage_blocks  {
  id uuid pk
  block_type string
  brand_product_section_id uuid fk nullable
  category_product_section_id uuid fk nullable
  promotion_id integer
  display_order integer
  is_active boolean
}

coupons  {
  id integer
  code string
  type string
  value float
  usage_limit integer
  used_count integer
  is_active boolean
}

coupon_usage  {
  id integer
  coupon_id integer
  order_id uuid fk
  user_id uuid fk nullable
  guest_email string
}

abandoned_cart_recovery  {
  id integer
  user_id uuid fk unique
  cart_total float
  item_count integer
  status string
}

notifications  {
  id uuid pk
  user_id uuid fk nullable
  type string
  title string
  read_at datetime
}

newsletter_subscribers  {
  id uuid pk
  email string
  status string
}

admin_audit_logs  {
  id uuid pk
  actor_id uuid fk nullable
  action string
  target_type string
  target_id string
  status_code integer
  payload json
}

security_events  {
  id uuid pk
  event_type string
  severity string
  user_id uuid fk nullable
  session_id uuid nullable
  metadata json
}

sessions.user_id > users.id
auth_tokens.user_id > users.id
user_addresses.user_id > users.id
cart_items.user_id > users.id
orders.user_id > users.id
order_status_history.created_by > users.id
return_requests.user_id > users.id
wishlists.user_id > users.id
reviews.user_id > users.id
reviews.moderated_by > users.id
notifications.user_id > users.id
admin_audit_logs.actor_id > users.id
security_events.user_id > users.id

products.category_id > categories.id
categories.parent_id > categories.id
products.brand_id > brands.id
product_images.product_id > products.id
product_variants.product_id > products.id
product_questions.product_id > products.id
cart_items.product_id > products.id
order_items.product_id > products.id
wishlists.product_id > products.id
reviews.product_id > products.id
cart_items.variant_id > product_variants.id
order_items.variant_id > product_variants.id
order_items.order_id > orders.id
order_status_history.order_id > orders.id
return_requests.order_id > orders.id
coupon_usage.order_id > orders.id
homepage_brand_product_sections.brand_id > brands.id
homepage_category_product_sections.category_id > categories.id
homepage_blocks.brand_product_section_id > homepage_brand_product_sections.id
homepage_blocks.category_product_section_id > homepage_category_product_sections.id
homepage_blocks.promotion_id > promotions.id
coupon_usage.coupon_id > coupons.id
```

Notes:

- There is no separate `roles` table; roles are constrained strings on `users.role`.
- There is no separate `carts` table; authenticated carts are rows in `cart_items`, while guest carts live in frontend localStorage.
- Product and variant stock both exist. Cart and order items can reference `variant_id`.

## 3. Auth & Role Flow

This diagram shows email/password auth, Google OAuth, email verification, password reset, session cookies, MFA for admin access, and role-based admin permissions.

```eraser
cloud-architecture-diagram

// title Auth and Role Flow

Public User 
Frontend Auth Pages  {
  Register Page 
  Login Page 
  Verify Email Page 
  Forgot Password Page 
  Reset Password Page 
  Google Callback Page 
}

Auth API  {
  Register Endpoint 
  Login Endpoint 
  Verify Email Endpoint 
  Forgot Password Endpoint 
  Reset Password Endpoint 
  Google Start Endpoint 
  Google Callback Endpoint 
  Current User Endpoint 
  Logout Endpoint 
  Sessions Endpoint 
}

Auth Services  {
  Register With Password 
  Login With Password 
  Create Session 
  Validate Session 
  Verify Email Token 
  Request Password Reset 
  Reset Password 
  OAuth State Service 
}

Security Controls  {
  Auth Limiter 
  CSRF Protection 
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

Admin Route Guard  {
  Require Auth 
  Is Admin 
  Require Admin MFA 
  Require Admin Permission 
  Require Fresh Admin MFA 
}

Roles  {
  Customer 
  Support 
  Manager 
  Admin 
  Super Admin 
}

Google OAuth Provider 
Email Provider 
Protected API 
Admin Dashboard 
Protected Admin Routes 
Unauthorized 
Forbidden 
Admin Role Change 

Public User > Register Page: Open /auth/register
Register Page > Register Endpoint: POST /api/v1/auth/register
Register Endpoint > Register With Password: Hash password
Register With Password > users: Insert customer
Register With Password > auth_tokens: Email verification token
Register With Password > Create Session: Signed elecshop_session cookie
Register With Password > Security Events: Log failures only

Public User > Login Page: Open /auth/login
Login Page > Login Endpoint: POST /api/v1/auth/login
Login Endpoint > Auth Limiter: Brute force limit
Login Endpoint > Login With Password: Verify password hash
Login With Password > Create Session: Revoke old sessions and create session
Login With Password > sessions: Store token hash and expiry
Login With Password > Public User: Return signed httpOnly cookie
Login With Password > Unauthorized: Invalid credentials or cooldown

Public User > Google Start Endpoint: GET /api/v1/auth/google
Google Start Endpoint > oauth_states: Store state hash
Google Start Endpoint > Google OAuth Provider: Redirect
Google OAuth Provider > Google Callback Endpoint: Code and state
Google Callback Endpoint > OAuth State Service: Consume signed state
Google Callback Endpoint > users: Upsert google_id email profile
Google Callback Endpoint > Create Session: Signed cookie

Forgot Password Page > Forgot Password Endpoint: POST /api/v1/auth/forgot-password
Forgot Password Endpoint > auth_tokens: Password reset token
Forgot Password Endpoint > Email Provider: Reset link
Reset Password Page > Reset Password Endpoint: POST /api/v1/auth/reset-password
Reset Password Endpoint > users: Update password hash
Reset Password Endpoint > sessions: Revoke all sessions

Protected API > Require Auth: Signed cookie
Require Auth > Validate Session: Token hash lookup
Validate Session > sessions: Not expired and not revoked
Validate Session > users: Attach req.user
Require Auth > Unauthorized: Missing invalid expired session

Admin Dashboard > Admin Route Guard: Admin UI access
Admin Route Guard > Roles: Role permission lookup
Roles > Protected Admin Routes: support manager admin super_admin
Roles > Forbidden: Customer or insufficient permission
Admin Route Guard > MFA Setup Verify: Require admin MFA
Admin Role Change > Require Fresh Admin MFA: Fresh code within configured minutes
```

Notes:

- Email verification is implemented through `auth_tokens`, but login does not block unverified email in the inspected code.
- Admin routes require admin privileges and MFA through backend middleware and frontend admin layout.
- There is no separate roles table.

## 4. Product + Variant Model

This diagram focuses on catalog data, purchasable variants, images, category/brand relationships, and how cart/order rows can point at a selected variant.

```eraser
entity-relationship-diagram

// title Product and Variant Model

CatalogAdmin 
PublicStorefront 

Product  {
  id uuid [pk]
  name string
  slug string
  description string
  price float
  compare_at_price float
  image_url string
  category_id integer [fk]
  brand_id integer [fk]
  legacy_brand string
  sku string
  stock integer
  rating float
  review_count integer
  is_featured boolean
  specs jsonb
  meta_title string
  meta_description string
}

Category  {
  id integer [pk]
  name string
  slug string
  image_url string
  parent_id integer [fk]
  depth integer
}

Brand  {
  id integer [pk]
  name string
  slug string
  logo_url string
  description string
  is_active boolean
}

ProductImages  {
  id integer [pk]
  product_id uuid [fk]
  image_url string
  alt_text string
  sort_order integer
  is_primary boolean
}

ProductVariants  {
  id uuid [pk]
  product_id uuid [fk]
  sku string
  name string
  price float
  stock integer
  attributes jsonb
  image_url string
}

CartItem  {
  product_id uuid [fk]
  variant_id uuid [fk]
  quantity integer
}

OrderItem  {
  product_id uuid [fk]
  variant_id uuid [fk]
  quantity integer
  price_at_purchase float
  variant_name string
}

ProductQuestions 
Reviews 
Wishlists 

CatalogAdmin > Product
CatalogAdmin > ProductImages
PublicStorefront > Product
PublicStorefront > ProductVariants

Product > Category
Product > Brand
Category > Category
Product > ProductImages
Product > ProductVariants
Product > ProductQuestions
Product > Reviews
Product > Wishlists

CartItem > Product
CartItem > ProductVariants
OrderItem > Product
OrderItem > ProductVariants
ProductVariants > OrderItem
```

Notes:

- Variant-level purchasing is supported where `variant_id` is present in cart/order items.
- If `variant_id` is absent, stock and price come from `products`.
- Variant attributes are JSONB; specific color/size/storage keys are not enforced by schema.

## 5. Cart + Checkout Flow

This diagram shows both guest and authenticated carts, stock checks, duplicate item handling, COD checkout, abuse protection, order creation, and failure states.

```eraser
cloud-architecture-diagram

// title Cart and Checkout Flow

GuestBrowser 
LoggedInUser 

FrontendCartContext  {
  GuestLocalStorageCart
  AuthCartSync
  AddItem
  UpdateQuantity
  RemoveItem
  ClearCart
}

BackendCartAPI  {
  GetCartRoute
  AddCartItemRoute
  UpdateCartItemRoute
  DeleteCartItemRoute
  RequireAuth
  CartMutationLimiter
}

CheckoutPage  {
  ContactInfo
  DeliveryAddress
  Phone
  CouponCode
  DeliverySlot
  CashOnDelivery
}

OrdersAPI  {
  CreateOrderRoute
  OptionalAuth
  CheckoutLimiter
  PlaceOrder
  PlaceGuestOrder
}

CheckoutTransaction  {
  AdvisoryLock
  ProductRowLock
  StockValidation
  CouponValidation
  InsertOrder
  InsertOrderItems
  DecrementStock
  InsertStatusHistory
  ClearAuthCart
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

FailureStates  {
  EmptyCart
  InvalidQuantity
  InsufficientStock
  InvalidCoupon
  ActiveCodOrderLimit
  UnauthenticatedCartAPI
}

EmailProvider 

GuestBrowser > FrontendCartContext
FrontendCartContext > GuestLocalStorageCart
GuestLocalStorageCart > CheckoutPage
CheckoutPage > CreateOrderRoute

LoggedInUser > FrontendCartContext
FrontendCartContext > AddCartItemRoute
AddCartItemRoute > RequireAuth
AddCartItemRoute > CartMutationLimiter
AddCartItemRoute > products
AddCartItemRoute > product_variants
AddCartItemRoute > cart_items
LoggedInUser > CheckoutPage
CheckoutPage > CreateOrderRoute

CreateOrderRoute > OptionalAuth
CreateOrderRoute > CheckoutLimiter
CheckoutLimiter > CheckoutTransaction
CheckoutTransaction > FailureStates
CheckoutTransaction > orders
CheckoutTransaction > order_items
CheckoutTransaction > products
CheckoutTransaction > product_variants
CheckoutTransaction > coupons
CheckoutTransaction > coupon_usage
CheckoutTransaction > order_status_history
CheckoutTransaction > cart_items
OrdersAPI > EmailProvider
```

Notes:

- Guest cart is localStorage-based and sent as order items during guest checkout.
- Authenticated cart is server-side in `cart_items`.
- Checkout decrements stock at order creation. There is no pre-payment reservation flow because online payment is not implemented.
- Active COD order protection allows at most 2 active COD orders per user or guest phone actor.

## 6. Payment Webhook Flow

The current implemented path is COD/manual payment only. The future online payment webhook path is included only as a clearly marked planned/future extension.

```eraser
cloud-architecture-diagram

// title Payment Flow Current COD and Future Webhook

CurrentCODPath [color: green]
Customer 
CheckoutPage 
CreateOrderRoute 
OrdersService 
OrdersTable [icon: postgresql]
OrderItemsTable 
AdminOrdersPage 
ManualFulfillment 

PlannedFutureOnlinePaymentPath [color: gray]
PaymentProvider 
WebhookEndpoint 
SignatureVerification 
IdempotencyCheck 
PaymentEventLog 
UpdatePaymentStatus 
SendConfirmationEmail 

CurrentCODPath > Customer
Customer > CheckoutPage
CheckoutPage > CreateOrderRoute
CreateOrderRoute > OrdersService
OrdersService > OrdersTable
OrdersService > OrderItemsTable
OrdersService > AdminOrdersPage
AdminOrdersPage > ManualFulfillment

PlannedFutureOnlinePaymentPath > PaymentProvider
PaymentProvider > WebhookEndpoint
WebhookEndpoint > SignatureVerification
SignatureVerification > IdempotencyCheck
IdempotencyCheck > PaymentEventLog
PaymentEventLog > UpdatePaymentStatus
UpdatePaymentStatus > SendConfirmationEmail
```

Notes:

- No online payment provider webhook endpoint exists in the inspected backend routes.
- `payment_method` defaults to `cash_on_delivery`.
- `payment_status` defaults to `pending`.
- Admin order status can be updated, but no automatic paid-after-delivery workflow was found.

## 7. Order State Machine

This diagram uses the actual constrained order statuses and implemented transitions. Admin status updates are broad within the allowed set; customer cancellation is restricted to confirmed/processing.

```eraser
flow-chart

// title Order State Machine

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

Order History  {
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
cloud-architecture-diagram

// title Inventory Flow

AdminInventoryUI [label: "Admin Inventory UI"] {
  admin_inventory_route [label: "/admin/inventory"]
  low_stock_alerts [label: "low stock alerts"]
}

AdminProductUI [label: "Admin Product UI"] {
  admin_products_route [label: "/admin/products"]
  create_product [label: "create product"]
  update_product [label: "update product"]
  csv_import_export [label: "CSV import export"]
}

InventoryData [icon: postgresql, label: "Inventory Data"] {
  products_stock [label: "products.stock"]
  product_variants_stock [label: "product_variants.stock"]
}

PublicProductUI [label: "Public Product UI"] {
  ProductCard
  ProductDisplay
  StockBadge
  AddToCartClient
}

CartStockCheck [label: "Cart Stock Check"] {
  addToCart
  updateCartItemQuantity
  getAvailableStock
}

CheckoutStockLock [label: "Checkout Stock Lock"] {
  resolveOrderItems
  select_product_for_update [label: "SELECT product FOR UPDATE"]
  select_variant_for_update [label: "SELECT variant FOR UPDATE OF pv"]
  item_stock_gt_quantity [label: "item.stock >= quantity"]
}

OrderStockDecrement [label: "Order Stock Decrement"] {
  update_products_stock [label: "UPDATE products stock = stock - quantity"]
  update_variants_stock [label: "UPDATE product_variants stock = stock - quantity"]
  invalidateProductCaches
}

FailureOutcomes [label: "Failure Outcomes"] {
  insufficient_stock [label: "insufficient stock"]
  selected_variant_unavailable [label: "selected variant unavailable"]
  invalid_quantity [label: "invalid quantity"]
}

AdminProductUI > InventoryData: set product stock and variant stock
AdminInventoryUI > InventoryData: read low stock threshold
InventoryData > PublicProductUI: show stock availability
PublicProductUI > CartStockCheck: add/update quantity
CartStockCheck > InventoryData: read product or variant stock
CartStockCheck > FailureOutcomes: insufficient stock at cart time
CartStockCheck > cart_items : insert or update quantity

CheckoutPage [label: "Checkout Page"] > CheckoutStockLock: submit COD order
CheckoutStockLock > InventoryData: row-level lock for selected items
CheckoutStockLock > FailureOutcomes: out of stock at checkout
CheckoutStockLock > OrderStockDecrement: order creation succeeds
OrderStockDecrement > InventoryData: decrement product or variant stock
OrderStockDecrement > RedisCache [icon: redis, label: "Redis Cache"]: invalidate product caches
```

Notes:

- Inventory is decremented at order creation, not reserved before checkout.
- Product-level stock is used when `variant_id` is null; variant-level stock is used when `variant_id` is present.
- Potential production improvement: reservation/locking window before payment if online payments are added later.
- Customer cancellation currently changes order status but inspected code did not restock cancelled items.

## 9. Admin Dashboard Structure

This diagram maps actual frontend admin routes to backend admin route groups, permissions, and managed DB entities.

```eraser
cloud-architecture-diagram

// title Admin Dashboard Structure

AdminLayout [label: "Admin Layout"] {
  admin_overview [label: "/admin"]
  AdminSidebar
  AuthContext
  mfa_gate [label: "MFA gate"]
}

AdminRouteProtection [label: "Admin Route Protection"] {
  requireAuth
  isAdmin
  requireAdminMfa
  adminReadLimiter
  adminMutationLimiter
  adminAudit
  requireAdminPermission
}

AdminPages [label: "Admin Pages"] {
  page_overview [label: "Overview /admin"]
  page_homepage [label: "Homepage /admin/homepage"]
  page_carousel [label: "Carousel /admin/carousel"]
  page_products [label: "Products /admin/products"]
  page_categories [label: "Categories /admin/categories"]
  page_brands [label: "Brands /admin/brands"]
  page_customers [label: "Customers /admin/customers"]
  page_orders [label: "Orders /admin/orders"]
  page_reviews [label: "Reviews /admin/reviews"]
  page_inventory [label: "Inventory /admin/inventory"]
  page_promotions [label: "Promotions /admin/promotions"]
  page_coupons [label: "Coupons /admin/coupons"]
  page_search [label: "Search /admin/search"]
  page_security [label: "Security /admin/security"]
}

AdminAPIGroups [label: "Admin API Groups"] {
  api_analytics [label: "GET /api/v1/admin/analytics/monthly-revenue"]
  api_products [label: "/api/v1/admin/products"]
  api_categories [label: "/api/v1/admin/categories"]
  api_brands [label: "/api/v1/admin/brands"]
  api_users [label: "/api/v1/admin/users"]
  api_orders [label: "/api/v1/admin/orders"]
  api_returns [label: "/api/v1/admin/returns"]
  api_reviews [label: "/api/v1/admin/reviews"]
  api_homepage [label: "/api/v1/admin/homepage"]
  api_promotions [label: "/api/v1/admin/promotions"]
  api_coupons [label: "/api/v1/admin/coupons"]
  api_search [label: "/api/v1/admin/search"]
  api_security [label: "/api/v1/admin/security/*"]
  api_uploads [label: "POST /api/v1/admin/uploads/image"]
}

Permissions  {
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

ManagedEntities [icon: postgresql, label: "Managed Entities"] {
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
  homepage_sections [label: "homepage sections"]
  promotions
  coupons
  security_events
  admin_audit_logs
}

AdminLayout > AdminRouteProtection: page access requires admin role and MFA
AdminRouteProtection > Permissions: role permission map
Permissions > Forbidden : insufficient role permission

page_overview > api_analytics: analytics
page_products > api_products: products permission
page_products > api_uploads: uploadLimiter + ImageKit/local fallback
page_categories > api_categories: products permission
page_brands > api_brands: products permission
page_customers > api_users: customers permission
page_customers > admin_roles_mfa [label: "/api/v1/admin/users/:id/role"]: admin_roles + fresh MFA
page_orders > api_orders: orders permission
page_orders > api_orders_status [label: "/api/v1/admin/orders/:id/status"]: update status
page_orders > api_orders_tracking [label: "/api/v1/admin/orders/:id/tracking"]: update tracking
page_orders > api_returns_status [label: "/api/v1/admin/returns/:id/status"]: returns
page_reviews > api_reviews: reviews permission
page_homepage > api_homepage: homepage permission
page_carousel > api_carousel_routes [label: "/api/v1/carousel admin routes"]: content permission
page_inventory > api_inventory_alerts [label: "/api/v1/admin/inventory/alerts"]: products permission
page_promotions > api_promotions: marketing permission
page_coupons > api_coupons: marketing permission
page_search > api_search: analytics permission
page_security > api_security: security permission

AdminAPIGroups > ManagedEntities: CRUD, moderation, analytics, audit
AdminRouteProtection > admin_audit_logs: record admin actions
page_security > security_events: health events alerts
```

Notes:

- Sidebar items are filtered by frontend `hasAdminPermission`, and backend enforces permissions independently.
- Admin MFA is required for admin layout access; role changes require fresh MFA.
- Carousel admin routes are mounted under `/api/v1/carousel` with admin controller logic, not only under `/api/v1/admin`.

## 10. Deployment Architecture

This diagram shows the planned deployment stack from the repo docs: Vercel frontend, Render backend, managed PostgreSQL, paid/higher-capacity Redis, ImageKit/CDN, Resend, Sentry/logs, health checks, smoke tests, local Docker Redis for k6, and security constraints.

```eraser
cloud-architecture-diagram

// title Deployment Architecture

Developer 
GitHubRepo [icon: github, label: "GitHub Repo"]
CIBuildChecks [icon: github, label: "CI Build Checks"] {
  ci_backend [label: "backend build and tests"]
  ci_frontend [label: "frontend lint typecheck build"]
  ci_security [label: "security scans"]
}

ProductionEdge [label: "Production Edge"] {
  custom_domain [label: "Custom Domain yourdomain.com"]
  api_domain [label: "API Domain api.yourdomain.com"]
}

VercelFrontend [icon: vercel, label: "Vercel Frontend"] {
  nextjs_router [label: "Next.js App Router"]
  PublicStorefront [label: "Public Storefront"]
  AdminUI [label: "Admin UI"]
  server_side_api_fetches [label: "Server-side API fetches"]
  env_public_api [label: "NEXT_PUBLIC_API_URL"]
  env_internal_api [label: "INTERNAL_API_URL"]
  env_ssr_secret [label: "INTERNAL_SSR_API_SECRET server-only"]
}

RenderBackend [label: "Render Backend"] {
  ExpressAPI [label: "Express API"]
  api_health [label: "/api/health"]
  cors_frontend [label: "CORS FRONTEND_URL"]
  publicReadLimiter
  strict_sensitive_limiters [label: "strict sensitive limiters"]
  controllers_services [label: "controllers services"]
}

ManagedPostgreSQL [icon: postgresql, label: "Managed PostgreSQL"] {
  env_database_url [label: "DATABASE_URL backend-only"]
  migrations
  backups_pitr [label: "backups PITR"]
  conn_pool [label: "connection pool max 20 per process"]
}

ManagedRedis [icon: redis, label: "Managed Redis Paid Tier"] {
  env_redis_url [label: "REDIS_URL backend-only"]
  cache_keys [label: "cache keys"]
  rate_limit_buckets [label: "rate-limit buckets"]
  monitor_quota [label: "monitor quota latency errors"]
}

ImageKitCDN [label: "ImageKit CDN"] {
  public_image_delivery [label: "public image delivery"]
  backend_upload_keys [label: "backend upload API keys"]
  browser_safe_url [label: "browser safe URL endpoint"]
}

ResendEmail [label: "Resend Email"] {
  env_resend_key [label: "optional RESEND_API_KEY backend-only"]
  email_types [label: "verification reset order emails"]
}

LogsAlerts [label: "Sentry and Provider Logs"] {
  frontend_sentry [label: "frontend Sentry optional"]
  backend_sentry [label: "backend Sentry optional"]
  render_logs [label: "Render logs"]
  vercel_logs [label: "Vercel logs"]
}

LocalTestEnv [label: "Local Load Test Environment"] {
  k6_local [label: "k6 local"]
  docker_redis [label: "Docker Redis redis:7-alpine"]
  local_postgres [label: "local Postgres"]
  no_free_redis_tests [label: "no free Redis medium tests"]
}

PostDeployValidation [label: "Post Deploy Validation"] {
  val_health [label: "backend health check"]
  val_api_smoke [label: "API public smoke"]
  val_web_smoke [label: "website smoke"]
  val_cod_order [label: "COD test order"]
  val_admin_review [label: "admin order review"]
}

Developer > GitHubRepo: push code
GitHubRepo > CIBuildChecks: validate
GitHubRepo > VercelFrontend: deploy frontend
GitHubRepo > RenderBackend: deploy backend

custom_domain > VercelFrontend: browser HTTPS
api_domain > RenderBackend: API HTTPS
VercelFrontend > RenderBackend: SSR and browser API calls
RenderBackend > ManagedPostgreSQL: SQL and migrations
RenderBackend > ManagedRedis: cache and rate limits
RenderBackend > ImageKitCDN: admin image uploads
VercelFrontend > ImageKitCDN: public image loads
RenderBackend > ResendEmail: optional email sends
VercelFrontend > LogsAlerts: optional frontend errors
RenderBackend > LogsAlerts: backend errors and request logs

k6_local > docker_redis: local medium validation support
k6_local > RenderBackend: smoke or approved small tests only
k6_local > VercelFrontend: website smoke
PostDeployValidation > RenderBackend: GET /api/health and public APIs
PostDeployValidation > VercelFrontend: homepage store product cart checkout
PostDeployValidation > AdminUI: confirm COD order in admin

SecurityNotes [label: "Security Notes"] {
  sec_ssr_secret [label: "INTERNAL_SSR_API_SECRET must not be NEXT_PUBLIC"]
  sec_db_url [label: "DATABASE_URL and REDIS_URL backend-only"]
  sec_proxy [label: "do not trust X-Forwarded-For blindly"]
  sec_whitelist [label: "do not IP-whitelist frontend server"]
  sec_limits [label: "keep auth checkout cart admin upload review limits strict"]
  sec_cod [label: "COD manual payment separate from future webhook"]
}

SecurityNotes > VercelFrontend: only browser-safe NEXT_PUBLIC values
SecurityNotes > RenderBackend: private secrets in provider env store
SecurityNotes > ManagedRedis: paid/higher-capacity for staging production
```

Notes:

- Vercel handles Next.js runtime automatically; the standalone start script is mainly for self-hosted/container runs.
- Upstash free/low-quota Redis is not suitable for repeated medium load testing.
- Do not run medium/heavy k6 against production/demo unless provider capacity and approval are confirmed.
- Phase N final deployment validation is pending deployed URLs/provider details.
