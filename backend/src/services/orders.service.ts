// backend/src/services/orders.service.ts
import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/db';
import { AppError } from '../utils/errors';
import { addToCart } from './cart.service';
import { invalidateProductCaches } from './products.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
  notes?: string;
}

export interface CheckoutItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

interface ResolvedOrderItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  name: string;
  variant_name: string | null;
  price: string;
  stock: number;
}

interface OrderItemPayload {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  price: string;
  variant_name: string | null;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: string;
  name?: string;
  slug?: string;
  image_url?: string | null;
  variant_id?: string | null;
  variant_name?: string | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: string;
  guest_email?: string | null;
  subtotal?: string;
  tax_amount?: string;
  shipping_cost?: string;
  discount_amount?: string;
  coupon_code?: string | null;
  delivery_slot?: string | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery_date?: string | null;
  cancelled_at?: Date | null;
  total: string;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_status: string;
  created_at: Date;
  items?: OrderItem[];
  item_count?: number;
  status_history?: Record<string, any>[];
  return_requests?: Record<string, any>[];
}

const TAX_RATE = 0.11;
const SHIPPING_BY_REGION: Record<string, number> = {
  beirut: 3,
  'mount lebanon': 4,
  north: 5,
  south: 5,
  bekaa: 5,
};
const CASH_ON_DELIVERY = 'cash_on_delivery';
export const MAX_ACTIVE_COD_ORDERS = 2;
export const ACTIVE_COD_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'shipped'];
const ACTIVE_COD_ORDER_LIMIT_MESSAGE =
  'You already have pending cash-on-delivery orders. Please wait until they are processed before placing another order.';

export class CheckoutAbuseError extends AppError {
  constructor(
    message: string,
    public readonly reason: 'active_cod_order_limit',
    public readonly activeOrderCount: number
  ) {
    super(message, 400);
  }
}

function normalizeRegion(shippingAddress: ShippingAddress): string {
  return (shippingAddress.state || shippingAddress.city || '').trim().toLowerCase();
}

function calculateShippingCost(shippingAddress: ShippingAddress, subtotal: number): number {
  if (subtotal >= 150) return 0;
  const region = normalizeRegion(shippingAddress);
  return SHIPPING_BY_REGION[region] ?? 4;
}

function normalizePaymentMethod(method?: string): string {
  const value = (method || CASH_ON_DELIVERY).trim();

  if (value === CASH_ON_DELIVERY || value === 'cod') {
    return CASH_ON_DELIVERY;
  }

  throw new AppError('Cash on delivery is the only supported payment method for checkout.', 400);
}

function normalizePhoneForCodLimit(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits || phone.trim().toLowerCase();
}

function paymentStatusFor(_method: string): string {
  return 'pending';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimateDeliveryDate(shippingAddress: ShippingAddress): string {
  const region = normalizeRegion(shippingAddress);
  const deliveryDays = region === 'beirut' ? 1 : region === 'mount lebanon' ? 2 : 3;
  const date = new Date();
  date.setDate(date.getDate() + deliveryDays);
  return date.toISOString().slice(0, 10);
}

function requireText(value: unknown, message: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(message, 400);
  return text;
}

function optionalText(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function normalizeShippingAddress(shippingAddress: ShippingAddress): ShippingAddress {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    throw new AppError('Delivery address is required.', 400);
  }

  const phone = requireText(shippingAddress.phone, 'Phone number is required.');
  if (phone.length < 7 || phone.length > 30) {
    throw new AppError('Phone number must be 7-30 characters.', 400);
  }

  return {
    fullName: requireText(shippingAddress.fullName, 'Recipient name is required.'),
    phone,
    addressLine1: requireText(shippingAddress.addressLine1, 'Address line 1 is required.'),
    addressLine2: optionalText(shippingAddress.addressLine2),
    city: requireText(shippingAddress.city, 'City is required.'),
    state: optionalText(shippingAddress.state),
    zipCode: optionalText(shippingAddress.zipCode),
    country: requireText(shippingAddress.country, 'Country is required.'),
    notes: optionalText(shippingAddress.notes),
  };
}

async function assertActiveCodOrderLimit(
  client: PoolClient,
  input: { userId: string | null; phone: string; paymentMethod: string }
): Promise<void> {
  if (input.paymentMethod !== CASH_ON_DELIVERY) return;

  const normalizedPhone = normalizePhoneForCodLimit(input.phone);
  const actorKey = input.userId ? `user:${input.userId}` : `phone:${normalizedPhone}`;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cod-order:${actorKey}`]);

  const activeOrderResult = input.userId
    ? await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE user_id = $1
         AND payment_method = $2
         AND status = ANY($3::text[])`,
      [input.userId, CASH_ON_DELIVERY, ACTIVE_COD_ORDER_STATUSES]
    )
    : await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE user_id IS NULL
         AND payment_method = $1
         AND status = ANY($2::text[])
         AND (
           regexp_replace(COALESCE(shipping_address->>'phone', ''), '\\D', '', 'g') = $3
           OR LOWER(TRIM(COALESCE(shipping_address->>'phone', ''))) = $3
         )`,
      [CASH_ON_DELIVERY, ACTIVE_COD_ORDER_STATUSES, normalizedPhone]
    );

  const activeOrderCount = parseInt(activeOrderResult.rows[0]?.count || '0', 10);
  if (activeOrderCount >= MAX_ACTIVE_COD_ORDERS) {
    throw new CheckoutAbuseError(
      ACTIVE_COD_ORDER_LIMIT_MESSAGE,
      'active_cod_order_limit',
      activeOrderCount
    );
  }
}

function pdfEscape(value: unknown): string {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Buffer {
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 780 Td',
    ...lines.flatMap((line, index) => [
      index === 0 ? `(${pdfEscape(line)}) Tj` : `0 -18 Td (${pdfEscape(line)}) Tj`,
    ]),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

async function applyCoupon(client: PoolClient, couponCode: string | undefined, subtotal: number) {
  const code = couponCode?.trim().toUpperCase();
  if (!code) return { coupon: null, discount: 0 };

  const couponResult = await client.query<{
    id: number;
    code: string;
    type: 'percent' | 'fixed';
    value: string;
    usage_limit: number | null;
    used_count: number;
  }>(
    `SELECT id, code, type, value, usage_limit, used_count
     FROM coupons
     WHERE code = $1
       AND is_active = TRUE
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (expires_at IS NULL OR expires_at >= NOW())
     FOR UPDATE`,
    [code]
  );

  const coupon = couponResult.rows[0];
  if (!coupon) {
    throw new AppError('Coupon is invalid or expired.', 400);
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    throw new AppError('Coupon usage limit reached.', 400);
  }

  const rawDiscount = coupon.type === 'percent'
    ? subtotal * (parseFloat(coupon.value) / 100)
    : parseFloat(coupon.value);

  return { coupon, discount: roundMoney(Math.min(rawDiscount, subtotal)) };
}

async function resolveOrderItems(client: PoolClient, items: CheckoutItemInput[]): Promise<ResolvedOrderItem[]> {
  if (items.length === 0) throw new AppError('Cart is empty', 400);

  return Promise.all(items.map(async (item) => {
    if (item.quantity < 1 || item.quantity > 99) {
      throw new AppError('Invalid item quantity.', 400);
    }

    if (item.variantId) {
      const variantResult = await client.query<ResolvedOrderItem>(
        `SELECT p.id AS product_id, pv.id AS variant_id, $3::int AS quantity,
                p.name, pv.name AS variant_name, pv.price, pv.stock
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = $1 AND p.id = $2
         FOR UPDATE OF pv`,
        [item.variantId, item.productId, item.quantity]
      );
      const variant = variantResult.rows[0];
      if (!variant) throw new AppError('Selected variant is no longer available.', 400);
      return variant;
    }

    const productResult = await client.query<ResolvedOrderItem>(
      `SELECT p.id AS product_id, NULL::uuid AS variant_id, $2::int AS quantity,
              p.name, NULL::text AS variant_name, p.price, p.stock
       FROM products p
       WHERE p.id = $1
       FOR UPDATE`,
      [item.productId, item.quantity]
    );
    const product = productResult.rows[0];
    if (!product) throw new AppError('Product is no longer available.', 400);
    return product;
  }));
}

async function createOrderFromItems(
  client: PoolClient,
  options: {
    userId: string | null;
    guestEmail?: string | null;
    items: ResolvedOrderItem[];
    shippingAddress: ShippingAddress;
    paymentMethod: string;
    couponCode?: string;
    deliverySlot?: string | null;
  }
): Promise<Order> {
  const paymentMethod = normalizePaymentMethod(options.paymentMethod);
  const normalizedShippingAddress = normalizeShippingAddress(options.shippingAddress);
  await assertActiveCodOrderLimit(client, {
    userId: options.userId,
    phone: normalizedShippingAddress.phone,
    paymentMethod,
  });

  for (const item of options.items) {
    if (item.stock < item.quantity) {
      const itemName = item.variant_name ? `${item.name} (${item.variant_name})` : item.name;
      throw new AppError(
        `Insufficient stock for "${itemName}". Requested: ${item.quantity}, Available: ${item.stock}`,
        400
      );
    }
  }

  const subtotal = roundMoney(options.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0));
  const { coupon, discount } = await applyCoupon(client, options.couponCode, subtotal);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = roundMoney(taxableAmount * TAX_RATE);
  const shippingCost = calculateShippingCost(normalizedShippingAddress, subtotal);
  const total = roundMoney(taxableAmount + taxAmount + shippingCost);

  const shippingAddress = {
    ...normalizedShippingAddress,
    deliverySlot: options.deliverySlot || null,
  };
  const estimatedDeliveryDate = estimateDeliveryDate(normalizedShippingAddress);

  const orderResult = await client.query<Order>(
    `INSERT INTO orders (
       user_id, guest_email, status, subtotal, tax_amount, shipping_cost, discount_amount,
       coupon_code, total, shipping_address, payment_method, payment_status, delivery_slot,
       estimated_delivery_date
     )
     VALUES ($1, $2, 'confirmed', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      options.userId,
      options.guestEmail || null,
      subtotal.toFixed(2),
      taxAmount.toFixed(2),
      shippingCost.toFixed(2),
      discount.toFixed(2),
      coupon?.code || null,
      total.toFixed(2),
      JSON.stringify(shippingAddress),
      paymentMethod,
      paymentStatusFor(paymentMethod),
      options.deliverySlot || null,
      estimatedDeliveryDate,
    ]
  );

  const order = orderResult.rows[0];
  const itemPayload: OrderItemPayload[] = options.items.map((item) => ({
    product_id: item.product_id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    price: item.price,
    variant_name: item.variant_name,
  }));
  const itemPayloadJson = JSON.stringify(itemPayload);

  await client.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, variant_id, variant_name)
     SELECT $1,
            payload.product_id,
            payload.quantity,
            payload.price,
            payload.variant_id,
            payload.variant_name
     FROM jsonb_to_recordset($2::jsonb) AS payload(
       product_id uuid,
       variant_id uuid,
       quantity integer,
       price numeric,
       variant_name text
     )`,
    [order.id, itemPayloadJson]
  );

  await client.query(
    `UPDATE product_variants pv
     SET stock = pv.stock - updates.quantity
     FROM (
       SELECT payload.variant_id, SUM(payload.quantity)::integer AS quantity
       FROM jsonb_to_recordset($1::jsonb) AS payload(variant_id uuid, quantity integer)
       WHERE payload.variant_id IS NOT NULL
       GROUP BY payload.variant_id
     ) updates
     WHERE pv.id = updates.variant_id`,
    [itemPayloadJson]
  );

  await client.query(
    `UPDATE products p
     SET stock = p.stock - updates.quantity
     FROM (
       SELECT payload.product_id, SUM(payload.quantity)::integer AS quantity
       FROM jsonb_to_recordset($1::jsonb) AS payload(product_id uuid, variant_id uuid, quantity integer)
       WHERE payload.variant_id IS NULL
       GROUP BY payload.product_id
     ) updates
     WHERE p.id = updates.product_id`,
    [itemPayloadJson]
  );

  if (coupon) {
    await client.query(`UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`, [coupon.id]);
    await client.query(
      `INSERT INTO coupon_usage (coupon_id, order_id, user_id, guest_email)
       VALUES ($1, $2, $3, $4)`,
      [coupon.id, order.id, options.userId, options.guestEmail || null]
    );
  }

  await client.query(
    `INSERT INTO order_status_history (order_id, status, note)
     VALUES ($1, $2, $3)`,
    [order.id, 'confirmed', 'Order placed']
  );

  return order;
}

// ─── Service Functions ───────────────────────────────────────────────────────

async function invalidateCachesForProductIds(productIds: string[]): Promise<void> {
  const uniqueProductIds = [...new Set(productIds)];
  if (uniqueProductIds.length === 0) return;

  const products = await query<{ slug: string }>(
    `SELECT slug FROM products WHERE id = ANY($1::uuid[])`,
    [uniqueProductIds]
  );

  await invalidateProductCaches(products.map((product) => product.slug));
}

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
  paymentMethod: string = CASH_ON_DELIVERY,
  options: { couponCode?: string; deliverySlot?: string | null } = {}
): Promise<Order> {
  let affectedProductIds: string[] = [];

  const order = await withTransaction(async (client) => {
    const cartResult = await client.query<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }>(
      `SELECT ci.product_id, ci.variant_id, ci.quantity
       FROM cart_items ci
       WHERE ci.user_id = $1 AND ci.expires_at > NOW()`,
      [userId]
    );
    const cartItems = await resolveOrderItems(client, cartResult.rows.map(item => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    })));
    affectedProductIds = cartItems.map((item) => item.product_id);

    const order = await createOrderFromItems(client, {
      userId,
      items: cartItems,
      shippingAddress,
      paymentMethod,
      couponCode: options.couponCode,
      deliverySlot: options.deliverySlot,
    });

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    return order;
  });

  await invalidateCachesForProductIds(affectedProductIds);
  return order;
}

export async function placeGuestOrder(
  guestEmail: string,
  items: CheckoutItemInput[],
  shippingAddress: ShippingAddress,
  paymentMethod: string = CASH_ON_DELIVERY,
  options: { couponCode?: string; deliverySlot?: string | null } = {}
): Promise<Order> {
  let affectedProductIds: string[] = [];

  const order = await withTransaction(async (client) => {
    const resolvedItems = await resolveOrderItems(client, items);
    affectedProductIds = resolvedItems.map((item) => item.product_id);
    return createOrderFromItems(client, {
      userId: null,
      guestEmail,
      items: resolvedItems,
      shippingAddress,
      paymentMethod,
      couponCode: options.couponCode,
      deliverySlot: options.deliverySlot,
    });
  });

  await invalidateCachesForProductIds(affectedProductIds);
  return order;
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

  order.status_history = await getOrderStatusHistory(orderId);
  order.return_requests = await getReturnRequestsForOrder(orderId);

  return order;
}

export async function getOrderStatusHistory(orderId: string): Promise<Record<string, any>[]> {
  return query(
    `SELECT id, order_id, status, note, created_by, created_at
     FROM order_status_history
     WHERE order_id = $1
     ORDER BY created_at ASC, id ASC`,
    [orderId]
  );
}

export async function getReturnRequestsForOrder(orderId: string): Promise<Record<string, any>[]> {
  return query(
    `SELECT id, order_id, user_id, reason, status, created_at, updated_at
     FROM return_requests
     WHERE order_id = $1
     ORDER BY created_at DESC`,
    [orderId]
  );
}

export async function cancelOrder(userId: string, orderId: string): Promise<Order> {
  const rows = await query<Order>(
    `UPDATE orders
     SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status IN ('confirmed', 'processing')
     RETURNING *`,
    [orderId, userId]
  );

  if (!rows[0]) {
    throw new AppError('Order cannot be cancelled at this stage.', 400);
  }

  await query(
    `INSERT INTO order_status_history (order_id, status, note)
     VALUES ($1, 'cancelled', 'Cancelled by customer')`,
    [orderId]
  );

  return rows[0];
}

export async function createReturnRequest(userId: string, orderId: string, reason: string): Promise<Record<string, any>> {
  const orders = await query<{ id: string }>(
    `SELECT id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'delivered'`,
    [orderId, userId]
  );

  if (!orders[0]) {
    throw new AppError('Returns can only be requested for delivered orders.', 400);
  }

  const rows = await query(
    `INSERT INTO return_requests (order_id, user_id, reason)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [orderId, userId, reason]
  );

  await query(
    `INSERT INTO order_status_history (order_id, status, note)
     VALUES ($1, 'return_requested', $2)`,
    [orderId, reason]
  );

  return rows[0];
}

export async function reorder(userId: string, orderId: string): Promise<void> {
  const order = await getOrderById(userId, orderId);
  if (!order?.items?.length) {
    throw new AppError('Order has no items to reorder.', 400);
  }

  for (const item of order.items) {
    await addToCart(userId, item.product_id, item.quantity, item.variant_id || null);
  }
}

export async function generateInvoicePdf(userId: string, orderId: string): Promise<Buffer> {
  const order = await getOrderById(userId, orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const lines = [
    'ElecSHOP Invoice',
    `Order: ${order.id}`,
    `Date: ${new Date(order.created_at).toLocaleDateString()}`,
    `Customer: ${order.shipping_address.fullName}`,
    `Phone: ${order.shipping_address.phone || ''}`,
    `Payment: ${order.payment_method}`,
    `Subtotal: $${order.subtotal || '0.00'}`,
    `Tax: $${order.tax_amount || '0.00'}`,
    `Shipping: $${order.shipping_cost || '0.00'}`,
    `Discount: $${order.discount_amount || '0.00'}`,
    `Total: $${order.total}`,
    'Items:',
    ...(order.items || []).map(item => `${item.quantity} x ${item.name || item.product_id} - $${item.price_at_purchase}`),
  ];

  return buildSimplePdf(lines);
}
