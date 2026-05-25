import { query } from '../config/db';
import type { AnalyticsSummary } from '../services/admin.service';

interface AnalyticsRow {
  total_revenue: string | null;
  total_orders: string;
  total_customers: string;
  total_products: string;
  total_categories: string;
  recent_products: AnalyticsSummary['recentProducts'];
  recent_categories: AnalyticsSummary['recentCategories'];
  monthly_revenue: AnalyticsSummary['monthlyRevenue'];
}

export class AdminRepository {
  static async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const rows = await query<AnalyticsRow>(
      `WITH totals AS (
         SELECT
           COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0)::text AS total_revenue,
           COUNT(o.id)::text AS total_orders,
           (SELECT COUNT(*)::text FROM users WHERE role = 'customer') AS total_customers,
           (SELECT COUNT(*)::text FROM products) AS total_products,
           (SELECT COUNT(*)::text FROM categories) AS total_categories
         FROM orders o
       ),
       recent_products AS (
         SELECT COALESCE(json_agg(row_to_json(product_rows)), '[]'::json) AS data
         FROM (
           SELECT id, name, price, stock, image_url
           FROM products
           ORDER BY created_at DESC
           LIMIT 5
         ) product_rows
       ),
       recent_categories AS (
         SELECT COALESCE(json_agg(row_to_json(category_rows)), '[]'::json) AS data
         FROM (
           SELECT c.id, c.name, c.slug, c.image_url, COUNT(p.id)::int AS product_count
           FROM categories c
           LEFT JOIN products p ON p.category_id = c.id
           GROUP BY c.id
           ORDER BY c.id DESC
           LIMIT 5
         ) category_rows
       ),
       monthly_revenue AS (
         SELECT COALESCE(json_agg(row_to_json(month_rows)), '[]'::json) AS data
         FROM (
           SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                  SUM(total)::text AS revenue
           FROM orders
           WHERE status != 'cancelled'
           GROUP BY date_trunc('month', created_at)
           ORDER BY date_trunc('month', created_at) ASC
           LIMIT 12
         ) month_rows
       )
       SELECT totals.total_revenue,
              totals.total_orders,
              totals.total_customers,
              totals.total_products,
              totals.total_categories,
              recent_products.data AS recent_products,
              recent_categories.data AS recent_categories,
              monthly_revenue.data AS monthly_revenue
       FROM totals
       CROSS JOIN recent_products
       CROSS JOIN recent_categories
       CROSS JOIN monthly_revenue`
    );

    const row = rows[0];
    return {
      totalRevenue: row.total_revenue || '0.00',
      totalOrders: parseInt(row.total_orders, 10),
      totalCustomers: parseInt(row.total_customers, 10),
      totalProducts: parseInt(row.total_products, 10),
      totalCategories: parseInt(row.total_categories, 10),
      monthlyRevenue: row.monthly_revenue,
      recentProducts: row.recent_products,
      recentCategories: row.recent_categories,
    };
  }
}
