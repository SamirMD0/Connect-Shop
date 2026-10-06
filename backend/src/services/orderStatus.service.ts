import { withTransaction } from '../config/db';
import type { Order } from './orders.service';
import { assertOrderTransition } from './orderTransitions';
import { AppError } from '../utils/errors';
import { invalidateProductCaches } from './products.service';
import { withDeadline } from '../utils/deadline';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function transitionOrder(id: string, status: string,
  actor: { customerId?: string; actorId?: string; note: string }): Promise<Order | null> {
  const result = await withTransaction(async client => {
    const current = (await client.query<Order>(
      'SELECT * FROM orders WHERE id = $1 AND ($2::uuid IS NULL OR user_id = $2) FOR UPDATE', [id, actor.customerId || null])).rows[0];
    if (!current) return null;
    assertOrderTransition(current, status);
    if (current.status === status) return { order: current, slugs: [] as string[] };
    const slugs = new Set<string>();
    if (status === 'cancelled') {
      const items = (await client.query<{ product_id: string; variant_id: string | null; was_variant: boolean; quantity: number; slug: string }>(
        'SELECT oi.product_id, oi.variant_id, bool_or(oi.variant_name IS NOT NULL) AS was_variant, SUM(oi.quantity)::int AS quantity, p.slug ' +
        'FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1 ' +
        'GROUP BY oi.product_id, oi.variant_id, p.slug ORDER BY oi.product_id, oi.variant_id NULLS FIRST', [id])).rows;
      if (!items.length || items.some(item => !item.variant_id && item.was_variant)) {
        throw new AppError('Original inventory references are missing. Cancellation requires manual review.', 409, true, 'INVENTORY_REFERENCE_MISSING');
      }
      for (const item of items) {
        const restored = item.variant_id
          ? await client.query('UPDATE product_variants SET stock = stock + $3 WHERE id = $1 AND product_id = $2 RETURNING id', [item.variant_id, item.product_id, item.quantity])
          : await client.query('UPDATE products SET stock = stock + $2 WHERE id = $1 RETURNING id', [item.product_id, item.quantity]);
        if (restored.rowCount !== 1) throw new AppError('Original inventory is unavailable. Cancellation requires manual review.', 409, true, 'INVENTORY_REFERENCE_MISSING');
        slugs.add(item.slug);
      }
    }
    const order = (await client.query<Order>(
      "UPDATE orders SET status = $2::text, cancelled_at = CASE WHEN $2::text = 'cancelled' THEN NOW() ELSE cancelled_at END, updated_at = NOW() WHERE id = $1 RETURNING *", [id, status])).rows[0];
    await client.query('INSERT INTO order_status_history (order_id, status, note, created_by) VALUES ($1, $2, $3, $4)', [id, status, actor.note, actor.actorId || actor.customerId || null]);
    return { order, slugs: [...slugs] };
  });
  if (!result) return null;
  if (result.slugs.length) {
    try { await withDeadline(() => invalidateProductCaches(result.slugs), env.REDIS_CACHE_TIMEOUT_MS); }
    catch { logger.warn('Committed cancellation cache maintenance failed'); }
  }
  return result.order;
}
