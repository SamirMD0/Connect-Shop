import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/db';
import type { Product, ProductImage, ProductVariant } from '../services/products.service';

export interface ProductImageInput {
  image_url: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
}

export interface ProductVariantInput {
  id?: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes?: Record<string, unknown>;
  image_url?: string | null;
}

interface ProductWriteInput {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: number;
  stock: number;
  is_featured: boolean;
  brand_id?: number | null;
  brand?: string | null;
  sku?: string | null;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  meta_title?: string | null;
  meta_description?: string | null;
  gallery_images?: ProductImageInput[];
  variants?: ProductVariantInput[];
}

export class ProductRepository {
  static async listProducts(whereClause: string, orderBy: string, limit: number, offset: number, values: unknown[], paramIndex: number) {
    return query<Product>(
      `SELECT p.*, COALESCE(b.name, p.brand) AS brand, b.slug AS brand_slug, b.logo_url AS brand_logo_url,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN brands b ON b.id = p.brand_id
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
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN brands b ON b.id = p.brand_id
       ${whereClause}`,
      values
    );
  }

  static async getBySlug(slug: string) {
    const rows = await query<Product>(
      `SELECT p.*, COALESCE(b.name, p.brand) AS brand, b.slug AS brand_slug, b.logo_url AS brand_logo_url,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.slug = $1`,
      [slug]
    );
    if (!rows[0]) return null;

    const product = rows[0];

    const images = await query<ProductImage>(
      `SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC`,
      [product.id]
    );
    product.gallery_images = images;

    const variants = await query<ProductVariant>(
      `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at ASC`,
      [product.id]
    );
    product.variants = variants;

    return product;
  }

  static async getById(id: string) {
    const rows = await query<Product>(
      `SELECT p.*, COALESCE(b.name, p.brand) AS brand, b.slug AS brand_slug, b.logo_url AS brand_logo_url,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async getFeatured(limit: number) {
    return query<Product>(
      `SELECT p.*, COALESCE(b.name, p.brand) AS brand, b.slug AS brand_slug, b.logo_url AS brand_logo_url,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.is_featured = true
       ORDER BY p.rating DESC
       LIMIT $1`,
      [limit]
    );
  }

  static async create(data: ProductWriteInput) {
    return withTransaction(async (client) => {
      const rows = await client.query<Product>(
        `INSERT INTO products (name, slug, description, price, image_url, category_id, stock, is_featured, brand_id, brand, sku, compare_at_price, weight_grams, meta_title, meta_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured, data.brand_id ?? null, data.brand || null, data.sku || null, data.compare_at_price ?? null, data.weight_grams ?? null, data.meta_title || null, data.meta_description || null]
      );
      const product = rows.rows[0];
      await this.replaceImages(client, product.id, data.gallery_images || []);
      await this.replaceVariants(client, product.id, data.variants || []);
      return product;
    });
  }

  static async update(id: string, data: ProductWriteInput) {
    return withTransaction(async (client) => {
      const rows = await client.query<Product>(
        `UPDATE products
         SET name = $1, slug = $2, description = $3, price = $4, image_url = $5, category_id = $6, stock = $7, is_featured = $8,
             brand_id = $9, brand = $10, sku = $11, compare_at_price = $12, weight_grams = $13, meta_title = $14, meta_description = $15, updated_at = NOW()
         WHERE id = $16
         RETURNING *`,
        [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured, data.brand_id ?? null, data.brand || null, data.sku || null, data.compare_at_price ?? null, data.weight_grams ?? null, data.meta_title || null, data.meta_description || null, id]
      );
      const product = rows.rows[0] || null;
      if (!product) return null;
      await this.replaceImages(client, id, data.gallery_images || []);
      await this.replaceVariants(client, id, data.variants || []);
      return product;
    });
  }

  static async countInOrders(id: string) {
    const rows = await query<{ count: string }>(`SELECT COUNT(*) FROM order_items WHERE product_id = $1`, [id]);
    return parseInt(rows[0].count, 10);
  }

  static async delete(id: string) {
    const rows = await query<{ id: string }>(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  }

  static async replaceImages(client: PoolClient, productId: string, images: ProductImageInput[]) {
    await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);

    for (const [index, image] of images.entries()) {
      if (!image.image_url) continue;
      await client.query(
        `INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
         VALUES ($1, $2, $3, $4, $5)`,
        [productId, image.image_url, image.alt_text || null, image.sort_order ?? index, image.is_primary ?? false]
      );
    }
  }

  static async replaceVariants(client: PoolClient, productId: string, variants: ProductVariantInput[]) {
    await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [productId]);

    for (const variant of variants) {
      if (!variant.sku || !variant.name) continue;
      await client.query(
        `INSERT INTO product_variants (product_id, sku, name, price, stock, attributes, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          productId,
          variant.sku,
          variant.name,
          variant.price,
          variant.stock,
          JSON.stringify(variant.attributes || {}),
          variant.image_url || null,
        ]
      );
    }
  }
}
