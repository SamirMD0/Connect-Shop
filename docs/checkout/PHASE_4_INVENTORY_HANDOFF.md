# Phase 4 variant and inventory handoff

Base: SamirMD0/Connect-Shop, main at 6d0d50815c82decb49727a5dc52c3d92920c7aee.
Phase 1–3 local changes and untracked frontend/AGENTS.md / frontend/CLAUDE.md are
preserved. No production database/service access, push or deployment occurred.

## Variant identity and availability

Existing variant edits require their ID and update that row in place. New variants have
no ID and require initial stock. Missing IDs for existing SKUs, IDs belonging to another
product, duplicates and attempts to reactivate retired IDs reject the whole save.
Omitting the variants property preserves the current set. Providing it explicitly
retires active variants omitted from that set. Retirement sets is_active=false; it
keeps stock, IDs, cart rows and historical order references. Retired SKUs remain reserved.
The migration also changes the order-item variant foreign key to ON DELETE RESTRICT,
preventing physical variant deletion from nulling historical references.

Product detail retains variant metadata for carts/admin editing; the storefront selector
and admin editor show active variants only. Retired variants show unavailable stock in
carts, and both guest/authenticated checkout and cart additions reject them. Checkout
checks availability while locking the variant. Existing active carts continue to use
their stable variant IDs. Order item names/prices at purchase remain historical snapshots.
If the admin cannot load complete product details, editing is blocked until retry.

## Content and inventory changes

Content saves omit stock unless the admin intentionally changes it. Existing product or
variant stock changes include inventory_version from the original load. The repository
locks the row and compares that version before changing stock; stale/missing versions
return 409 INVENTORY_CONFLICT / INVENTORY_VERSION_REQUIRED and roll back all edits.
Stock remains a nonnegative integer. New product/variant creation still accepts initial
stock without a version. Older clients that send unversioned stock during updates must
refresh to the new frontend; they cannot silently overwrite purchased inventory.

Database triggers advance inventory_version on every stock change, including checkout,
cancellation, and direct inventory SQL. Changing stock away and back still invalidates
an old version; unchanged stock/content updates preserve the version. The version cannot
be reset by ordinary UPDATE. Content edits remain last-writer-wins; there is no general
content versioning or new inventory-adjustment UI in this phase. A full submitted variant
set is authoritative for retirement, so admins should reload before editing membership
when another admin is editing the same product.

Triggers run in the modifying transaction, so a failed stock/status/history operation
rolls back its version too: [PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html).
Row locks serialize competing writes: [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

## Fulfillment and cancellation rules

The implemented statuses match the actual schema/admin UI. Suggested pending and
out_for_delivery labels in older documentation are not schema-supported statuses here.
Forward shortcuts are preserved for stores that record fulfillment after the fact:

| Current | Allowed next states |
| --- | --- |
| confirmed | processing, shipped, delivered; eligible cancellation |
| processing | shipped, delivered; eligible cancellation |
| shipped | delivered |
| delivered | none |
| cancelled | none |

The same status is an idempotent no-op with no additional history or stock change.
Backward moves and resurrection reject with 409 ORDER_TRANSITION_INVALID. Admin list,
detail and update responses provide allowed_statuses; selectors use that server policy.
Recording delivered still means the goods were received, as in the existing admin guide;
the status endpoint does not collect payment or change payment_status.

Cancellation is eligible only before dispatch (confirmed/processing), with pending
payment and cash_on_delivery/cod. Shipped/delivered cancellation and paid/refunded/non-COD
cancellation are explicitly blocked with 409 CANCELLATION_POLICY_REQUIRED. The repository
has no documented physical-return/refund policy for those cases; this phase invents none.
Returns and financial refunds remain separate workflows. Payment state, totals and coupon
usage are unchanged by cancellation; inventory restoration is not a financial refund.

Customer and admin cancellation share one transaction. It locks the order, checks current
state/ownership, sums purchased quantities by original inventory row, restores each base
product or variant once, updates status/cancelled_at and inserts history with the actor.
Concurrent/repeated cancellation sees the terminal state and performs no further writes.
Retired variants receive their stock back in the original retired row and stay unavailable.
A history failure rolls back status, stock, timestamps and versions. Post-commit cache
invalidation is bounded and best effort; failure cannot report a committed cancellation
as failed. No retry queue or automatic refund/restock of delivered goods was introduced.

## Migration and existing-data limits

014_inventory_variant_integrity.sql adds inventory versions, variant availability and
triggers, and protects the historical variant foreign key. The fresh base schema includes
the same definitions. Upgrade from the actual Phase 3 schema and migration reapplication
were verified in the disposable environment. No production migration was applied.

Apply the compatible migration before enabling the changed backend; coordinate the
frontend/backend update for versioned inventory writes and allowed-status metadata.
Retirement needs no cart rewrite or historical order rewrite. Existing variants begin
active at version 0; previous stock levels are preserved.

Already-cancelled orders are not retrospectively restocked: whether their stock was
previously corrected is unknown. Missing historical variant IDs left by older deletion
cannot be reconstructed automatically. Cancellation of an order with a variant snapshot
but missing variant ID, or no usable items, is blocked with INVENTORY_REFERENCE_MISSING.
Reconcile legacy cases explicitly against physical inventory before making corrections.
No returns/refunds reconciliation or cart-merging changes were performed.

## Checks and disposable conditions

- 14 Phase 4 real PostgreSQL acceptance tests passed: identity/cart/history preservation,
  creation/retirement, unavailable checkout, foreign-key deletion protection, stale base
  and variant stock saves, version ABA protection, actual checkout row-lock waiters,
  repeated/concurrent customer/admin cancellation, exact base/variant quantities, ownership,
  invalid/terminal/financial transitions, history rollback and cache failure/stall.
- A targeted rerun also verified base inventory_version rollback after history failure.
- 13 existing Phase 3 PostgreSQL tests passed against the new schema.
- 20 focused offline tests passed, including Phase 3 regression tests and new inventory
  policy/frontend inventory payload checks.
- Backend application/test and frontend TypeScript checks passed. Targeted lint had no
  errors and five pre-existing warnings (effects/render purity). No browser end-to-end
  admin workflow or hosted PostgreSQL/pooler acceptance was run.
- The existing checkout item-resolution Promise.all emits a pg deprecation warning when
  querying one client concurrently. This behavior was preserved; no dependency upgrade
  or broader checkout refactor was made.

Used PostgreSQL 15.4 binaries in a newly initialized workspace cluster at
.cache/phase4-postgres-disposable/data, listening only on 127.0.0.1:55434. Verified owner
phase4, dedicated empty database connect_shop_phase4_disposable and READ COMMITTED before
writes. Phase 3 regression used a second new empty database in the same owned cluster.
No existing PostgreSQL service/database was used. Transactions, advisory/row locks,
constraints, stock, inventory versions, order history and cart writes used actual PG;
external cache/logger dependencies were stubbed. Fixture DDL used the existing migration
pool option; application transactions retained their normal 10-second statement deadline.
The random test schemas are dropped by the suites. The owned cluster was stopped and
removed after verification. These test durations are not startup measurements.

Commands from repository root:

~~~powershell
node backend/node_modules/typescript/bin/tsc --project backend/tsconfig.json --noEmit
node backend/node_modules/typescript/bin/tsc --project backend/tests/tsconfig.checkout.json --noEmit
node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit --incremental false
node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tests/tsconfig.unit.json --test --test-concurrency=1 backend/tests/inventory.policy.test.ts backend/tests/checkout.idempotency.test.ts backend/tests/checkout.controller.test.ts frontend/tests/unit/inventory-edit.test.ts frontend/tests/unit/checkout-attempt.test.ts
~~~

For database acceptance, create and verify a NEW independently owned, empty disposable
loopback database with the exact dedicated name. Do not use DATABASE_URL, shared local
data, customer records or a production service. Only after verifying that provenance:

~~~powershell
# Synthetic example credentials; the suite refuses non-loopback/unnamed/nonempty targets.
$env:PHASE4_DISPOSABLE_DATABASE_URL='postgresql://phase4:phase4_local_only@127.0.0.1:55434/connect_shop_phase4_disposable'
$env:PHASE4_DISPOSABLE_DATABASE_VERIFIED='yes'
try {
  node backend/node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 backend/tests/inventory.database.test.ts
  $testExit=$LASTEXITCODE
} finally {
  Remove-Item Env:PHASE4_DISPOSABLE_DATABASE_URL
  Remove-Item Env:PHASE4_DISPOSABLE_DATABASE_VERIFIED
}
if ($testExit -ne 0) { throw 'Inventory acceptance failed' }
~~~

## Next-phase handoff

Review the migration/client rollout, reconcile legacy inventory and define physical
returns/refund handling before enabling the blocked cancellation cases. Retired-variant
reactivation and general concurrent content editing need explicit future policy/work.
Cache maintenance remains best effort with existing TTL expiry. Phase 3 lost-response
recovery limitations remain. Carry these tests into a disposable environment matching
the eventual hosted PostgreSQL/pooler and exercise the admin browser workflows before
release. This phase does not establish production readiness.
