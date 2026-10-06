import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import type { CheckoutItemInput, Order } from './orders.service';
import { AppError } from '../utils/errors';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface CheckoutIdentity { scopeHash: string; keyHash: string; requestHash: string }
export interface CheckoutResult { order: Order; replayed: boolean; cacheSlugs: string[] }

export function normalizeCheckoutItems(items: CheckoutItemInput[], authenticated: boolean): CheckoutItemInput[] {
  if (!Array.isArray(items) || !items.length) throw new AppError('Cart is empty', 400);
  const normalized = new Map<string, CheckoutItemInput>();
  const rowIds = new Set<number>();
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !uuid.test(item.productId)
      || (item.variantId && (typeof item.variantId !== 'string' || !uuid.test(item.variantId)))) {
      throw new AppError('Checkout product or variant is invalid.', 400);
    }
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new AppError('Invalid item quantity.', 400);
    const rowId = Number(item.cartItemId);
    if (authenticated && (!Number.isSafeInteger(rowId) || rowId < 1 || rowIds.has(rowId))) {
      throw new AppError('Authenticated checkout requires distinct cart item IDs.', 400);
    }
    rowIds.add(rowId);
    const value: CheckoutItemInput = { productId: item.productId.toLowerCase(), variantId: item.variantId?.toLowerCase() || null,
      quantity, ...(authenticated ? { cartItemId: rowId } : {}) };
    const key = value.productId + ':' + (value.variantId || '') + (authenticated ? ':' + rowId : '');
    const previous = normalized.get(key);
    if (previous) {
      previous.quantity += quantity;
      if (previous.quantity > 99) throw new AppError('Invalid item quantity.', 400);
    } else normalized.set(key, value);
  }
  return [...normalized.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, item]) => item);
}

export function checkoutIdentity(actor: string, key: string | undefined, request: unknown, operation = 'checkout'): CheckoutIdentity {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    throw new AppError(`A valid Idempotency-Key header is required for ${operation}.`, 400, true, 'IDEMPOTENCY_KEY_REQUIRED');
  }
  return { scopeHash: digest(actor), keyHash: digest(key), requestHash: digest(JSON.stringify(request)) };
}

export async function claimCheckout(client: PoolClient, identity: CheckoutIdentity): Promise<CheckoutResult | null> {
  const params = [identity.scopeHash, identity.keyHash, identity.requestHash];
  const inserted = await client.query(
    'INSERT INTO checkout_requests (scope_hash, key_hash, request_hash) VALUES ($1, $2, $3) ON CONFLICT (scope_hash, key_hash) DO NOTHING RETURNING scope_hash', params);
  if (inserted.rowCount) return null;
  // Separate READ COMMITTED statement sees the competing transaction after the
  // unique-index wait. A rollback allows our INSERT to claim the key instead.
  const existing = await client.query<{ request_hash: string; response: Order | null; cache_slugs: string[] }>(
    'SELECT request_hash, response, cache_slugs FROM checkout_requests WHERE scope_hash = $1 AND key_hash = $2', params.slice(0, 2));
  const saved = existing.rows[0];
  if (!saved) throw new AppError('Checkout result is not ready. Retry with the same key.', 503, true, 'CHECKOUT_RETRY');
  if (saved.request_hash !== identity.requestHash) {
    throw new AppError('This checkout key was already used for a different request.', 409, true, 'IDEMPOTENCY_CONFLICT');
  }
  if (!saved.response) throw new AppError('Checkout is not ready. Retry with the same key.', 503);
  return { order: saved.response, replayed: true, cacheSlugs: saved.cache_slugs };
}

export async function finishCheckout(client: PoolClient, identity: CheckoutIdentity, order: Order, cacheSlugs: string[]): Promise<CheckoutResult> {
  const result = await client.query(
    'UPDATE checkout_requests SET order_id = $3, response = $4::jsonb, cache_slugs = $5::text[] WHERE scope_hash = $1 AND key_hash = $2',
    [identity.scopeHash, identity.keyHash, order.id, JSON.stringify(order), cacheSlugs]);
  if (result.rowCount !== 1) throw new AppError('Could not finalize checkout.', 500);
  return { order, replayed: false, cacheSlugs };
}
