# Phase 5 atomic guest-cart merge handoff

Base: SamirMD0/Connect-Shop, main at 6d0d50815c82decb49727a5dc52c3d92920c7aee.
Prior phases and untracked frontend/AGENTS.md / frontend/CLAUDE.md are preserved.
No push, deployment, production migration or existing database/service access occurred.

## Endpoint and partial acceptance

POST /api/v1/cart/merge (existing /api/cart alias also works) requires the existing
session authentication, CSRF protection and cart mutation rate limiter. Send a valid
Idempotency-Key plus { userId, items: [{ productId, variantId, quantity, expiresAt? }] }.
The expected userId must match the authenticated account; an account switch returns
409 MERGE_USER_CHANGED before any write. Keys are scoped to the authenticated user.
Key validation and normalized-request hashing reuse Phase 3 checkoutIdentity.

Requests contain 1–50 raw lines within the existing 10 KB body limit. UUIDs are
canonicalized; duplicate product/variant lines become one indivisible combined line.
Prices and unrelated fields are ignored. Malformed IDs, nonnumeric/nonpositive/noninteger
quantities and malformed expiry reject the request without changes. Duplicates use the
earliest supplied expiry. Optional expiry is bound to the request; it prevents a pending
browser snapshot from being newly transferred after its original guest expiry.

A successful 200 returns accepted, rejected, cart and replayed. Each normalized line is
accepted in full or rejected in full; there is no silent reduction. All accepted lines
and the receipt commit in ONE transaction, even when other lines are rejected. Zero
accepted lines still produce a durable confirmed receipt. Rejection codes:

- PRODUCT_UNAVAILABLE / VARIANT_UNAVAILABLE: absent, wrong-product or retired variant.
- INSUFFICIENT_STOCK: current active cart quantity plus incoming quantity exceeds stock.
- QUANTITY_LIMIT: the combined incoming or resulting active cart line exceeds 99.
- EXPIRED: the frozen guest line expired before a new merge could commit.

Existing shared cart-add rules supply prices/availability/stock checks. Merge locks
inventory rows during validation and uses Phase 3's user cart advisory transaction lock,
so normal authenticated mutations and checkout serialize with it. Merge removes only
that user's expired cart rows under the lock because they still occupy the SKU unique
indexes. It does not reserve/deduct inventory; checkout revalidates stock and prices.
Normal add/update/remove endpoints keep their existing behavior.

Migration 015_cart_merge_idempotency adds cart_merge_requests with a unique
(user_id, key_hash) primary key, normalized request hash and saved JSON response.
The claim, accepted cart changes, cart read and saved response are in one transaction.
Competing claims wait on PostgreSQL uniqueness; a separate READ COMMITTED read obtains
the committed winner. Conflicting reuse returns 409 IDEMPOTENCY_CONFLICT. Rollback frees
the key. Replay returns the original receipt without touching cart contents, even if
checkout has since consumed them. No cart lookup after commit is required. Existing
abandoned-cart recovery scheduling is best effort, safely caught, and can run again on
replay; failure cannot change the successful merge response. Logs contain a fixed
maintenance message, no request or customer fields.

## Browser journal and reconciliation

CartContext sends one POST instead of sequential item additions. The existing guest
storage key accepts legacy arrays and upgrades them to an envelope containing the cart
and pending/confirmed attempt together. Stable per-row IDs preserve additions and rows
removed then re-added while a request is in flight. The journal stores product/variant
IDs, quantities, expiry, line IDs, a random attempt key, an account digest and rejection
results; it does not store authenticated cart responses, email, addresses or tokens.

Same-origin Web Locks serialize short prepare/mutate/confirm storage operations across
tabs. No lock is held during the network request. The pending attempt is durable BEFORE
sending, so reloads and concurrent tabs use the same key and immutable source. A pending
attempt cannot be transferred under a different account. On a confirmed response, only
accepted source quantities are subtracted from matching original line IDs. Cart changes
and the confirmed marker are one localStorage write. Repeated/late responses cannot
subtract twice or reconcile another key. Storage failure before POST prevents sending;
failure after commit retains the pending key for receipt replay and reconciliation.

Rejected lines and additions made during transfer remain saved. Confirmed partial
results never automatically start a new attempt on reload/login effects. The cart page
shows remaining quantities and rejection reasons with Retry transfer. An explicit retry
of a confirmed result starts a new key for remaining quantities; simultaneous retry
buttons carrying the old confirmation key share that new attempt. Retrying an unknown
outcome keeps the pending key. A later guest cart mutation after confirmation represents
new cart intent and permits a new attempt. Current authenticated cart is fetched
separately after confirmation so the old receipt does not overwrite newer cart contents.

Automatic transfer requires HTTPS (or localhost), localStorage and Web Locks. Without
cross-tab locking, transfer fails closed with a visible explanation and keeps saved
items; normal guest cart operations remain available. Malformed storage is preserved
and reported. Cross-tab coordination follows the [Web Locks specification](https://w3c.github.io/web-locks/).

## Verification and limits

Verified synthetic PostgreSQL 15.4 cluster created under
.cache/phase5-postgres-disposable/data, owned by local test role phase5, listening only
on 127.0.0.1:55435; dedicated database connect_shop_phase5_disposable. Ownership,
loopback address, data directory, READ COMMITTED and zero user tables were checked
before writes. No dotenv or DATABASE_URL fallback is permitted by the test suite.
DDL uses the migration pool's unlimited setup timeout; actual requests use the normal
application pool/transaction wrapper and 10-second statement timeout. Native tests
use the installed Playwright bundled headless Chromium, a fresh browser context,
actual Web Locks/localStorage, and a loopback-only HTTP fixture invoking the real
merge controller/service against PostgreSQL. External cache/logger dependencies are
stubbed; database claims, locks, stock, cart writes and checkout are real.

Results:

- Seven merge input/controller tests passed, including account changes and synchronous/
  asynchronous post-commit maintenance failures.
- Seventeen PostgreSQL/native-browser acceptance tests passed: response loss and reload,
  repeated/concurrent same-key requests, conflicting reuse, per-user scope, rollback,
  duplicate lines, retired/missing/wrong-product variants, expiry/limits/current stock,
  expired cart rows, distinct attempts/ordinary additions, replay after checkout,
  simultaneous tabs/retries, partial results, storage failures, replacement rows,
  malformed storage and missing Web Locks. Chromium may itself retry a broken transport;
  the response-loss fixture keeps dropping replies until failure is observed.
- Thirteen checkout and fourteen inventory PostgreSQL regressions passed in separately
  verified empty disposable databases in the same owned cluster.
- Thirteen existing backend checkout/inventory offline regressions and seven frontend
  checkout/inventory unit regressions passed.
- Backend application and test TypeScript, frontend TypeScript, and targeted frontend
  ESLint checks passed. An existing pg warning about overlapping queries on one client
  was emitted in the unchanged inventory regression suite; no dependency upgrade was made.

The browser tests cover the production storage coordinator with the actual merge
controller and database. They do not run the full Next.js login UI, cookie/CSRF middleware,
email/recovery delivery, other browsers, hosted infrastructure or network proxies.
No startup or page-loading measurements are claimed by these test durations.
The synthetic schemas were dropped; zero user tables were verified before the cluster
was stopped and its own directory removed.

## Reproduce safely

Prerequisites: existing backend/frontend dependencies, PostgreSQL binaries and an
installed Playwright Chromium. Use a NEW local cluster and empty dedicated database;
never point these tests at a customer database, an existing local project database,
or a remote service. The acceptance guard requires a literal loopback host, exact
connect_shop_phase5_disposable database name, no URL query options and an explicit
verification flag. It independently refuses any pre-existing user tables.

From backend:

    .\node_modules\.bin\tsx.cmd --test tests/cart-merge.policy.test.ts
    .\node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
    .\node_modules\.bin\tsc.cmd --project tests/tsconfig.checkout.json

After independently creating and verifying that disposable environment in PowerShell:

    $env:PHASE5_DISPOSABLE_DATABASE_URL = 'postgresql://<disposable-role>:<disposable-password>@127.0.0.1:<unused-local-port>/connect_shop_phase5_disposable'
    $env:PHASE5_DISPOSABLE_DATABASE_VERIFIED = 'yes'
    try {
      .\node_modules\.bin\tsx.cmd --test --test-concurrency=1 tests/cart-merge.database.test.ts
      $testExit = $LASTEXITCODE
    } finally {
      Remove-Item Env:PHASE5_DISPOSABLE_DATABASE_URL
      Remove-Item Env:PHASE5_DISPOSABLE_DATABASE_VERIFIED
    }
    if ($testExit -ne 0) { throw 'Cart merge acceptance failed' }

From frontend:

    .\node_modules\.bin\tsc.cmd --noEmit
    .\node_modules\.bin\eslint.cmd src/context/CartContext.tsx src/lib/guest-cart.ts src/components/cart/GuestMergeNotice.tsx src/app/cart/page.tsx

## Next-phase handoff / remaining risks

Apply additive migration 015 through the existing migration workflow before serving the
new endpoint/frontend; refresh frontend bundles together. Older already-open bundles
still contain the sequential merge and cannot participate in the new journal/locks.
Backward rollback to such a frontend is unsafe for the envelope; no old-client protocol
or hosting rollout changes were introduced in this local phase.

Receipt retention intentionally has no automated deletion: expiring server receipts or
pending browser journals without proving all retries ended could recreate duplicate
quantities. Plan retention/operational cleanup later with that constraint. Clearing or
manually editing browser storage discards recovery evidence; pending transfers should
be resolved under their original account. Remaining rejected items are visible on the
signed-in cart page and editable through the normal guest cart after sign-out. This
phase adds no second guest editor to the authenticated UI.

Validate the full login/CSRF flow and supported browser matrix in staging under separate
authorization; verify coordinated bundle rollout and observability before release.
Cache, checkout financial policy, inventory/cancellation rules, hosting and storefront
rendering architecture remain outside this phase. This is not a production-readiness claim.
