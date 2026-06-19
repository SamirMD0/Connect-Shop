# Phase N Final Deployment Validation

> Date: 2026-06-19
> Scope: Final production/demo deployment validation record for Connect-shop / ElecSHOP.
> Status: Pending external deployment validation. Deployment URLs and provider details were not available in the repository or local env files inspected by Codex.

## Scope Boundary

Phase N is validation-only unless a real deployment bug is found.

No changes should be made to:

- core app behavior
- public-read rate limits
- database schema
- auth, checkout, cart, orders, admin, uploads, reviews, CSRF, validation, sessions, or user logic

This document does not claim support for 1,000-5,000 concurrent users.

## Deployment Metadata

| Item | Value |
| --- | --- |
| Frontend provider | Vercel |
| Frontend deployment URL | Pending: not provided |
| Backend provider | Render |
| Backend deployment URL | Pending: not provided |
| Backend health URL | Pending: not provided |
| Database provider | Pending: not provided |
| Redis provider/tier | Pending: not provided |
| Image/CDN provider | ImageKit/CDN, status pending |
| Payment method | Cash on Delivery/manual order flow |
| Deployment date | Pending: not provided |
| Validation date | Pending external URL/provider details |

Local env values discovered during this pass:

- root `.env`: `FRONTEND_URL=http://localhost:3000`
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

No production/demo Render or Vercel URLs were found locally.

## Backend Validation

Use the deployed backend base URL:

```powershell
$env:API_BASE_URL="https://api.yourdomain.com"
```

Required endpoint checks:

| Check | Expected | Result |
| --- | --- | --- |
| `GET /api/health` | 200 | Pending |
| `GET /api/v1/homepage/full` | 200 | Pending |
| `GET /api/v1/products?limit=12` | 200 | Pending |
| `GET /api/v1/categories` | 200 | Pending |
| `GET /api/v1/brands` | 200 | Pending |
| `GET /api/v1/carousel` | 200 | Pending |

Manual PowerShell checks:

```powershell
$env:API_BASE_URL="https://api.yourdomain.com"
Invoke-WebRequest "$env:API_BASE_URL/api/health" -UseBasicParsing
Invoke-WebRequest "$env:API_BASE_URL/api/v1/homepage/full" -UseBasicParsing
Invoke-WebRequest "$env:API_BASE_URL/api/v1/products?limit=12" -UseBasicParsing
Invoke-WebRequest "$env:API_BASE_URL/api/v1/categories" -UseBasicParsing
Invoke-WebRequest "$env:API_BASE_URL/api/v1/brands" -UseBasicParsing
Invoke-WebRequest "$env:API_BASE_URL/api/v1/carousel" -UseBasicParsing
```

Render log checks:

| Log check | Result |
| --- | --- |
| PostgreSQL connection success | Pending |
| Redis connection success | Pending |
| No Redis quota errors | Pending |
| No Redis connection errors | Pending |
| No migration errors | Pending |
| No unexpected 500 errors | Pending |
| No unexpected public-read 429s during smoke validation | Pending |

## Database Migration Validation

Migration command for the backend environment:

```bash
cd backend && npm run db:migrate
```

Required checks:

| Check | Result |
| --- | --- |
| Migrations complete | Pending |
| Backend starts after migration | Pending |
| Products API returns data or safe empty state | Pending |
| Categories API returns data or safe empty state | Pending |
| Homepage API returns data or safe empty state | Pending |
| Backups/PITR confirmed with provider | Pending |

## Frontend Validation

Use the deployed frontend URL:

```powershell
$env:FRONTEND_URL="https://yourdomain.com"
```

Required checks:

| Check | Expected | Result |
| --- | --- | --- |
| Homepage | 200 | Pending |
| `/store` | 200 | Pending |
| Product detail page | 200 | Pending |
| Cart page | Loads | Pending |
| Checkout page | Loads | Pending |
| Images | Load from ImageKit/CDN | Pending |
| Frontend backend API calls | Successful | Pending |
| Browser console CORS errors | None | Pending |
| Hydration/SSR errors | None unexpected | Pending |
| SSR secret exposure | Not exposed | Pending |

Manual PowerShell checks:

```powershell
$env:FRONTEND_URL="https://yourdomain.com"
Invoke-WebRequest "$env:FRONTEND_URL" -UseBasicParsing
Invoke-WebRequest "$env:FRONTEND_URL/store" -UseBasicParsing
```

Product detail validation needs a real deployed product slug.

## COD Checkout / Manual Order Validation

Use test customer data only.

Required safe test flow:

1. Open deployed frontend.
2. Add an in-stock product to the cart.
3. Go to checkout.
4. Choose Cash on Delivery/manual order flow.
5. Submit a test order.
6. Confirm no online payment processing is required.
7. Confirm the order appears in admin/backend.
8. Confirm order status is correct for COD/manual payment.

| Check | Result |
| --- | --- |
| Product added to cart | Pending |
| Checkout page accepts test customer data | Pending |
| COD/manual order submitted | Pending |
| No online payment required | Pending |
| Order appears in admin/backend | Pending |
| Initial order status correct | Pending |

## Admin Validation

Required checks:

| Check | Result |
| --- | --- |
| Admin login works | Pending |
| Admin products page loads | Pending |
| Admin categories page loads | Pending |
| Admin orders page loads | Pending |
| Admin can see the test COD order | Pending |
| Admin mutation routes remain protected | Pending |

Use a real authorized admin account configured for the deployment. Do not record admin credentials in this document.

## Environment And Security Checks

Required checks:

| Check | Result |
| --- | --- |
| `INTERNAL_SSR_API_SECRET` is not prefixed with `NEXT_PUBLIC` | Pending |
| SSR secret does not appear in frontend bundle/env output | Pending |
| `FRONTEND_URL` matches deployed Vercel domain | Pending |
| CORS allows only expected frontend domain | Pending |
| `DATABASE_URL` is backend-only | Pending |
| `REDIS_URL` is backend-only | Pending |
| ImageKit public endpoint is safe for browser use | Pending |
| ImageKit private key remains backend-only | Pending |
| Session secret remains backend-only | Pending |
| OAuth client secret remains backend-only | Pending |

Suggested local source check before deploy:

```powershell
rg "NEXT_PUBLIC_.*SECRET|NEXT_PUBLIC_.*DATABASE|NEXT_PUBLIC_.*REDIS|NEXT_PUBLIC_.*PRIVATE" frontend backend docs
```

## k6 Smoke Validation

Run smoke first only. Use production/demo URLs through environment variables.

API smoke:

```powershell
$env:API_BASE_URL="https://api.yourdomain.com"; $env:PROFILE="smoke"; k6 run load-tests/k6/api-public-read.js
```

Website smoke:

```powershell
$env:FRONTEND_URL="https://yourdomain.com"; $env:BASE_URL="https://api.yourdomain.com"; k6 run load-tests/k6/website-smoke.js
```

Expected:

| Metric | Expected | Result |
| --- | --- | --- |
| Checks | > 95% | Pending |
| Failed requests | < 1% | Pending |
| Backend 429 responses | 0 | Pending |
| Redis quota errors in logs | 0 | Pending |

## Optional Small Validation

Run only if Redis tier is paid/higher-capacity and backend logs are clean after smoke.

API small:

```powershell
$env:API_BASE_URL="https://api.yourdomain.com"; $env:PROFILE="small"; k6 run load-tests/k6/api-public-read.js
```

Website small:

```powershell
$env:FRONTEND_URL="https://yourdomain.com"; $env:BASE_URL="https://api.yourdomain.com"; k6 run load-tests/k6/website-small.js
```

Do not run medium on free/low-quota Redis.

| Metric | Expected | Result |
| --- | --- | --- |
| API small checks | > 95% | Pending |
| API small failed requests | < 1% | Pending |
| API small backend 429s | 0 | Pending |
| Website small checks | > 95% | Pending |
| Website small failed requests | < 1% | Pending |
| Redis quota/errors | 0 | Pending |

## Final Decision

Current decision: Pending.

The project cannot be marked final deployment validated until:

- deployed frontend URL is provided and checked
- deployed backend URL is provided and checked
- managed PostgreSQL migration status is confirmed
- Redis provider/tier and logs are confirmed
- ImageKit/CDN image loading is confirmed
- COD/manual order flow is tested with safe data
- admin can see the test order
- k6 smoke passes against deployed URLs

Portfolio-deploy readiness: Pending external deployment validation.
