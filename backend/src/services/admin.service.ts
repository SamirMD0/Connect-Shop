// backend/src/services/admin.service.ts
import { query } from '../config/db';
import { User } from './auth.service';
import { Order } from './orders.service';

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

export async function getAllOrders(): Promise<Order[]> {
  const orders = await query<Order>(
    `SELECT o.*, u.name as customer_name, u.email as customer_email,
            (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC`
  );
  return orders;
}

export async function updateOrderStatus(id: string, status: string): Promise<Order | null> {
  const rows = await query<Order>(
    `UPDATE orders
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

export async function getMonthlyAnalytics(): Promise<AnalyticsSummary> {
  // Aggregate totals
  const revRow = await query<{ sum: string }>(`SELECT SUM(total) as sum FROM orders WHERE status != 'cancelled'`);
  const ordersRow = await query<{ count: string }>(`SELECT COUNT(*) as count FROM orders`);
  const customersRow = await query<{ count: string }>(`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`);
  const productsRow = await query<{ count: string }>(`SELECT COUNT(*) as count FROM products`);
  const categoriesRow = await query<{ count: string }>(`SELECT COUNT(*) as count FROM categories`);

  // Recent additions
  const recentProducts = await query(`SELECT id, name, price, stock, image_url FROM products ORDER BY created_at DESC LIMIT 5`);
  const recentCategories = await query(`
    SELECT c.id, c.name, c.slug, c.image_url, COUNT(p.id)::int as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
    LIMIT 5
  `);

  // Monthly revenue for the past 12 months (grouped by month)
  const monthlyRows = await query<MonthlyRevenue>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
            SUM(total) AS revenue
     FROM orders
     WHERE status != 'cancelled'
     GROUP BY date_trunc('month', created_at)
     ORDER BY date_trunc('month', created_at) ASC
     LIMIT 12`
  );

  return {
    totalRevenue: revRow[0].sum || '0.00',
    totalOrders: parseInt(ordersRow[0].count, 10),
    totalCustomers: parseInt(customersRow[0].count, 10),
    totalProducts: parseInt(productsRow[0].count, 10),
    totalCategories: parseInt(categoriesRow[0].count, 10),
    monthlyRevenue: monthlyRows,
    recentProducts,
    recentCategories,
  };
}
