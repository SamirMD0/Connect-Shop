import { query } from '../config/db';
import { Category } from '../services/products.service';

export class CategoryRepository {
  static async getAll() {
    return query<Category>(
      `SELECT c.*, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
  }

  static async create(data: { name: string; slug: string; image_url: string | null; parent_id?: number | null; depth?: number }) {
    const rows = await query<Category>(
      `INSERT INTO categories (name, slug, image_url, parent_id, depth)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.slug, data.image_url, data.parent_id ?? null, data.depth ?? 0]
    );
    return rows[0];
  }

  static async update(id: number, data: { name: string; slug: string; image_url: string | null; parent_id?: number | null; depth?: number }) {
    const rows = await query<Category>(
      `UPDATE categories
       SET name = $1, slug = $2, image_url = $3, parent_id = $4, depth = $5
       WHERE id = $6
       RETURNING *`,
      [data.name, data.slug, data.image_url, data.parent_id ?? null, data.depth ?? 0, id]
    );
    return rows[0] || null;
  }

  static async getById(id: number) {
    const rows = await query<Category>(`SELECT * FROM categories WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  static async countProducts(id: number) {
    const rows = await query<{ count: string }>(`SELECT COUNT(*) FROM products WHERE category_id = $1`, [id]);
    return parseInt(rows[0].count, 10);
  }

  static async delete(id: number) {
    const rows = await query<{ id: number }>(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  }
}
