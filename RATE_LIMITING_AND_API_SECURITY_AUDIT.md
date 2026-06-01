# RATE LIMITING AND API SECURITY AUDIT

## 1. Executive Summary

The Connect-Shop API currently features a solid baseline of rate limiting using `express-rate-limit` backed by Redis, plus Phase 1 identity-aware limits for high-value authenticated mutation routes. Global and auth limits still use IP-based protection, while checkout, cart, wishlist, admin mutations, admin image uploads, reviews, and product questions now prefer authenticated user IDs.

- **Is the current rate limiting production-ready?** Yes, for basic abuse prevention and first sellable launch. It now has route-specific depth for high-stakes mutation endpoints.
- **Is it only IP-based or also identity-based?** Both. Global/auth limits are IP-based; protected authenticated mutations are identity-aware with IP fallback.
- **Is Redis used for distributed rate limiting?** Yes. `rate-limit-redis` is implemented and gracefully falls back if Redis is offline.
- **Is API gateway/WAF implemented or only recommended for deployment?** It is documented for deployment via Cloudflare. No infrastructure-as-code or provider-managed WAF config is committed in the repo.
- **Is behavior-based bot detection implemented?** Lightweight behavior/security event logging is implemented. It records suspicious events but does not automatically block users.
- **Is progressive protection implemented?** Partially. Failed login and admin MFA cooldowns are implemented. No CAPTCHA provider or permanent account lockout is implemented.
- **What is the biggest current gap?** Operational tuning and optional CAPTCHA remain future work. The app now has Phase 1 identity-aware mutation limits, Phase 2 checkout/upload abuse protections, Cloudflare/WAF deployment guidance, lightweight security event logging, and progressive auth cooldowns.

### Scores

| Area | Score /10 | Verdict |
|---|---:|---|
| Rate limiting | 8/10 | Solid baseline plus identity-aware mutation limits. |
| Redis/distributed enforcement | 9/10 | Excellent implementation with fail-open (`passOnStoreError`). |
| Identity-based abuse prevention | 6/10 | Implemented for high-value authenticated mutations; auth and anonymous public reads remain IP-based. |
| API gateway readiness | 6/10 | Cloudflare deployment guidance is documented; actual DNS/WAF setup happens in Cloudflare. |
| WAF readiness | 6/10 | Cloudflare WAF rules are documented, but not applied until configured in the Cloudflare dashboard. |
| Bot/behavior detection | 5/10 | Lightweight security event logging exists; no automatic blocking or anomaly scoring. |
| Progressive protection | 6/10 | Login and MFA cooldowns exist; CAPTCHA/account lockout are intentionally deferred. |
| Overall API security maturity | 7.5/10 | Good enough for first small-business launch with Redis configured; still needs operational tuning and optional WAF/CAPTCHA later. |

## 2. Current Rate Limiting Implementation

Based on inspection of `backend/src/middleware/rateLimiter.ts`, `app.ts`, and routing files:

- **General Limiter:** 100 requests per 15 minutes per IP in production (1000 in dev). Applied globally in `app.ts`.
- **Auth Limiter:** 20 requests per 15 minutes per IP in production (200 in dev). Applied explicitly to auth mutations (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/mfa/setup`, `/mfa/verify`).
- **Identity-Aware Mutation Limiters:** Implemented for checkout/order creation, cart mutations, wishlist mutations, admin mutations, admin image uploads, review creation, and product question creation.
- **Checkout Abuse Protection:** Cash-on-delivery checkout blocks a user or guest phone number from creating a new COD order when there are already 3 active COD orders.
- **Upload Abuse Protection:** Admin image uploads validate data URL MIME type, original file extension, decoded file size, and magic bytes before ImageKit/local upload.
- **Redis Integration:** Fully implemented using `rate-limit-redis` with separate prefixes including `rl:general:`, `rl:auth:`, `rl:checkout:`, `rl:cart:`, `rl:wishlist:`, `rl:admin-mutation:`, `rl:upload:`, and `rl:review:`.
- **Fallback Behavior:** If `REDIS_URL` is omitted, the app disables Redis. If Redis crashes, `passOnStoreError: true` allows the app to fail-open (bypass rate limits rather than crashing the API).
- **Excluded Routes:** `/auth/me`, `/auth/sessions`, and `/auth/logout` correctly bypass the strict auth limiter.
- **Current Limiter Key:** Global/auth limiters are IP-based. Mutation-specific limiters use `user:<userId>` when `req.user` exists, then fall back to an IPv6-safe IP key. They never key on raw auth tokens, email, or phone.
- **Missing Protection:** API gateway/WAF rules, CAPTCHA/lockout escalation, and behavior analytics are not implemented.

## 3. Feature Check Table

| Feature | Implemented? | Evidence from Code | Current Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Rate Limit by Identity | Yes, Phase 1 | `rateLimiter.ts` exports checkout/cart/wishlist/admin/upload/review identity limiters. | Auth endpoints still use IP-only limits; distributed attacks can still target login/register. | Add account lockout/CAPTCHA later if abuse appears. | Done for mutation routes |
| Redis Distributed Limiting | Yes | `rateLimiter.ts` uses `RedisStore`. | None. | Keep local dev fallback; alert if missing in prod. | Done |
| API Gateway Enforcement | Deployment-documented | `CLOUDFLARE_WAF_SETUP.md` documents Cloudflare DNS/proxy/WAF architecture. | Cloudflare must still be configured outside the repo. | Apply guide in Cloudflare dashboard before public marketing. | Medium |
| Web Application Firewall | Deployment-documented | `CLOUDFLARE_WAF_SETUP.md` documents WAF/custom rules and rollback. | WAF rules are not active until configured in Cloudflare. | Start with Managed Challenge/Log mode and tune. | Medium |
| Behavior-Based Detection | Lightweight | `security_events` table and `securityEvent.service.ts`. | Events are recorded but not surfaced in an admin UI or alerting system yet. | Add admin dashboard/alerts later. | Implemented for logging |
| Progressive Protection | Partial | Failed login cooldown and MFA cooldown use `security_events`. Admin MFA exists via TOTP. | No CAPTCHA provider or permanent lockout. | Add CAPTCHA only if abuse appears. | Implemented partially |

### 1. Rate Limit by Identity, Not Just IP
Attackers can bypass IP limits using VPNs or botnets. Production systems must limit by user ID or session ID for authenticated routes.
- **Implemented?** Yes, Phase 1.
- **Protected endpoints:** Checkout/order creation, cart mutations, wishlist mutations, admin mutations, admin image uploads, review creation, and product question creation.
- **Key strategy:** `user:<userId>` when authenticated; IPv6-safe IP fallback for guest checkout or unauthenticated edge cases.
- **Remaining work:** Add login account lockout/CAPTCHA later only if abuse appears.

### 2. Distributed Rate Limiting with Redis
- **Implemented?** Yes. 
- **Does it work across instances?** Yes, because state is centralized in Redis.
- **Fallback:** It fails-open (`passOnStoreError: true`). This is acceptable for a startup (uptime > security), but for enterprise, you might want it to fail-closed. Keep the current fallback.

### 3. API Gateway Enforcement
- **Implemented?** Documented for deployment.
- **Recommendation:** Use Cloudflare proxy (`Orange Cloud`) in front of the production domain and API subdomain where supported. Render is acceptable for staging, but exposing the raw Render URL in production is risky.

### 4. Web Application Firewall / WAF
- **Implemented?** Documented for deployment, not configured in code. Internal app protections (Helmet, CORS, XSS-clean) are present.
- **Recommendation:** Configure Cloudflare WAF using `CLOUDFLARE_WAF_SETUP.md`. Cloudflare complements backend validation; it does not replace it.

### 5. Behavior-Based Detection
- **Implemented?** Lightweight logging only.
- **What is logged:** Failed login, MFA failure, password reset failure, invalid sessions, rate-limit hits, checkout abuse blocks, upload rejections, and suspicious admin access attempts.
- **Recommendation:** Review events manually from PostgreSQL for now. Add admin UI and alerts later if traffic or abuse grows.

### 6. Progressive Protection
- **Implemented?** Partially.
- **What is implemented:** 10 failed login attempts for the same email hash within 30 minutes triggers a 30-minute cooldown. 30 failed login attempts from the same IP within 30 minutes also triggers a 30-minute cooldown. 5 failed MFA attempts for the same admin within 15 minutes triggers a 15-minute cooldown.
- **What is not implemented:** CAPTCHA provider, CAPTCHA UI, SMS OTP, WhatsApp OTP, permanent account lockout, and checkout CAPTCHA.
- **Recommendation:** Keep CAPTCHA optional for later. Do not add CAPTCHA everywhere by default because it hurts ecommerce conversion.

## 4. Route-by-Route Protection Review

| Route/Area | Current Protection | Missing Protection | Recommendation |
|---|---|---|---|
| `/api/v1/auth/login` | IP Auth Limiter (20/15m) | Account lockout / IP ban | Adequate for v1. |
| `/api/v1/auth/register` | IP Auth Limiter (20/15m) | Identity/Device limit | Adequate for v1. |
| `/api/v1/auth/me` | General Limiter (100/15m) | None | Good. |
| `/api/v1/auth/password-reset` | IP Auth Limiter (20/15m) | None | Good. |
| `/api/v1/cart` | General Limiter + Identity Mutation Limiter (60/15m prod) | None for Phase 1 | Monitor for abuse and tune limits. |
| `/api/v1/wishlist` | General Limiter + Identity Mutation Limiter (60/15m prod) | None for Phase 1 | Monitor for abuse and tune limits. |
| `/api/v1/orders` (Checkout) | General Limiter + Identity Checkout Limiter (5/hr prod) + 3 active COD order cap | WAF/gateway layer | Monitor false positives and tune if needed. |
| `/api/v1/admin/*` | General Limiter + MFA + Admin Mutation Limiter (100/15m prod) | WAF/gateway layer | Add Cloudflare/WAF rules before public marketing. |
| `/api/v1/admin/uploads/image`| General Limiter + MFA + Upload Limiter (10/hr prod) + 5MB max + MIME/extension/magic-byte validation | Storage quota monitoring | Monitor ImageKit quota and audit logs. |
| `/api/v1/products` | General Limiter (100/15m) | Edge Caching / WAF | Offload to CDN/Redis. |
| `/api/v1/categories` | General Limiter (100/15m) | Edge Caching | Offload to CDN/Redis. |
| `/api/v1/homepage` | General Limiter (100/15m) | Edge Caching | Offload to CDN/Redis. |

## 5. Abuse Scenarios

1. **Login brute force:** Protected by 20/15min IP limit. *Risk:* Distributed botnet. *Fix:* Add account lockout after 10 failed attempts.
2. **Password reset spam:** Protected by 20/15min IP limit.
3. **Register spam:** Protected by 20/15min IP limit. *Risk:* Fake DB bloat. *Fix:* Email verification enforcement.
4. **Cart mutation spam:** Mitigated by identity-aware cart mutation limiter. *Remaining risk:* Compromised accounts can still mutate within allowed quota.
5. **Checkout/order spam (Fake COD):** Mitigated by 5/hour checkout limiter plus 3 active COD order cap per user or guest phone number. *Remaining risk:* Distributed guest abuse can still require WAF/behavior layers later.
6. **Product search scraping:** Vulnerable. An attacker can scrape 100 pages per 15min. *Fix:* WAF Bot Management.
7. **Image upload abuse:** Mitigated by admin MFA, 10/hour identity-aware upload limiter, 5MB decoded size cap, safe filename generation, and MIME/extension/magic-byte validation. *Remaining risk:* Monitor ImageKit quota and compromised admin behavior.
8. **Admin endpoint probing:** Protected by strong Auth, Role checks, and MFA.
9. **Distributed IP rotation attack:** Reduced for authenticated mutations because limits key by user ID. Still relevant for auth/public endpoints.
10. **Bot traffic on homepage:** Vulnerable to DB exhaustion. *Fix:* Redis cache the `/homepage` endpoint.
11. **CSRF attempt:** Protected heavily by double-submit cookie middleware.
12. **Fake order flood for COD:** Partially mitigated. Active COD orders are capped at 3 per user or guest phone number. *Future fix if abuse grows:* WAF/behavior logging, not SMS/OTP by default.

## 6. Production Readiness Verdict

**Verdict: Good for small production**

The application has a strong security foundation (parameterized SQL, CSRF, Redis support, Admin MFA, Audit Logs). However, it lacks the specific abuse-prevention layers required for serious public exposure. Relying purely on IP-based rate limiting means a trivial proxy script can bypass your defenses and spam fake orders or scrape your catalog. 

For the first sellable version to a small local business, this is acceptable assuming Redis is configured and the site operates in a low-threat environment. Before significant marketing traffic hits the site, add Cloudflare/WAF and progressive auth protections.

## 7. Recommended Implementation Roadmap

### Phase 1 — Identity-Aware Rate Limiting (High Priority)
- Status: Implemented.
- Redis-backed identity limiters protect Cart, Wishlist, Checkout, Admin mutations, Admin image uploads, Reviews, and Product Questions.
- Local development still works without Redis through the in-memory store fallback.

### Phase 2 — Upload and Checkout Abuse Protection
- Status: Implemented.
- New COD orders are blocked when the user, or guest phone number, already has 3 active COD orders.
- Active COD statuses are `confirmed`, `processing`, and `shipped`; `delivered` and `cancelled` do not count.
- Admin image uploads validate declared MIME type, original extension, decoded file size, and file signatures before ImageKit/local storage.
- Uploaded filenames are regenerated with a safe base name, timestamp, random suffix, and validated extension.

### Phase 3 — Cloudflare/WAF Deployment Layer
- Status: Documentation prepared.
- `CLOUDFLARE_WAF_SETUP.md` documents DNS, SSL/TLS, WAF rules, edge rate limiting, bot protection, CORS, real IP/proxy behavior, backend URL exposure, testing, and rollback.
- Cloudflare dashboard configuration is still required before public marketing.

### Phase 4 — Behavior Logging
- Status: Implemented for logging.
- Security events are stored in `security_events`.
- This phase records suspicious events only. It does not block users, send alerts, add CAPTCHA, or add account lockouts.
- See `SECURITY_MONITORING.md` for event types, review queries, privacy guidance, and retention recommendations.

### Phase 5 — Progressive Protection
- Status: Partially implemented.
- Failed login cooldown: 10 failed attempts per email hash in 30 minutes, or 30 failed attempts per IP in 30 minutes, triggers a 30-minute cooldown.
- Admin MFA cooldown: 5 failed MFA attempts in 15 minutes triggers a 15-minute cooldown.
- CAPTCHA provider is not added yet. Future options include Cloudflare Turnstile or hCaptcha if abuse appears.

## 8. What Not To Do Yet

- Do NOT build a custom machine learning anomaly detection system.
- Do NOT add CAPTCHA to every page (it ruins the ecommerce experience).
- Do NOT migrate to an expensive Enterprise API Gateway (Kong/Apigee). Cloudflare Free/Pro is enough.
- Do NOT implement full device fingerprinting (privacy concerns, overkill for small business).

## 9. Final Recommendation

The current project already has a solid base: environment-aware IP limits, Phase 1 identity-aware mutation limits, Phase 2 checkout/upload abuse protections, Redis distributed counters, CSRF, XSS protection, admin MFA, admin audit logs, lightweight security event logging, and progressive auth cooldowns.

**For a first small-business launch, the highest-impact next step is verifying these controls in staging and reviewing early security events manually.** Add CAPTCHA or stricter lockout only after real abuse patterns justify it.
