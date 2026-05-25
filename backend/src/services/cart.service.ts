// backend/src/services/cart.service.ts
import { query } from '../config/db';
import { AppError, NotFoundError } from '../utils/errors';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: Date;
  // Joined product fields
  name: string;
  slug: string;
  price: string;
  image_url: string | null;
  stock: number;
  variant_name?: string | null;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  total: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Get the full cart for a user, including product details and computed total.
 */
export async function getCart(userId: string): Promise<Cart> {
  const items = await query<CartItem>(
    `SELECT ci.*,
            p.name,
            p.slug,
            COALESCE(v.price, p.price) AS price,
            COALESCE(v.image_url, p.image_url) AS image_url,
            COALESCE(v.stock, p.stock) AS stock,
            v.name AS variant_name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_variants v ON v.id = ci.variant_id
     WHERE ci.user_id = $1 AND ci.expires_at > NOW()
     ORDER BY ci.created_at DESC`,
    [userId]
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const total = items
    .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
    .toFixed(2);

  return { items, itemCount, total };
}

/**
 * Add an item to cart. If the product already exists in the cart,
 * increment the quantity instead.
 */
export async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
  variantId?: string | null
): Promise<CartItem> {
  const currentQuantityRows = await query<{ quantity: number }>(
    `SELECT quantity
     FROM cart_items
     WHERE user_id = $1 AND product_id = $2 AND (
       ($3::uuid IS NULL AND variant_id IS NULL) OR variant_id = $3::uuid
     ) AND expires_at > NOW()`,
    [userId, productId, variantId || null]
  );
  const currentQuantity = currentQuantityRows[0]?.quantity || 0;
  const stock = await getAvailableStock(productId, variantId || null);
  if (currentQuantity + quantity > stock) {
    throw new AppError(`Insufficient stock. Only ${stock} available.`, 400);
  }

  // Manual check for existing item to avoid unique constraint issues with variants
  let existingQuery = `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 AND expires_at > NOW()`;
  const existingParams: any[] = [userId, productId];
  if (variantId) {
    existingQuery += ` AND variant_id = $3`;
    existingParams.push(variantId);
  } else {
    existingQuery += ` AND variant_id IS NULL`;
  }

  const existing = await query<CartItem>(existingQuery, existingParams);

  if (existing.length > 0) {
    const updated = await query<CartItem>(
      `UPDATE cart_items
       SET quantity = quantity + $1,
           expires_at = NOW() + INTERVAL '48 hours'
       WHERE id = $2
       RETURNING *`,
      [quantity, existing[0].id]
    );
    return updated[0];
  } else {
    const inserted = await query<CartItem>(
      `INSERT INTO cart_items (user_id, product_id, quantity, variant_id, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '48 hours')
       RETURNING *`,
      [userId, productId, quantity, variantId || null]
    );
    return inserted[0];
  }
}

/**
 * Update the quantity of a cart item.
 * Returns the updated item or null if not found.
 */
export async function updateCartItemQuantity(
  userId: string,
  itemId: number,
  quantity: number
): Promise<CartItem | null> {
  const existing = await query<{ product_id: string; variant_id: string | null }>(
    `SELECT product_id, variant_id FROM cart_items WHERE id = $1 AND user_id = $2 AND expires_at > NOW()`,
    [itemId, userId]
  );

  if (!existing[0]) return null;

  const stock = await getAvailableStock(existing[0].product_id, existing[0].variant_id);
  if (quantity > stock) {
    throw new AppError(`Insufficient stock. Only ${stock} available.`, 400);
  }

  const rows = await query<CartItem>(
    `UPDATE cart_items
     SET quantity = $1
         , expires_at = NOW() + INTERVAL '48 hours'
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [quantity, itemId, userId]
  );

  return rows[0] || null;
}

/**
 * Remove an item from the cart.
 * Returns true if the item was found and deleted.
 */
export async function removeCartItem(
  userId: string,
  itemId: number
): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM cart_items
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [itemId, userId]
  );

  return rows.length > 0;
}

/**
 * Clear all items from a user's cart.
 */
export async function clearCart(userId: string): Promise<void> {
  await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

export async function cleanupExpiredCartItems(): Promise<number> {
  const rows = await query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM cart_items WHERE expires_at <= NOW() RETURNING id
     )
     SELECT COUNT(*) AS count FROM deleted`
  );
  return parseInt(rows[0].count, 10);
}

export async function queueAbandonedCartRecovery(userId: string): Promise<void> {
  const cart = await getCart(userId);
  if (cart.itemCount === 0) return;

  await query(
    `INSERT INTO abandoned_cart_recovery (user_id, cart_total, item_count, email, phone, last_seen_at)
     SELECT u.id, $2, $3, u.email, u.phone, NOW()
     FROM users u
     WHERE u.id = $1
     ON CONFLICT (user_id)
     DO UPDATE SET cart_total = EXCLUDED.cart_total,
                   item_count = EXCLUDED.item_count,
                   email = EXCLUDED.email,
                   phone = EXCLUDED.phone,
                   last_seen_at = NOW(),
                   status = 'pending'`,
    [userId, cart.total, cart.itemCount]
  );
}

async function getAvailableStock(productId: string, variantId: string | null): Promise<number> {
  if (variantId) {
    const variants = await query<{ stock: number }>(
      `SELECT stock FROM product_variants WHERE id = $1 AND product_id = $2`,
      [variantId, productId]
    );

    if (!variants[0]) {
      throw new NotFoundError('Product Variant');
    }

    return variants[0].stock;
  }

  const products = await query<{ stock: number }>(
    `SELECT stock FROM products WHERE id = $1`,
    [productId]
  );

  if (!products[0]) {
    throw new NotFoundError('Product');
  }

  return products[0].stock;
}
