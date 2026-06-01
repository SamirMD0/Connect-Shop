# SELLABLE VERSION CHECKLIST

## 1. Sellable Version Goal

The first sellable version should be a small-business ecommerce system, not a marketplace.

Target version:

- Online catalog
- Cart
- Cash on delivery checkout
- Admin product/category/order management
- Homepage control
- Production deployment
- Basic notifications/contact
- Mobile responsive UI

The goal is to sell a practical online shop that a small business can actually operate, not a complex multi-vendor platform.

## 2. Must-Fix Before Selling

### Critical - Cannot Sell Without These

- [ ] Product CRUD fully tested
- [ ] Category CRUD fully tested
- [ ] Product image upload works in production
- [ ] Product search/filter/sort/pagination works
- [ ] Product detail page works
- [ ] Cart add/remove/update works
- [ ] Checkout/order creation works
- [ ] Cash on delivery supported
- [ ] Cash-on-delivery active-order abuse protection tested
- [ ] Customer phone number required
- [ ] Delivery address fields exist
- [ ] Admin can view orders
- [ ] Admin can update order status
- [ ] Admin can see customer/order details
- [ ] Admin homepage CMS works
- [ ] Login/register/logout works
- [ ] Password reset works
- [ ] Email verification or safe auth flow works
- [ ] Mobile responsive UI checked
- [ ] Production deployment works
- [ ] Database backup plan exists
- [ ] Error handling does not expose sensitive data
- [ ] Security basics enabled
- [ ] Identity-aware mutation rate limits tested
- [ ] Image upload file validation tested
- [ ] Security event logging tested
- [ ] Security event metadata checked for secrets/PII
- [ ] Progressive login/MFA cooldowns tested
- [ ] Domain connected
- [ ] Business contact info exists

### Important - Strongly Recommended

- [ ] WhatsApp contact/order support
- [ ] Email order confirmation
- [ ] Admin order notification
- [ ] Delivery fee settings
- [ ] Printable invoice/order view
- [ ] Low-stock alerts
- [ ] Brand filter/management
- [ ] Product active/inactive toggle
- [ ] SEO metadata for products/categories
- [ ] About page
- [ ] Contact page
- [ ] Privacy policy
- [ ] Return policy
- [ ] Terms page
- [ ] FAQ page

### Nice To Have Later

- [ ] Coupons/discount codes
- [ ] Product variants: color/storage/size
- [ ] Product import/export CSV
- [ ] Order export CSV
- [ ] Reviews/questions
- [ ] Related products
- [ ] Best-selling products
- [ ] Advanced analytics
- [ ] SMS/WhatsApp automation
- [ ] Payment gateway integration
- [ ] Multi-language support

## 3. Testing Checklist

### Customer Flow

- [ ] Register
- [ ] Login
- [ ] Browse products
- [ ] Search product
- [ ] Filter product
- [ ] Open product details
- [ ] Add to cart
- [ ] Update quantity
- [ ] Remove item
- [ ] Add/remove wishlist
- [ ] Checkout with cash on delivery
- [ ] Submit order
- [ ] View order if supported

### Admin Flow

- [ ] Login as admin
- [ ] Create product
- [ ] Edit product
- [ ] Delete/disable product
- [ ] Upload product image
- [ ] Create category
- [ ] Edit category
- [ ] Manage homepage content
- [ ] View order
- [ ] Update order status
- [ ] Check dashboard stats if present

### Production Flow

- [ ] Deploy frontend
- [ ] Deploy backend
- [ ] Run database migrations
- [ ] Connect domain
- [ ] Test environment variables
- [ ] Test image uploads
- [ ] Test database persistence
- [ ] Test backups
- [ ] Test global, auth, checkout, cart, wishlist, admin upload, and admin mutation rate limits
- [ ] Test error pages

## 4. Production Readiness Checklist

- [ ] Environment variables documented
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] PostgreSQL deployed
- [ ] Image storage configured
- [ ] Redis configured if needed
- [ ] CORS configured
- [ ] Cookies/session settings correct
- [ ] HTTPS works
- [ ] Domain connected
- [ ] Database migrations applied
- [ ] Backup strategy documented
- [ ] Logs accessible
- [ ] Admin account setup documented
- [ ] No test credentials exposed
- [ ] No secrets committed

## 5. Client Delivery Checklist

- [ ] Admin guide
- [ ] Login credentials handed over securely
- [ ] Hosting cost explained
- [ ] Domain ownership explained
- [ ] Maintenance terms explained
- [ ] Backup responsibility explained
- [ ] Support scope explained
- [ ] Feature-change pricing explained
- [ ] Demo data removed or replaced
- [ ] Client branding applied
- [ ] Client contact info added
- [ ] Policies added

## 6. Suggested Fix Order

Phase 1:

- Order flow + cash on delivery

Phase 2:

- Admin order management

Phase 3:

- Product/category/image production testing

Phase 4:

- Notifications/contact/WhatsApp

Phase 5:

- Policy/contact/about pages

Phase 6:

- SEO/mobile polish

Phase 7:

- Deployment/backups/domain

Phase 8:

- Documentation/client handover

## 7. Codex Implementation Rule

Do not fix everything at once.

After this checklist is created, implementation must happen one phase at a time.

Each phase must preserve existing logic, routes, variable names, API response shapes, backend security, and database integrity.

Run build/tests after every phase.

## 8. Final Verdict

Connect-Shop can become sellable after the critical checklist is complete and tested end-to-end.

The first sellable target is a small shop needing catalog, cart, cash-on-delivery orders, homepage control, and admin management.
