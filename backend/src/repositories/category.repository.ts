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

  static async create(data: { name: string; slug: string; image_url: string | null }) {
    const rows = await query<Category>(
      `INSERT INTO categories (name, slug, image_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.slug, data.image_url]
    );
    return rows[0];
  }

  static async update(id: number, data: { name: string; slug: string; image_url: string | null }) {
    const rows = await query<Category>(
      `UPDATE categories
       SET name = $1, slug = $2, image_url = $3
       WHERE id = $4
       RETURNING *`,
      [data.name, data.slug, data.image_url, id]
    );
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
