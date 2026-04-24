// backend/src/services/cart.service.ts
import { query } from '../config/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: Date;
  // Joined product fields
  name: string;
  slug: string;
  price: string;
  image_url: string | null;
  stock: number;
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
    `SELECT ci.*, p.name, p.slug, p.price, p.image_url, p.stock
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
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
  quantity: number
): Promise<CartItem> {
  const rows = await query<CartItem>(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING *`,
    [userId, productId, quantity]
  );

  return rows[0];
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
  const rows = await query<CartItem>(
    `UPDATE cart_items
     SET quantity = $1
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
