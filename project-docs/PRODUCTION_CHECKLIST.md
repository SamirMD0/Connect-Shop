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
- [ ] Cloudflare DNS/proxy is connected where supported.
- [ ] `robots.txt` loads.
- [ ] `sitemap.xml` loads.
- [ ] Frontend uptime check is configured for the homepage.
- [ ] Store page uptime check is configured if supported by the monitoring tool.
- [ ] Frontend deployment logs are accessible.

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
- [ ] Identity-aware mutation limits are tested for checkout, cart, wishlist, admin uploads, admin mutations, reviews, and product questions.
- [ ] Checkout active COD order cap is tested for authenticated users and guest phone numbers.
- [ ] Image upload MIME, extension, magic-byte, size, and filename validation are tested.
- [ ] Security event logging table exists after migrations.
- [ ] Failed login, rate-limit hit, checkout abuse block, and upload rejection create security events.
- [ ] Security event metadata does not include passwords, tokens, cookies, or raw image data.
- [ ] Failed login cooldown is tested after 10 failed attempts for the same email hash.
- [ ] IP login cooldown is tested after repeated failures from the same IP.
- [ ] Admin MFA cooldown is tested after 5 failed MFA attempts.
- [ ] Login and MFA cooldown responses use generic messages.
- [ ] `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` are set in Render.
- [ ] ImageKit private key is not exposed to the frontend.
- [ ] Logs are accessible in Render.
- [ ] Backend health uptime check is configured.
- [ ] Alert email is configured for backend downtime.
- [ ] 5xx error and database connection error review process is defined.
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
- [ ] Backup status review or alert process is defined.
- [ ] Database storage usage is checked before launch.

## Domain And Security

- [ ] Namecheap domain purchased or transferred.
- [ ] Namecheap nameservers point to Cloudflare if Cloudflare is used.
- [ ] Vercel DNS instructions copied exactly into Cloudflare DNS.
- [ ] Render API DNS record copied exactly into Cloudflare DNS if using `api` subdomain.
- [ ] Apex and `www` domain behavior tested.
- [ ] API subdomain behavior tested if used.
- [ ] Cloudflare HTTPS works.
- [ ] Cloudflare basic WAF rules are enabled.
- [ ] Cloudflare admin/API/upload protections are configured.
- [ ] Cloudflare false positives are tested against normal browsing, login, checkout, admin MFA, and image upload.
- [ ] Backend CORS allows only the production frontend origin.
- [ ] Backend rate limits remain enabled behind Cloudflare.
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
- [ ] Admin image upload limit returns the standard rate-limit error after repeated uploads.
- [ ] Admin image upload rejects SVG, renamed text files, mismatched extensions, and files over 5 MB.
- [ ] Product image URL is saved in PostgreSQL as text.
- [ ] Cart add/update/remove works.
- [ ] Checkout with cash on delivery works.
- [ ] New COD checkout is blocked after 3 active orders for the same user or guest phone number.
- [ ] Delivered and cancelled orders do not count against the COD active-order cap.
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
- [ ] Monitoring plan reviewed: `MONITORING_AND_ALERTING_PLAN.md`.
- [ ] `security_events` review process is defined.
- [ ] `admin_audit_logs` review process is defined.
- [ ] ImageKit dashboard access is confirmed.
- [ ] Redis dashboard access is confirmed if Redis is used.
- [ ] Incident response owner is assigned.
- [ ] Client knows who to contact if the site breaks.
- [ ] Database backup responsibility is assigned.
- [ ] Backup storage location is private and access-controlled.
- [ ] Restore approval process is agreed with the business owner/client.
- [ ] ImageKit account ownership, billing, and access are assigned.
- [ ] Redis is configured if traffic or multiple backend instances require it.
- [ ] Redis cache invalidation is checked after product, category, homepage, and carousel admin updates.
- [ ] Render backend plan is always-on for production.
