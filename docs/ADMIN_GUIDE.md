# ADMIN GUIDE

This guide explains how a store admin should operate Connect-Shop / ElecSHOP after launch.

## 1. Login

- Open the admin dashboard URL provided during handover.
- Log in with the admin account created for the business.
- Complete MFA if it is enabled for the admin account.
- Never share admin credentials in chat, email, screenshots, or GitHub.
- Each admin should have their own account when possible.

## 2. Dashboard

The dashboard is the starting point for store management. Depending on enabled modules, it can show order activity, products, customers, homepage content, and admin tools.

Use the dashboard to quickly check whether new or pending orders need action before changing products or homepage content.

## 3. Products

Use the Products area to manage the store catalog.

Common actions:

- Create a product with name, slug, description, price, stock, category, brand, SKU, compare-at price, image URL, and specs when available.
- Edit product details when pricing, stock, description, or images change.
- Delete or disable products only when the business no longer wants them visible.
- Upload or set product images.
- Check that product images display correctly on the storefront and product detail page.
- Keep SKU and slug values unique.

Image recommendations:

- Use clear product photos with consistent background and aspect ratio.
- Compress images before upload.
- Store image URLs, not image binary data, in PostgreSQL.
- For production, use ImageKit or similar external storage/CDN instead of local uploads.

## 4. Categories

Use the Categories area to organize products.

Common actions:

- Create and edit categories.
- Set category names and slugs clearly.
- Add category images if supported.
- Use parent categories only when the store needs nested navigation.
- Avoid deleting categories that still contain products unless the products are moved first.

## 5. Orders

Use Orders to manage customer purchases.

Admins should be able to:

- View the orders list.
- Open an order detail.
- See customer name, phone number, delivery address, and notes.
- See order items, item quantities, prices, subtotal, and total.
- See payment method, especially cash on delivery.
- Update order status.

Suggested small-business order flow:

- `pending`: New order received and not yet confirmed.
- `confirmed`: Customer was contacted and order is accepted.
- `processing`: Order is being prepared.
- `out_for_delivery`: Order is with delivery/courier if this status is available.
- `delivered`: Customer received the order and COD payment was collected.
- `cancelled`: Order was cancelled by the customer or store.

Cash on delivery handling:

- Call or message the customer before dispatch when needed.
- Confirm phone number and delivery address.
- Do not mark an order as delivered until the customer receives it and payment is handled.
- Use cancelled only when the order will not be fulfilled.

## 6. Homepage CMS

Use homepage CMS tools to manage storefront presentation.

Depending on the enabled CMS sections, admins can manage:

- Carousel/slides
- Promo banners
- Homepage sections
- Images, text, and buttons
- Active/inactive content
- Sort order/display order

Before publishing homepage changes:

- Check that links point to valid pages.
- Check that images display on mobile and desktop.
- Keep titles short enough to fit the design.

## 7. Customers/Users

If customer/user management is enabled, use it to inspect customer records and support order questions.

If admin roles/permissions are enabled:

- Give users only the permissions they need.
- Remove admin access when someone no longer works with the business.
- Require MFA for admin accounts when available.

## 8. Support Workflow

For WhatsApp or phone support:

- Ask the customer for their order number.
- Confirm the customer name and phone number.
- Review the order detail in admin.
- Confirm address and delivery notes.
- Update order status after action is taken.

For COD orders:

- Confirm order before delivery if required.
- Check stock before confirming.
- Tell the customer the expected delivery process.
- Record cancellation or delivery changes through the admin order status.

## 9. Safety Rules

- Do not delete products, categories, or orders without a clear reason.
- Check stock before confirming an order.
- Use strong passwords.
- Do not share one admin account between multiple people.
- Take a backup before bulk changes or major catalog updates.
- Do not paste secrets or admin credentials into public tools.

