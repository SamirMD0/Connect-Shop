// backend/src/services/admin.service.ts
import { query } from '../config/db';
import { User } from './auth.service';
import { Order } from './orders.service';
import { AppError, NotFoundError } from '../utils/errors';
import { AdminRepository } from '../repositories/admin.repository';

export interface MonthlyRevenue {
  month: string;
  revenue: string;
}

export interface AnalyticsSummary {
  totalRevenue: string;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalCategories: number;
  monthlyRevenue: MonthlyRevenue[];
  recentProducts: any[];
  recentCategories: any[];
}

export async function getAllUsers(): Promise<User[]> {
  return query<User>(`SELECT id, google_id, email, name, avatar_url, role, created_at, updated_at FROM users ORDER BY created_at DESC`);
}

export interface OrderListResult {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ADMIN_ROLES = ['customer', 'support', 'manager', 'admin', 'super_admin'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export async function getAllOrders(page = 1, limit = 10): Promise<OrderListResult> {
  const offset = (page - 1) * limit;

  const countRows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM orders`);
  const total = parseInt(countRows[0].count, 10);

  const orders = await query<Order>(
    `SELECT o.*,
            COALESCE(u.name, o.shipping_address ->> 'fullName') as customer_name,
            COALESCE(u.email, o.guest_email) as customer_email,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateOrderStatus(id: string, status: string): Promise<Order | null> {
  const rows = await query<Order>(
    `UPDATE orders
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  if (rows[0]) {
    await query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [id, status, 'Updated by admin']
    );
  }
  return rows[0] || null;
}

export async function updateOrderTracking(id: string, data: {
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery_date?: string | null;
}): Promise<Order | null> {
  const rows = await query<Order>(
    `UPDATE orders
     SET tracking_carrier = $1,
         tracking_number = $2,
         tracking_url = $3,
         estimated_delivery_date = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      data.tracking_carrier || null,
      data.tracking_number || null,
      data.tracking_url || null,
      data.estimated_delivery_date || null,
      id,
    ]
  );

  if (rows[0]) {
    await query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [id, rows[0].status, `Tracking updated${data.tracking_number ? `: ${data.tracking_number}` : ''}`]
    );
  }

  return rows[0] || null;
}

export async function updateReturnRequestStatus(id: string, status: string): Promise<Record<string, any> | null> {
  if (!['requested', 'approved', 'rejected', 'refunded'].includes(status)) {
    throw new AppError('Invalid return status', 400);
  }

  const rows = await query(
    `UPDATE return_requests
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  if (rows[0]) {
    await query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [rows[0].order_id, status === 'refunded' ? 'refunded' : 'return_updated', `Return request ${status}`]
    );
  }

  return rows[0] || null;
}

export async function getUserDetail(id: string): Promise<Record<string, any> | null> {
  const users = await query<Record<string, any>>(
    `SELECT id, google_id, email, name, avatar_url, role, phone, email_verified_at,
            mfa_enabled, mfa_confirmed_at, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  if (!users[0]) return null;

  const [addresses, orders, totals] = await Promise.all([
    query(
      `SELECT id, label, recipient_name, phone, address_line1, address_line2, city, state,
              zip_code, country, notes, is_default, created_at, updated_at
       FROM user_addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [id]
    ),
    query(
      `SELECT id, status, total, payment_status, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    ),
    query<{ order_count: string; total_spent: string }>(
      `SELECT COUNT(*) AS order_count,
              COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0) AS total_spent
       FROM orders
       WHERE user_id = $1`,
      [id]
    ),
  ]);

  return {
    user: users[0],
    addresses,
    orders,
    totals: {
      order_count: parseInt(totals[0].order_count, 10),
      total_spent: totals[0].total_spent,
    },
  };
}

export async function updateUserRole(id: string, role: string, actorId: string): Promise<User> {
  if (!ADMIN_ROLES.includes(role as AdminRole)) {
    throw new AppError('Invalid role', 400);
  }

  if (id === actorId && !['admin', 'super_admin'].includes(role)) {
    throw new AppError('You cannot remove your own admin access.', 400);
  }

  const rows = await query<User>(
    `UPDATE users
     SET role = $1
     WHERE id = $2
     RETURNING id, google_id, email, name, avatar_url, role, created_at, updated_at`,
    [role, id]
  );

  if (!rows[0]) throw new NotFoundError('User');
  return rows[0];
}

export async function getOrderDetail(id: string): Promise<Record<string, any> | null> {
  const orders = await query<Record<string, any>>(
    `SELECT o.*,
            COALESCE(u.name, o.shipping_address ->> 'fullName') AS customer_name,
            COALESCE(u.email, o.guest_email) AS customer_email,
            COALESCE(u.phone, o.shipping_address ->> 'phone') AS customer_phone
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [id]
  );

  if (!orders[0]) return null;

  const items = await query(
    `SELECT oi.*, p.name, p.slug, p.image_url, pv.name AS current_variant_name, pv.sku AS variant_sku
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN product_variants pv ON pv.id = oi.variant_id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [id]
  );

  const [history, returns] = await Promise.all([
    query(
      `SELECT id, status, note, created_by, created_at
       FROM order_status_history
       WHERE order_id = $1
       ORDER BY created_at ASC, id ASC`,
      [id]
    ),
    query(
      `SELECT rr.*, u.email AS customer_email
       FROM return_requests rr
       LEFT JOIN users u ON u.id = rr.user_id
       WHERE rr.order_id = $1
       ORDER BY rr.created_at DESC`,
      [id]
    ),
  ]);

  return {
    ...orders[0],
    items,
    status_history: history,
    return_requests: returns,
  };
}

export async function getInventoryAlerts(threshold = 5): Promise<Record<string, any>[]> {
  return query(
    `SELECT 'product' AS item_type, p.id::text AS id, p.id::text AS product_id, NULL::text AS variant_id,
            p.name, p.sku, p.stock, p.image_url, p.updated_at
     FROM products p
     WHERE p.stock <= $1
     UNION ALL
     SELECT 'variant' AS item_type, pv.id::text AS id, pv.product_id::text AS product_id, pv.id::text AS variant_id,
            p.name || ' - ' || pv.name AS name, pv.sku, pv.stock, COALESCE(pv.image_url, p.image_url) AS image_url, pv.created_at AS updated_at
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.stock <= $1
     ORDER BY stock ASC, name ASC`,
    [threshold]
  );
}

export async function searchAdmin(q: string): Promise<Record<string, any>> {
  const term = `%${q}%`;
  const [products, orders, users, categories] = await Promise.all([
    query(
      `SELECT id, name, slug, sku, stock, price
       FROM products
       WHERE name ILIKE $1 OR slug ILIKE $1 OR sku ILIKE $1
       ORDER BY created_at DESC
       LIMIT 8`,
      [term]
    ),
    query(
      `SELECT o.id, o.status, o.total, o.created_at, u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id::text ILIKE $1 OR u.email ILIKE $1 OR u.name ILIKE $1
       ORDER BY o.created_at DESC
       LIMIT 8`,
      [term]
    ),
    query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY created_at DESC
       LIMIT 8`,
      [term]
    ),
    query(
      `SELECT id, name, slug
       FROM categories
       WHERE name ILIKE $1 OR slug ILIKE $1
       ORDER BY id DESC
       LIMIT 8`,
      [term]
    ),
  ]);

  return { products, orders, users, categories };
}

export async function getProductsForCsv(): Promise<Record<string, any>[]> {
  return query(
    `SELECT p.id, p.name, p.slug, p.description, p.price, p.image_url, p.category_id,
            c.name AS category_name, p.stock, p.is_featured, p.brand_id,
            COALESCE(b.name, p.brand) AS brand, p.sku,
            p.compare_at_price, p.weight_grams, p.meta_title, p.meta_description,
            p.created_at, p.updated_at
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     ORDER BY p.created_at DESC`
  );
}

export interface PromotionInput {
  title: string;
  description?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export async function listPromotions(): Promise<Record<string, any>[]> {
  return query(`SELECT * FROM promotions ORDER BY display_order ASC, created_at DESC`);
}

export async function createPromotion(data: PromotionInput): Promise<Record<string, any>> {
  const rows = await query(
    `INSERT INTO promotions (title, description, image_url, link_url, starts_at, ends_at, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.image_url || null,
      data.link_url || null,
      data.starts_at || null,
      data.ends_at || null,
      data.display_order ?? 0,
      data.is_active ?? true,
    ]
  );
  return rows[0];
}

export async function updatePromotion(id: number, data: PromotionInput): Promise<Record<string, any> | null> {
  const rows = await query(
    `UPDATE promotions
     SET title = $1, description = $2, image_url = $3, link_url = $4, starts_at = $5,
         ends_at = $6, display_order = $7, is_active = $8
     WHERE id = $9
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.image_url || null,
      data.link_url || null,
      data.starts_at || null,
      data.ends_at || null,
      data.display_order ?? 0,
      data.is_active ?? true,
      id,
    ]
  );
  return rows[0] || null;
}

export async function deletePromotion(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(`DELETE FROM promotions WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export interface CouponInput {
  code: string;
  description?: string | null;
  type: 'percent' | 'fixed';
  value: number;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  is_active?: boolean;
}

export async function listCoupons(): Promise<Record<string, any>[]> {
  return query(`SELECT * FROM coupons ORDER BY created_at DESC`);
}

export async function createCoupon(data: CouponInput): Promise<Record<string, any>> {
  const rows = await query(
    `INSERT INTO coupons (code, description, type, value, starts_at, expires_at, usage_limit, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.code.trim().toUpperCase(),
      data.description || null,
      data.type,
      data.value,
      data.starts_at || null,
      data.expires_at || null,
      data.usage_limit ?? null,
      data.is_active ?? true,
    ]
  );
  return rows[0];
}

export async function updateCoupon(id: number, data: CouponInput): Promise<Record<string, any> | null> {
  const rows = await query(
    `UPDATE coupons
     SET code = $1, description = $2, type = $3, value = $4, starts_at = $5,
         expires_at = $6, usage_limit = $7, is_active = $8
     WHERE id = $9
     RETURNING *`,
    [
      data.code.trim().toUpperCase(),
      data.description || null,
      data.type,
      data.value,
      data.starts_at || null,
      data.expires_at || null,
      data.usage_limit ?? null,
      data.is_active ?? true,
      id,
    ]
  );
  return rows[0] || null;
}

export async function deleteCoupon(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(`DELETE FROM coupons WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function getMonthlyAnalytics(): Promise<AnalyticsSummary> {
  return AdminRepository.getAnalyticsSummary();
}
