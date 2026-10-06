import { query, withTransaction } from '../config/db';
import { AppError, NotFoundError } from '../utils/errors';
import { checkoutIdentity, normalizeCheckoutItems } from './checkoutIdempotency';
import { lockUserCart } from './cartLock';
import { addToCartWithQuery, getCart, type Cart } from './cart.service';

export interface MergeLine { productId: string; variantId: string | null; quantity: number; expiresAt?: string }
export interface AcceptedMergeLine extends MergeLine { cartItemId: number }
export interface RejectedMergeLine extends MergeLine { reason: string; message: string }
export interface MergeReceipt { accepted: AcceptedMergeLine[]; rejected: RejectedMergeLine[]; cart: Cart }

/** Duplicate SKUs form one indivisible line. Never silently reduce quantities. */
export function normalizeMergeItems(input: unknown): MergeLine[] {
  if (!Array.isArray(input) || !input.length || input.length > 50) {
    throw new AppError('A cart merge requires between 1 and 50 lines.', 400);
  }
  const lines = new Map<string, MergeLine>();
  for (const item of input) {
    if (!item || (item.variantId != null && (typeof item.variantId !== 'string' || !item.variantId))) {
      throw new AppError('Invalid cart merge item.', 400);
    }
    const sku = normalizeCheckoutItems([{ ...item, quantity: 1 }], false)[0];
    if (typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 2147483647) {
      throw new AppError('Invalid cart merge quantity.', 400);
    }
    let expiresAt: string | undefined;
    if (item.expiresAt != null) {
      if (typeof item.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(item.expiresAt) || !Number.isFinite(Date.parse(item.expiresAt))) {
        throw new AppError('Invalid cart merge expiry.', 400);
      }
      expiresAt = new Date(item.expiresAt).toISOString();
    }
    const key = sku.productId + ':' + (sku.variantId || '');
    const previous = lines.get(key);
    if (previous) {
      previous.quantity += item.quantity;
      if (expiresAt && (!previous.expiresAt || expiresAt < previous.expiresAt)) previous.expiresAt = expiresAt;
    } else lines.set(key, { productId: sku.productId, variantId: sku.variantId || null, quantity: item.quantity, ...(expiresAt ? { expiresAt } : {}) });
  }
  return [...lines.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, line]) => line);
}

export async function mergeCart(userId: string, key: string | undefined, input: unknown): Promise<MergeReceipt & { replayed: boolean }> {
  const items = normalizeMergeItems(input);
  const identity = checkoutIdentity('cart-merge:user:' + userId.toLowerCase(), key, items, 'cart merge');
  return withTransaction(async client => {
    const params = [userId, identity.keyHash, identity.requestHash];
    const claim = await client.query(
      'INSERT INTO cart_merge_requests (user_id, key_hash, request_hash) VALUES ($1, $2, $3) ON CONFLICT (user_id, key_hash) DO NOTHING RETURNING user_id', params);
    if (!claim.rowCount) {
      // As in checkout: the separate READ COMMITTED statement observes the
      // committed winner after the unique-index wait, including response loss.
      const saved = (await client.query<{ request_hash: string; response: MergeReceipt | null }>(
        'SELECT request_hash, response FROM cart_merge_requests WHERE user_id = $1 AND key_hash = $2', params.slice(0, 2))).rows[0];
      if (saved && saved.request_hash !== identity.requestHash) throw new AppError('This merge key was used for a different request.', 409, true, 'IDEMPOTENCY_CONFLICT');
      if (!saved?.response) throw new AppError('Merge result is not ready. Retry with the same key.', 503, true, 'CART_MERGE_RETRY');
      return { ...saved.response, replayed: true };
    }
    await lockUserCart(client, userId);
    const read: typeof query = async (sql, values) => (await client.query(sql, values)).rows;
    // Expired rows still occupy the cart's unique SKU indexes. Remove only
    // this user's expired rows while holding the same lock as normal writes.
    await read('DELETE FROM cart_items WHERE user_id = $1 AND expires_at <= NOW()', [userId]);
    const now = (await client.query<{ now: Date }>('SELECT NOW() AS now')).rows[0].now.getTime();
    const accepted: AcceptedMergeLine[] = []; const rejected: RejectedMergeLine[] = [];
    for (const line of items) {
      let reason: string | undefined; let message = '';
      if (line.quantity > 99) { reason = 'QUANTITY_LIMIT'; message = 'A combined cart line cannot exceed 99.'; }
      else if (line.expiresAt && Date.parse(line.expiresAt) <= now) { reason = 'EXPIRED'; message = 'This saved guest item has expired.'; }
      else {
        try {
          const row = await addToCartWithQuery(read, userId, line.productId, line.quantity, line.variantId, { lockInventory: true, maxQuantity: 99 });
          accepted.push({ ...line, cartItemId: row.id });
        } catch (error) {
          if (error instanceof NotFoundError) { reason = line.variantId ? 'VARIANT_UNAVAILABLE' : 'PRODUCT_UNAVAILABLE'; message = 'This product or variant is no longer available.'; }
          else if (error instanceof AppError && ['QUANTITY_LIMIT', 'INSUFFICIENT_STOCK'].includes(error.code || '')) { reason = error.code; message = error.message; }
          else throw error; // Database/programming failures roll back every line and the claim.
        }
      }
      if (reason) rejected.push({ ...line, reason, message });
    }
    const receipt: MergeReceipt = { accepted, rejected, cart: await getCart(userId, read) };
    const finished = await client.query('UPDATE cart_merge_requests SET response = $3::jsonb WHERE user_id = $1 AND key_hash = $2', [userId, identity.keyHash, JSON.stringify(receipt)]);
    if (finished.rowCount !== 1) throw new AppError('Could not finalize cart merge.', 500);
    return { ...receipt, replayed: false };
  });
}
