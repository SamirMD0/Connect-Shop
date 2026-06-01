# CLOUDFLARE / WAF SETUP GUIDE

## 1. Goal

Cloudflare is used as an edge protection layer in front of the ecommerce system to reduce bot traffic, malicious requests, scraping, and basic DDoS pressure before traffic reaches Vercel or Render.

Cloudflare does not replace backend validation. It does not replace backend rate limiting. It does not replace CSRF, authentication, authorization, admin MFA, upload validation, or checkout abuse checks. It is an additional outer layer.

## 2. Recommended Architecture

Recommended request flow:

```text
Customer Browser
-> Cloudflare DNS / Proxy / WAF
-> Vercel frontend
-> Render backend API
-> Render PostgreSQL / Redis / ImageKit
```

The frontend domain should be proxied through Cloudflare where supported. The backend API can use a custom subdomain such as `api.example.com` proxied through Cloudflare, or it can stay on the Render URL while the backend only allows browser requests from the frontend domain.

Best production setup:

- `example.com` -> Vercel
- `www.example.com` -> Vercel
- `api.example.com` -> Render backend
- Cloudflare proxy enabled where Vercel and Render support it

Do not hardcode final domains in code. Use Vercel and Render environment variables.

## 3. DNS Setup

Generic setup:

1. Add the domain to Cloudflare.
2. Change Namecheap nameservers to the Cloudflare nameservers shown in the Cloudflare dashboard.
3. Add DNS records:
   - Apex/root domain record for Vercel.
   - `www` CNAME for Vercel.
   - `api` CNAME for the Render backend if using a custom backend subdomain.
4. Enable the orange-cloud proxy only where the target platform supports proxying.
5. Wait for DNS propagation.
6. Verify HTTPS works for the apex, `www`, and API subdomain if used.

Do not guess Vercel or Render DNS values. Copy the exact records from the Vercel and Render dashboards.

## 4. SSL/TLS Settings

Recommended Cloudflare settings:

- SSL/TLS mode: Full, or Full Strict where possible.
- Always Use HTTPS: enabled.
- Automatic HTTPS Rewrites: enabled.
- Minimum TLS version: TLS 1.2 or higher.
- HSTS: optional after HTTPS is fully verified.

Do not enable HSTS immediately. Test HTTPS, cookies, login, admin MFA, checkout, and image upload first. A bad HSTS rollout can lock browsers into HTTPS for a broken configuration.

## 5. Basic WAF Rules

Start with Managed Challenge or Log mode where available. Move to Block only after verifying there are no false positives.

### Rule 1 - Protect Admin Paths

Match paths:

- `/admin`
- `/admin/*`
- `/api/v1/admin`
- `/api/v1/admin/*`

Recommended action:

- Managed Challenge for broad protection.
- Block or allowlist only if the business has stable admin IPs.

IP allowlisting can lock out admins if their ISP changes their IP address. Use it only when the admin access pattern is predictable.

### Rule 2 - Protect API Mutation Endpoints

Match paths:

- `/api/v1/orders`
- `/api/v1/cart`
- `/api/v1/wishlist`
- `/api/v1/admin`
- `/api/v1/admin/*`
- `/api/v1/auth/login`
- `/api/v1/auth/register`
- `/api/v1/admin/uploads/image`

Recommended action:

- Managed Challenge for suspicious traffic.
- Rate Limit if the Cloudflare plan supports it.

Backend identity-aware rate limits must remain enabled. Cloudflare is mostly IP and edge based; backend limits still protect authenticated users.

### Rule 3 - Block Obvious Bad Bots

Possible signals:

- Empty User-Agent.
- User-Agent contains known suspicious tools that are not needed by the business.
- Missing common browser headers combined with high request rate.
- Repeated invalid method usage.

Do not globally block `curl` or Postman if admins, developers, deployment checks, or monitoring tools need API testing. Prefer Managed Challenge or Log mode first.

### Rule 4 - Block Non-Standard Methods

Allowed methods for this app:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `OPTIONS`

Block unusual methods unless a future feature explicitly requires them.

### Rule 5 - Protect Upload Endpoint

Match path:

- `/api/v1/admin/uploads/image`

Recommended action:

- Managed Challenge or a strict rate rule.

Keep backend upload validation enabled. Cloudflare should reduce abusive traffic before it reaches the backend, but invalid files must still be rejected by the API.

## 6. Cloudflare Rate Limiting Recommendations

Suggested safe starting rules:

Auth:

- Paths: `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/forgot-password`
- Action: Managed Challenge or temporary block after repeated requests per IP.

Checkout:

- Path: `/api/v1/orders`
- Action: low threshold, because order creation is expensive and business-critical.

Upload:

- Path: `/api/v1/admin/uploads/image`
- Action: strict threshold.

Product search:

- Path: `/api/v1/products`
- Action: higher threshold, intended mainly to reduce scraping.

Cloudflare limits are edge/IP based. Backend Redis-backed identity-aware limits remain necessary.

## 7. Bot Protection

Recommended:

- Enable Bot Fight Mode if available.
- Use Managed Challenge instead of hard block at first.
- Monitor false positives.
- Do not challenge every storefront visitor.
- Avoid harming checkout conversion.

Avoid aggressive challenges on:

- Homepage
- Store listing
- Product detail
- Cart
- Checkout page loads

Challenge more aggressively on:

- Auth abuse paths
- Admin paths
- Upload endpoint
- Suspicious high-rate API traffic

## 8. CORS With Cloudflare

Cloudflare does not remove the need for correct backend CORS.

The backend should still:

- Allow only the production frontend origin.
- Allow staging origin separately if a staging backend is deployed.
- Never use wildcard `*` with credentials.
- Support `OPTIONS` preflight requests.
- Keep cookies and credentialed requests constrained to trusted origins.

This backend currently uses `FRONTEND_URL` for strict CORS. It does not use a separate `CORS_ORIGIN` variable.

If using `api.example.com`, set environment variables like:

```env
FRONTEND_URL=https://example.com
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SITE_URL=https://example.com
```

If the public frontend uses `https://www.example.com`, then `FRONTEND_URL` must exactly match `https://www.example.com`.

## 9. Real IP / Proxy Headers

Express needs proxy awareness so `req.ip`, logs, and IP fallback rate-limit keys do not use only the immediate proxy address.

This backend sets:

```ts
app.set('trust proxy', 1);
```

This is appropriate for a Render-style deployment where the app sits behind one platform proxy/load balancer. If the backend API is also proxied through Cloudflare before Render, verify logs and rate-limit behavior in staging. In that two-proxy topology, the app may see Cloudflare as the client unless the platform forwards the full client chain correctly.

Do not blindly set `trust proxy` to `true`. Trusting all proxy headers lets clients spoof IP-related headers if the app is ever exposed directly.

## 10. Backend URL Exposure

Avoid exposing the raw Render backend URL publicly if using `api.example.com`. Cloudflare protects traffic that goes through Cloudflare, not direct-to-Render traffic.

The raw Render URL may still be reachable unless Render access restrictions or another private networking approach is configured. Backend rate limits, auth, CSRF, CORS, admin MFA, upload validation, and checkout abuse checks must stay active even with Cloudflare enabled.

Optional future hardening:

- Keep backend CORS restricted to the final frontend origin.
- Use private networking where available.
- Consider Cloudflare Tunnel later if it fits the hosting model.

## 11. Security Headers

The backend already uses Helmet, which adds useful security headers. Keep Helmet enabled.

Cloudflare can add extra headers, but it should not replace backend headers.

Recommended header posture:

- Keep `X-Content-Type-Options` from Helmet.
- Keep sane referrer policy behavior.
- Add HSTS only after HTTPS is verified.
- Consider a Content-Security-Policy later if practical for the frontend.

Do not disable Helmet to solve Cloudflare issues. Fix the specific conflicting setting instead.

## 12. Testing Checklist

DNS:

- Domain resolves.
- `www` works.
- API subdomain works if used.
- HTTPS certificate is valid.

Frontend:

- Homepage loads.
- Store listing loads.
- Product pages load.
- Cart and checkout pages load.

Backend:

- Health endpoint works.
- CORS works from the production frontend origin.
- Login works.
- Logout works.
- CSRF-protected requests work.
- Admin login and MFA work.
- Image upload works.
- Checkout/order creation works.

WAF:

- Admin path challenge works if configured.
- Upload endpoint protection works.
- Obvious bot requests are challenged or blocked.
- Normal users are not blocked.
- False positives are monitored.

Rate limits:

- Backend limits still trigger.
- Cloudflare limits/challenges trigger.
- Normal users are not double-blocked.

## 13. Rollback Plan

If Cloudflare causes production issues:

1. Disable the specific WAF rule causing the issue.
2. Switch Managed Challenge or Block rules to Log mode if available.
3. Temporarily gray-cloud the affected DNS record if needed.
4. Revert environment changes such as `NEXT_PUBLIC_API_URL` or `FRONTEND_URL` if they were changed.
5. Keep backend rate limits and backend validation active.

Do not disable backend rate limits just because Cloudflare is enabled.

## 14. What Not To Do

- Do not block all VPNs.
- Do not challenge every page.
- Do not rely only on Cloudflare.
- Do not disable backend CSRF.
- Do not set CORS to wildcard with credentials.
- Do not hardcode final domains in code.
- Do not enable HSTS before testing.
- Do not block all unknown user agents without monitoring.
- Do not disable backend rate limits, upload validation, checkout abuse protection, auth, or admin MFA.
