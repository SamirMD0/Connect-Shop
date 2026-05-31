# DEPLOYMENT GUIDE

This guide prepares Connect-Shop / ElecSHOP for the selected production stack:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL
- Images: ImageKit for production admin uploads, local fallback for development only
- Domain: Namecheap
- Redis: optional Render Redis-compatible Key Value or Upstash Redis

Use placeholder values only in committed files. Real secrets belong in Vercel and Render environment settings.

## 1. Required Environment Variables

### Frontend: Vercel

Set these in the Vercel project for the `frontend` app:

| Variable | Example | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-render-backend.onrender.com` | Public Render backend URL. |
| `NEXT_PUBLIC_SITE_URL` | `https://www.your-domain.com` | Final HTTPS domain used for SEO, sitemap, and sharing. |
| `NEXT_PUBLIC_APP_NAME` | `ELECTRO SHOP` | Optional brand name. |
| `NEXT_PUBLIC_BUSINESS_PHONE` | `+961 00 000 000` | Public support phone. |
| `NEXT_PUBLIC_BUSINESS_WHATSAPP` | `+96100000000` | Public WhatsApp number in international format. |
| `NEXT_PUBLIC_BUSINESS_EMAIL` | `support@example.com` | Public support email. |
| `NEXT_PUBLIC_BUSINESS_ADDRESS` | `Lebanon` | Public business/service area. |
| `NEXT_PUBLIC_BUSINESS_HOURS` | `Monday to Saturday, 9:00 AM - 8:00 PM` | Public support hours. |

Local frontend values belong in `frontend/.env.local`. Use `frontend/.env.example` as the safe template.

### Backend: Render Web Service

Set these in the Render backend service:

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables secure cookies. |
| `PORT` | `5000` | Render usually injects `PORT`; keep app compatible. |
| `DATABASE_URL` | `postgresql://...` | Copy from Render PostgreSQL internal connection string. |
| `DB_STATEMENT_TIMEOUT_MS` | `10000` | Optional query timeout. |
| `SESSION_SECRET` | `generate-a-long-random-secret` | Must be at least 32 characters; use a strong random value. |
| `FRONTEND_URL` | `https://www.your-domain.com` | Exact frontend origin allowed by CORS and auth redirects. |
| `GOOGLE_CLIENT_ID` | `your-google-client-id` | Required by current backend env validation. |
| `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Required by current backend env validation. |
| `GOOGLE_CALLBACK_URL` | `https://your-render-backend.onrender.com/api/v1/auth/google/callback` | Must match Google OAuth settings. |
| `COOKIE_MAX_AGE` | `604800000` | Optional session cookie lifetime in ms. |
| `REDIS_URL` | `redis://...` | Optional. If missing, the app falls back to in-memory rate limiting. |
| `RESEND_API_KEY` | `re_...` | Optional. Email service logs mock emails if missing. |
| `IMAGEKIT_PUBLIC_KEY` | `public_...` | Required in production for admin image uploads. Get from ImageKit dashboard. |
| `IMAGEKIT_PRIVATE_KEY` | `private_...` | Required in production. Backend-only secret; never expose to the frontend. |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/your_id` | Required in production. ImageKit URL endpoint. |
| `IMAGEKIT_FOLDER` | `/connect-shop` | Optional folder for uploaded admin images. |

The backend currently uses `FRONTEND_URL` for strict CORS. It does not use a separate `CORS_ORIGIN` variable.

## 2. Vercel Frontend Deployment

Create a Vercel project from the repository:

- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Output: handled automatically by Vercel for Next.js

After deployment:

- Set `NEXT_PUBLIC_API_URL` to the Render backend URL.
- Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain.
- Confirm product browsing, cart, checkout, contact pages, `robots.txt`, and `sitemap.xml`.
- Add the custom domain only after Namecheap DNS is configured.

## 3. Render Backend Deployment

Create a Render Web Service:

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Runtime: Node.js
- Health check path: use `/api/v1/health` if available; otherwise use the root/API route Render can reach.

Production notes:

- Use a paid always-on service for ecommerce. Free/sleeping services are not ideal because checkout/admin requests may be delayed.
- Set `FRONTEND_URL` to the exact Vercel/custom-domain origin, including `https://`.
- Keep `NODE_ENV=production` so cookies use the secure flag.
- Do not weaken CORS or CSRF to solve deployment issues. Fix origins and HTTPS configuration instead.

## 4. Render PostgreSQL

Create a Render PostgreSQL database and copy its `DATABASE_URL` into the backend service.

Run migrations after deployment:

```bash
npm run db:migrate
```

For local development, run that command from `backend` with `DATABASE_URL` set. On Render, run it from a one-off shell or deploy job after the database exists and before real traffic uses the app.

Do not use `db:schema` against a production database unless you fully understand the schema file impact. Use migrations for production changes.

Production database notes:

- Do not rely on free/trial databases for serious production.
- Users, products, orders, carts, admin data, and homepage CMS content are business-critical.
- Verify migrations by checking the `schema_migrations` table.
- Enable Render PostgreSQL backups/snapshots if the selected plan supports them.
- Confirm backup retention is acceptable for the business; upgrade the database plan if it is not.
- Take a backup before running production migrations or bulk product imports.
- Test restore on a staging or temporary database before launch.

Manual backup option:

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" | gzip > backups/connect-shop-YYYY-MM-DD.sql.gz
```

Manual restore should be tested on staging first:

```bash
gunzip -c backups/connect-shop-YYYY-MM-DD.sql.gz | psql "$DATABASE_URL"
```

The repository also includes manual helper scripts:

```bash
bash scripts/backup-db.sh
bash scripts/restore-db.sh backups/connect-shop-YYYY-MM-DD.sql.gz
```

On Windows, run these scripts through Git Bash/WSL or use the `pg_dump` and `psql` commands manually. See `BACKUP_AND_RECOVERY.md` for the full backup and recovery guide.

## 5. Namecheap Domain And DNS

Buy or manage the domain in Namecheap, then connect it to Vercel.

General flow:

1. Add the domain in Vercel.
2. Copy the exact DNS records Vercel gives you.
3. In Namecheap DNS, add the exact records from Vercel.
4. Usually this includes an apex record and a `www` CNAME, but do not guess final values.
5. Wait for DNS propagation.
6. Enable/verify HTTPS in Vercel.
7. Set `NEXT_PUBLIC_SITE_URL=https://www.your-domain.com`.
8. Set backend `FRONTEND_URL=https://www.your-domain.com`.

## 6. CORS, Cookies, And CSRF Checks

The backend has strict CORS and credential support:

- Only `FRONTEND_URL` is allowed as the browser origin.
- Cookies are signed with `SESSION_SECRET`.
- Secure cookies are enabled when `NODE_ENV=production`.
- CSRF checks require the CSRF cookie and `X-CSRF-Token` header for unsafe methods.

Before launch, test:

- Register/login/logout.
- Google OAuth callback, if used.
- Authenticated cart/order/admin actions.
- Checkout submission from the production frontend.
- Admin order status update from the production frontend.

## 7. Image Storage

Admin image uploads use ImageKit in production through `POST /api/v1/admin/uploads/image`.

The backend receives a base64 image data URL, validates the MIME type and decoded image bytes, uploads to ImageKit, and returns the existing response shape with an ImageKit URL:

```json
{
  "success": true,
  "url": "https://ik.imagekit.io/..."
}
```

Production requirements:

- Set `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` in the Render backend environment.
- Keep the private key backend-only. Do not add ImageKit private keys to frontend variables.
- Store only returned image URLs in PostgreSQL.
- Do not store image binary data in PostgreSQL.
- Do not rely on local uploads for Vercel/Render production.

Local development behavior:

- If ImageKit variables exist, local uploads also go to ImageKit.
- If ImageKit variables are missing and `NODE_ENV` is not `production`, uploads fall back to `frontend/public/uploads/admin`.

Limits:

- Allowed types: PNG, JPG/JPEG, WEBP, and GIF.
- SVG is not allowed.
- Max decoded image size: 4 MB.
- Upload route JSON parser limit: 6 MB for base64 overhead.

See `IMAGEKIT_SETUP.md` for detailed setup and troubleshooting.

## 8. Redis

Redis is optional for demos and local development. The backend can run without `REDIS_URL` and will use in-memory rate limiting with no read-through cache.

For production:

- Use Render Redis-compatible Key Value or Upstash Redis.
- Set `REDIS_URL` in Render.
- Use Redis-backed rate limiting when traffic grows or multiple backend instances are used.
- Use Redis read-through caching for safe public reads.

Cached public reads:

- Homepage CMS: 180 seconds.
- Categories: 600 seconds.
- Featured products: 180 seconds.
- Product detail by slug: 180 seconds.
- Product list/search/filter pages: 45 seconds.
- Public carousel: 180 seconds.

Not cached:

- Auth/session/CSRF endpoints.
- Cart, wishlist, checkout, and orders.
- Admin permission checks.
- User-specific or personalized responses.
- Error responses.

Redis failures are handled as cache misses. The API should continue working without exposing Redis errors to clients. See `REDIS_CACHE_POLICY.md` for cache keys and invalidation rules.

## 9. Deployment Verification

After deployment:

- Vercel frontend loads on the custom domain.
- Render backend responds over HTTPS.
- PostgreSQL connection works.
- `npm run db:migrate` has completed.
- Render PostgreSQL backups/snapshots are enabled or a manual backup plan is documented.
- A backup has been taken before first launch.
- Backup restore has been tested on staging or a temporary database.
- ImageKit environment variables are set in Render.
- Admin product image upload returns an ImageKit URL.
- `REDIS_URL` is set if production Redis is used.
- Public homepage, categories, featured products, and product detail endpoints still return the same response shapes with or without Redis.
- CORS works from the frontend domain.
- Login/register/logout work.
- Product browsing works.
- Cart and cash-on-delivery checkout work.
- Admin order management works.
- Contact, policy, sitemap, and robots pages load.
