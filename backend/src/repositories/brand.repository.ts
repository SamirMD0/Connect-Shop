import { query } from '../config/db';
import type { Brand } from '../services/products.service';

export interface BrandInput {
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export class BrandRepository {
  static async getAll(): Promise<Brand[]> {
    return query<Brand>(
      `SELECT b.*,
              COUNT(p.id)::int AS product_count
       FROM brands b
       LEFT JOIN products p ON p.brand_id = b.id
       GROUP BY b.id
       ORDER BY b.name ASC`
    );
  }

  static async getById(id: number): Promise<Brand | null> {
    const rows = await query<Brand>(`SELECT * FROM brands WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  static async create(data: BrandInput): Promise<Brand> {
    const rows = await query<Brand>(
      `INSERT INTO brands (name, slug, logo_url, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.logo_url || null,
        data.description || null,
        data.is_active ?? true,
      ]
    );

    return rows[0];
  }

  static async update(id: number, data: BrandInput): Promise<Brand | null> {
    const rows = await query<Brand>(
      `UPDATE brands
       SET name = $1,
           slug = $2,
           logo_url = $3,
           description = $4,
           is_active = $5
       WHERE id = $6
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.logo_url || null,
        data.description || null,
        data.is_active ?? true,
        id,
      ]
    );

    return rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const rows = await query<{ id: number }>(`DELETE FROM brands WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  }
}
