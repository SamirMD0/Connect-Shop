# Phase 6 email and customer configuration handoff

Base: SamirMD0/Connect-Shop, main at 6d0d50815c82decb49727a5dc52c3d92920c7aee. Prior phase changes and untracked frontend/AGENTS.md and frontend/CLAUDE.md remain intact. No push, deployment, production migration or real email delivery occurred.

## Changes

- Production email-enabled features require Resend mode, a valid key/sender configuration and explicit sender-domain verification attestation. Mock delivery is explicit and restricted to development/test. Sender, display name and reply-to are per customer. Provider failures propagate safe categories, returned error objects are checked, and transient attempts are bounded and reuse an opaque provider key. No recipients, message bodies, recovery tokens/URLs or raw provider errors are logged.
- Password recovery responds generically before account lookup/delivery runs. Registration preserves a created account and reports failed verification delivery. Committed COD orders remain successful if confirmation delivery fails. No delivery queue/outbox existed to reuse; background work and retries are process-local.
- Existing business configuration now supports storefront metadata and semantic colors, preserving default layouts/palette and contact configuration. Backend financial settings preserve existing defaults. Public store configuration supplies currency/locale and rules to the frontend; price labels no longer assume USD for a new customer. Settings failure shows unavailable currency. Historical order views/invoices/emails use recorded order currency.
- Read-only POST /api/v1/orders/quote uses the same item resolution, cart snapshot, stock/coupon validation, rounding, tax and delivery calculation as order creation. Optional auth and CSRF/identity limits remain; quotes have their own limiter and private/no-store responses. The frontend cancels stale quote reads with an eight-second deadline, blocks unconfirmed totals and displays coupon discounts. Cart shows subtotal with final charges confirmed at checkout.
- Order creation always revalidates in its transaction. Optional expectedQuote decimal totals/currency are only a precondition; differences return 409 QUOTE_CHANGED with no order/claim/inventory changes. Derived price preconditions are excluded from both backend request hashing and browser purchase fingerprints, so response-loss retries with a fresh quote reuse the original key and receipt. Basket, address, coupon, payment and actor changes still change purchase intent. Phase 3 uniqueness/locking/cart consumption and Phase 4 stock/version/variant rules remain.
- Migration 016_order_currency.sql adds currency with USD for pre-existing orders; new orders snapshot configured currency. It was applied only in disposable local PostgreSQL and checked twice for compatibility. Financial rounding remains the existing Math.round(amount * 100) / 100 and DECIMAL(10,2); no currency conversion or new payment/refund policy.

## Verification on 2026-10-05

| Check | Result |
| --- | --- |
| Backend application TypeScript | Pass |
| Backend regression-test TypeScript | Pass |
| Frontend TypeScript | Pass |
| Backend npm test with explicit disposable DATABASE_URL, mock email and Redis absent | 168/168 pass |
| New quote/order PostgreSQL + native Chromium acceptance | 14/14 pass |
| Earlier checkout/inventory/cart-merge PostgreSQL + browser regressions | 44/44 pass |
| Frontend checkout-attempt and customer-settings unit tests | 9/9 pass |
| Final financial defaults, inherited region lookup, email and checkout-key regressions | 18/18 pass |
| Targeted frontend ESLint | No remaining errors; 21 warnings across the initial changed-file set, including existing effect/navigation/image warnings and default-country synchronization |
| Tracked Phase 6 whitespace check | Pass |

The first broad npm test invocation exposed legacy integration tests falling back to a development database URL; authentication was rejected before writes. It was corrected by creating and verifying an empty dedicated regression database and rerunning the full suite with explicit synthetic local configuration. New guarded acceptance suites never use dotenv or a DATABASE_URL fallback.

Database conditions: newly initialized PostgreSQL 15.4 on Windows, 127.0.0.1:55436, dedicated synthetic role, READ COMMITTED, owned workspace data directory .cache/phase6-postgres-disposable/data. Separate empty connect_shop_phase3_disposable, connect_shop_phase4_disposable, connect_shop_phase5_disposable and connect_shop_phase6_disposable databases were verified before acceptance writes; each suite used and dropped its own random schema. A separate connect_shop_phase6_regression_disposable database held the base schema/migrations for legacy tests. No production database was accessed. After all suites completed, zero user tables were verified in the four acceptance databases; the owned PostgreSQL process was stopped, port 55436 was checked and the entire disposable data directory (including the legacy regression database) was removed. These are test durations/results, not startup measurements.

New database checks cover guest and authenticated/variant quote/order equality under EUR/custom tax/shipping, fixed discount caps, pre-discount free delivery, coupon and stock changes after quoting, malformed preconditions/retired variants, rollback on stale totals, replay after price changes, and actual queued cart/inventory locks. Native Chromium loads the real React quote hook and checkout-attempt helper through a synthetic HTTP adapter: stale read cancellation, changed-price retry, provider failure after commit and lost-response retry are verified. It does not run the entire Next.js checkout page or deployed session/CSRF middleware. Fake provider tests cover returned errors, thrown failures, unresolved sends, bounded retry keys, configured sender/currency, explicit mock/disabled delivery and safe logs. Recovery response tests include absent, failing and hanging delivery.

Three additional business-rule tests were added after the full 168-test run; the final focused run checks those together with email and checkout-key regressions. The shipping lookup now checks configured own properties, so inherited names such as constructor use the fallback rate unless explicitly configured. Backend monetary defaults are read from the same validated configuration schema.

An existing pg warning about overlapping queries on one transaction client remains in the earlier inventory suite; no driver upgrade or unrelated query refactor was made.

## Reproduce focused checks

Use installed dependencies and no real email credentials. From backend:

~~~powershell
npx tsc --noEmit
npx tsc --project tests/tsconfig.checkout.json --noEmit
npx tsx --test --test-concurrency=1 tests/customer-config.test.ts tests/business-rules.test.ts tests/email.delivery.test.ts tests/password-recovery.response.test.ts tests/checkout.idempotency.test.ts tests/checkout.controller.test.ts
~~~

For transactional/native acceptance, first create a new EMPTY disposable PostgreSQL database named exactly connect_shop_phase6_disposable on literal localhost, verify its identity/data directory and zero user tables, and confirm that installed Playwright Chromium is available. Never use a customer database. Then, from backend:

~~~powershell
$env:PHASE6_DISPOSABLE_DATABASE_URL = 'postgresql://DISPOSABLE_ROLE:DISPOSABLE_PASSWORD@127.0.0.1:DISPOSABLE_PORT/connect_shop_phase6_disposable'
$env:PHASE6_DISPOSABLE_DATABASE_VERIFIED = 'yes'
try { npx tsx --test --test-concurrency=1 tests/checkout-quote.database.test.ts }
finally { Remove-Item Env:PHASE6_DISPOSABLE_DATABASE_URL; Remove-Item Env:PHASE6_DISPOSABLE_DATABASE_VERIFIED }
~~~

Without those explicitly verified prerequisites, the guarded database suite skips and integration acceptance is blocked. The broader npm test command also contains legacy database tests without that guard: only run it after directing DATABASE_URL and DIRECT_DATABASE_URL to a verified disposable schema/migration setup, with EMAIL_MODE=mock and NODE_ENV=test. Do not use the normal development .env database by default.

From frontend:

~~~powershell
npx tsc --noEmit
..\backend\node_modules\.bin\tsx.cmd --test --tsconfig tests/tsconfig.unit.json tests/unit/checkout-attempt.test.ts tests/unit/customer-settings.test.ts
~~~

## Remaining limits and next handoff

Follow [customer setup](../deployment/CUSTOMER_SETUP.md) for separate databases/domains/credentials, branding and financial settings. Domain verification, real provider deliverability and deployed end-to-end checkout still need customer-specific acceptance; no real email was sent. Provider acceptance is not inbox delivery. No durable outbox means restarts can lose pending messages; bounded deadlines do not cancel the Resend SDK's underlying request, so retries rely on its 24-hour idempotency window. Monitor internal failure categories and confirm an operational recovery procedure before enabling production email.

Keep one configured currency per customer database; changing it in place does not convert catalog prices or mixed-currency aggregate analytics. Review existing CMS marketing claims, phone-region choices, delivery slots, shipping coverage and legal policies separately. Quotes do not reserve stock; creation may reject later changes. Public configuration adds a bounded SSR read and does not eliminate a sleeping host's cold start. This phase makes no new loading-timing or production-readiness claim.
