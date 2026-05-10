// backend/src/services/orders.service.ts
import { query, withTransaction } from '../config/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShippingAddress {
  fullName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: string;
  // Joined
  name?: string;
  slug?: string;
  image_url?: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  total: string;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_status: string;
  created_at: Date;
  items?: OrderItem[];
  item_count?: number;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Place an order from the user's current cart.
 * Runs in a transaction:
 *  1. Read cart items (with product prices)
 *  2. Verify stock for every item
 *  3. Create the order
 *  4. Copy cart items → order_items (snapshot price at purchase time)
 *  5. Decrement product stock
 *  6. Clear the cart
 */
export async function placeOrder(
  userId: string,
  shippingAddress: ShippingAddress,
  paymentMethod: string = 'cod'
): Promise<Order> {
  return withTransaction(async (client) => {
    // 1. Get cart items with current product prices
    const cartResult = await client.query<{
      product_id: string;
      quantity: number;
      price: string;
      stock: number;
      name: string;
    }>(
      `SELECT ci.product_id, ci.quantity, p.price, p.stock, p.name
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       FOR UPDATE OF p`, // Lock product rows to prevent race conditions
      [userId]
    );

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // 2. Verify stock
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.name}". Requested: ${item.quantity}, Available: ${item.stock}`
        );
      }
    }

    // 3. Calculate total
    const total = cartItems
      .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);

    // 4. Create order
    const orderResult = await client.query<Order>(
      `INSERT INTO orders (user_id, status, total, shipping_address, payment_method, payment_status)
       VALUES ($1, 'confirmed', $2, $3, $4, 'pending')
       RETURNING *`,
      [userId, total, JSON.stringify(shippingAddress), paymentMethod]
    );

    const order = orderResult.rows[0];

    // 5. Copy cart items to order_items (snapshot prices)
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );
    }

    // 6. Decrement product stock
    for (const item of cartItems) {
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // 7. Clear the cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    return order;
  });
}

/**
 * Get all orders for a user, with item count.
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  return query<Order>(
    `SELECT o.*,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
}

/**
 * Get a single order with its items (including product details).
 * Returns null if not found or not owned by the user.
 */
export async function getOrderById(
  userId: string,
  orderId: string
): Promise<Order | null> {
  // Get order
  const orders = await query<Order>(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );

  if (orders.length === 0) return null;

  const order = orders[0];

  // Get order items with product details
  order.items = await query<OrderItem>(
    `SELECT oi.*, p.name, p.slug, p.image_url
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [orderId]
  );

  return order;
}
