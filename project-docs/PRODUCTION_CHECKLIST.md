# PRODUCTION CHECKLIST

Use this checklist before selling or launching Connect-Shop / ElecSHOP for a real small business.

## Frontend

- [ ] Vercel project created with root directory `frontend`.
- [ ] `npm run build` passes.
- [ ] `NEXT_PUBLIC_API_URL` points to the Render backend.
- [ ] `NEXT_PUBLIC_SITE_URL` points to the final HTTPS domain.
- [ ] Business phone, WhatsApp, email, address, and hours are set.
- [ ] Custom domain is connected.
- [ ] HTTPS is enabled.
- [ ] `robots.txt` loads.
- [ ] `sitemap.xml` loads.

## Backend

- [ ] Render Web Service created with root directory `backend`.
- [ ] Build command is `npm install && npm run build`.
- [ ] Start command is `npm start`.
- [ ] `NODE_ENV=production`.
- [ ] `DATABASE_URL` is set.
- [ ] `SESSION_SECRET` is strong and not committed.
- [ ] `FRONTEND_URL` matches the final frontend origin.
- [ ] Google OAuth vars are set if OAuth is used.
- [ ] `REDIS_URL` is set if production Redis is used.
- [ ] Redis fallback has been checked by running without `REDIS_URL` in local/staging.
- [ ] Public read cache behavior is documented in `project-docs/REDIS_CACHE_POLICY.md`.
- [ ] `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` are set in Render.
- [ ] ImageKit private key is not exposed to the frontend.
- [ ] Logs are accessible in Render.
- [ ] Rate limits are tested.

## Database

- [ ] Render PostgreSQL database created.
- [ ] Production database is not a temporary free/trial database for a real business.
- [ ] Render PostgreSQL backups/snapshots are enabled if the plan supports them.
- [ ] Backup retention is confirmed for the selected database plan.
- [ ] Manual backup process is documented.
- [ ] Backup has been taken before first launch.
- [ ] `npm run db:migrate` has been run.
- [ ] Backup has been taken before production migrations.
- [ ] `schema_migrations` table confirms migrations applied.
- [ ] Backups/snapshots are configured.
- [ ] Backup restore has been tested in staging or a temporary database.

## Domain And Security

- [ ] Namecheap domain purchased or transferred.
- [ ] Vercel DNS instructions copied exactly into Namecheap.
- [ ] Apex and `www` domain behavior tested.
- [ ] Backend CORS allows only the production frontend origin.
- [ ] Cookie auth works over HTTPS.
- [ ] CSRF-protected actions work from the production frontend.
- [ ] No secrets are committed.
- [ ] Test credentials are removed or changed.

## Store Workflows

- [ ] Product browsing works.
- [ ] Product detail pages work.
- [ ] Search/filter/sort/pagination work.
- [ ] Homepage, categories, featured products, product detail, and product list response shapes match with and without Redis.
- [ ] Product images display.
- [ ] Product image upload returns an ImageKit URL in production.
- [ ] Product image URL is saved in PostgreSQL as text.
- [ ] Cart add/update/remove works.
- [ ] Checkout with cash on delivery works.
- [ ] Required phone/address validation works.
- [ ] Order is saved with order items.
- [ ] Admin login works.
- [ ] Admin product/category CRUD works.
- [ ] Admin order list/detail works.
- [ ] Admin order status update works.
- [ ] Contact, About, FAQ, Privacy Policy, Return Policy, and Terms pages load.
- [ ] WhatsApp links open with the correct business number.

## Production Operations

- [ ] Error pages are tested.
- [ ] Logs do not expose secrets.
- [ ] Database backup responsibility is assigned.
- [ ] Backup storage location is private and access-controlled.
- [ ] Restore approval process is agreed with the business owner/client.
- [ ] ImageKit account ownership, billing, and access are assigned.
- [ ] Redis is configured if traffic or multiple backend instances require it.
- [ ] Redis cache invalidation is checked after product, category, homepage, and carousel admin updates.
- [ ] Render backend plan is always-on for production.
