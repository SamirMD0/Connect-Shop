import { query } from '../config/db';
import { Product } from '../services/products.service';

export class ProductRepository {
  static async listProducts(whereClause: string, orderBy: string, limit: number, offset: number, values: unknown[], paramIndex: number) {
    return query<Product>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );
  }

  static async countProducts(whereClause: string, values: unknown[]) {
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereClause}`,
      values
    );
  }

  static async getBySlug(slug: string) {
    const rows = await query<Product>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1`,
      [slug]
    );
    return rows[0] || null;
  }

  static async getFeatured(limit: number) {
    return query<Product>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.is_featured = true
       ORDER BY p.rating DESC
       LIMIT $1`,
      [limit]
    );
  }

  static async create(data: { name: string; slug: string; description: string | null; price: number; image_url: string | null; category_id: number; stock: number; is_featured: boolean }) {
    const rows = await query<Product>(
      `INSERT INTO products (name, slug, description, price, image_url, category_id, stock, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured]
    );
    return rows[0];
  }

  static async update(id: string, data: { name: string; slug: string; description: string | null; price: number; image_url: string | null; category_id: number; stock: number; is_featured: boolean }) {
    const rows = await query<Product>(
      `UPDATE products
       SET name = $1, slug = $2, description = $3, price = $4, image_url = $5, category_id = $6, stock = $7, is_featured = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured, id]
    );
    return rows[0] || null;
  }

  static async countInOrders(id: string) {
    const rows = await query<{ count: string }>(`SELECT COUNT(*) FROM order_items WHERE product_id = $1`, [id]);
    return parseInt(rows[0].count, 10);
  }

  static async delete(id: string) {
    const rows = await query<{ id: string }>(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  }
}
