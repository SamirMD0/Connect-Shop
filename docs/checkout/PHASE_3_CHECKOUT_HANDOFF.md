# Phase 3 checkout handoff

Base: SamirMD0/Connect-Shop, main at 6d0d50815c82decb49727a5dc52c3d92920c7aee.
Phases 1–2 changes and untracked frontend/AGENTS.md and frontend/CLAUDE.md are preserved.
No production database/service was accessed, and nothing was deployed or pushed.

## Checkout behavior

POST /api/orders (also /api/v1/orders) now requires an Idempotency-Key header:
16–128 ASCII letters, digits, underscores or hyphens. The frontend uses a random UUID.
Missing/malformed keys return 400 (IDEMPOTENCY_KEY_REQUIRED). Both checkout types
require a nonempty items array. Authenticated items also require the server cartItemId,
productId, nullable variantId and quantity. Guest items omit cartItemId.

The database primary key is the SHA-256 actor scope plus SHA-256 key. Authenticated
scope uses the user UUID; guest scope uses the normalized email. A request digest binds
that key to normalized items, address, payment method, coupon and delivery slot.
Guest duplicate SKU rows combine quantities; authenticated cart row IDs remain part of
the identity. Server prices and other client fields do not enter the request digest.
A changed request using an existing key returns 409 (IDEMPOTENCY_CONFLICT).

The claim, order, items, locked stock updates, coupon usage, cart consumption and saved
response commit in one existing transaction. Same-key concurrent INSERTs wait on the
unique constraint; replay reads the saved response in a separate READ COMMITTED
statement before checking current stock, coupons or cart. A pre-commit failure rolls
back the claim as well, so the same key remains retryable. Different-key authenticated
requests cannot consume the same snapshot twice: its row IDs/quantities must still
match the locked active cart, otherwise 409 (CART_CHANGED) requests cart review.
The frontend refreshes an authenticated cart after that conflict.

Checkout and add/update/remove/clear cart operations share a transaction-scoped advisory
lock for the user. Checkout additionally locks the selected cart rows and deletes only
the purchased IDs. Additions after snapshot acquisition wait, then remain in the cart;
changes before acquisition require review. Existing price calculations, coupon checks,
product/variant row locks, stock constraints and cash-on-delivery limits remain in use.
Expired-cart cleanup still relies on row locks. Cancellation, variant editing and cart
merging were not changed.

The unique-constraint replay relies on the application's READ COMMITTED isolation:
[PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).
User serialization uses [transaction advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html).

## Frontend retry and confirmation

The checkout page guards simultaneous clicks before its first await. It retains the
attempt key for unchanged retries and stores only that key plus a request digest in
sessionStorage, allowing reuse when the same request is reconstructed after remount.
Address, actor, item IDs/quantities/variants, coupon or delivery-slot changes produce a
new key; acknowledged success clears the attempt. Storage failures retain the key in
memory for this mounted page. Web Crypto requires HTTPS or a localhost secure context.

Confirmation is shown immediately after a successful order response. Cart refresh and
optional address saving run as isolated follow-ups; their failures cannot show an order
failure. Authenticated checkout refreshes the server cart instead of wiping local cart
state. Guest checkout subtracts purchased quantities from the current guest cart,
preserving same-SKU additions and other products.

## Post-commit work

Product slugs are captured during the transaction and saved with the idempotent result.
There is no post-commit database lookup for cache targets. Cache invalidation has the
existing REDIS_CACHE_TIMEOUT_MS deadline and catches failure; the committed result is
still returned. Replay attempts cache maintenance again, and existing cache TTLs remain
a fallback. No durable cache retry queue existed; no new queue or retry loop was added.
A timed-out underlying cache operation may finish later. Email confirmation remains
best effort and is attempted only for the original response, avoiding duplicate emails
on replay. Cache/email failure logs contain fixed text, no request data or raw errors.

## Migration and coordinated release prerequisites

013_checkout_idempotency.sql adds checkout_requests and is also reflected in the fresh
base schema. It does not rewrite existing orders or change migration execution.
The additive migration must be present before enabling the changed backend, and the
updated frontend must accompany the new checkout API contract. Older clients without
keys or authenticated cart snapshots receive validation errors and must refresh.
No production migration was applied in this phase.

Claims currently have no expiry. Saved responses contain private order data and must be
treated with the same access/retention controls as orders. The foreign key prevents
removing an order while its claim remains; decide retention/anonymization before adding
order purge workflows. Do not expire keys casually: expiration permits a later retry
with the old key to create a new guest order.

## Verification

- 17 focused offline tests passed: 8 service/idempotency, 3 controller, 6 frontend helper tests.
- 13 PostgreSQL acceptance tests passed, using installed PostgreSQL 15.4 binaries in a newly initialized workspace cluster at .cache/phase3-postgres-disposable/data, bound only to 127.0.0.1:55433. Verified owner phase3, exact dedicated database name, READ COMMITTED isolation and zero user tables before writes. Existing PostgreSQL services/databases were not used.
- Fresh-schema creation, migration creation when the claim table is absent, the actual migration runner, and reapplication of migration 013 passed in that synthetic environment.
- Acceptance covered repeated/simultaneous guest and authenticated submissions, distinct actor scopes, conflicting reuse, different-key cart contention, pre-commit rollback of all effects, post-commit cache throw/stall, actual advisory-lock waiters for concurrent additions, stale cart IDs/quantities, variant pricing/stock and overselling prevention. Cache is simulated; PostgreSQL is real.
- Backend application and checkout-test TypeScript checks passed. Frontend TypeScript passed. Targeted frontend lint passed with no errors and one pre-existing CartContext effect warning. Git diff whitespace check passed.
- Initial schema/fixture setup runs exceeded the normal application query deadline. Setup now uses the existing migration pool option and fixture deletion; request transactions retain their normal deadline. These are acceptance results, not startup/loading measurements.
- No browser end-to-end checkout or hosted/pooler compatibility test was performed. The random test schema was dropped, and the disposable cluster was stopped and removed after verification.

Offline commands from repository root (no dotenv/database connections in these suites):

~~~powershell
node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tests/tsconfig.unit.json --test --test-concurrency=1 backend/tests/checkout.idempotency.test.ts backend/tests/checkout.controller.test.ts frontend/tests/unit/checkout-attempt.test.ts
node backend/node_modules/typescript/bin/tsc --project backend/tsconfig.json --noEmit
node backend/node_modules/typescript/bin/tsc --project backend/tests/tsconfig.checkout.json --noEmit
node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit --incremental false
~~~

To rerun integration acceptance, create a NEW empty PostgreSQL database named
connect_shop_phase3_disposable in an independently owned disposable local cluster.
Use a literal loopback URL with no connection query options. Verify the cluster's
provenance, database owner, server port/data directory, READ COMMITTED isolation and
zero user tables before setting the attestation below. Do not substitute a shared
local database or an existing database with customer data. The suite never falls back
to DATABASE_URL or loads dotenv, checks an empty database before writes, and uses a
random isolated schema that it drops afterward. Fixture DDL has no application query
timeout; checkout transactions retain the actual application's 10-second limit.
Only external cache/email/logging behavior is stubbed in the database suite; claims,
transactions, unique constraints, advisory/row locks, stock/coupon/cart writes use PG.

~~~powershell
# Example synthetic credentials; only attest after verifying the NEW local target.
$env:PHASE3_DISPOSABLE_DATABASE_URL='postgresql://phase3:phase3_local_only@127.0.0.1:55433/connect_shop_phase3_disposable'
$env:PHASE3_DISPOSABLE_DATABASE_VERIFIED='yes'
try {
  node backend/node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 backend/tests/checkout.database.test.ts
  $testExit = $LASTEXITCODE
} finally {
  Remove-Item Env:PHASE3_DISPOSABLE_DATABASE_URL
  Remove-Item Env:PHASE3_DISPOSABLE_DATABASE_VERIFIED
}
if ($testExit -ne 0) { throw 'Checkout acceptance failed' }
~~~

## Remaining risks and next-phase handoff

A lost network response can still leave the browser unsure whether checkout committed;
resubmit the identical body/key to recover its saved result. The complete checkout body
is deliberately not persisted in browser storage. After a full reload with a consumed
authenticated cart, that body cannot always be reconstructed; use authenticated order
history for recovery. New recovery UI/endpoints are outside this phase. Guest localStorage
still has no atomic cross-tab arbitration. Cache invalidation and emails are best effort,
not guaranteed delivery. DB connection/COMMIT transport ambiguity is resolved by a retry
with the same key; it cannot be removed by cache isolation.

Review the API/migration rollout and retention/recovery choices before deployment, and
carry these tests into a verified disposable environment matching the eventual hosted
PostgreSQL version/pooler. This phase does not establish production readiness.
