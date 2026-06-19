# KNOWN LIMITATIONS

Connect-Shop / ElecSHOP is currently positioned as a small-business ecommerce system. It should not be sold as a marketplace or enterprise platform without additional work.

## Current Possible Limitations

- It is not a marketplace.
- It does not include a multi-vendor seller dashboard.
- It does not include an online payment gateway unless added later.
- It does not include ERP/POS integration unless added later.
- ImageKit production uploads require valid backend environment variables on Render.
- Existing old local image URLs, if any, are not automatically migrated to ImageKit.
- Redis is optional for demos but recommended for production rate limiting/cache.
- Advanced analytics are not included unless added later.
- Policy pages are templates and must be reviewed by the business owner or legal advisor.
- Backup and restore should be tested after production deployment.
- WhatsApp links are manual unless automation is added later.
- Email sending may be mocked if no real email provider key is configured.
- Hosting reliability depends on selected Vercel, Render, PostgreSQL, Redis, and image storage plans.

## Recommended Future Upgrades

- Coupons and discount codes.
- Product variants such as color, storage, and size.
- Brand management improvements.
- Online payments.
- Order export.
- Product import/export.
- Email order notifications.
- Admin new-order notifications.
- ImageKit delete cleanup for replaced or deleted product images.
- ImageKit transformation presets.
- Advanced search.
- Analytics.
- Delivery fee settings.
- Printable invoices/order views.
- Low-stock alerts.

## Client Expectation Notes

Before selling the system, clearly explain what is included in the first version. The best first commercial target is a small shop that needs an online catalog, cart, cash-on-delivery orders, homepage control, and admin management.
