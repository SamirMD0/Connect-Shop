import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/db';
import { AppError } from '../utils/errors';
import { assertInventoryChange } from '../services/inventoryVersion';
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
  stock?: number;
  inventory_version?: number;
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
  stock?: number;
  inventory_version?: number;
  is_featured: boolean;
  brand_id?: number | null;
  brand?: string | null;
  sku?: string | null;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  specs?: Record<string, string> | null;
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

  static async create(data: ProductWriteInput & { stock: number }) {
    return withTransaction(async (client) => {
      const rows = await client.query<Product>(
        `INSERT INTO products (name, slug, description, price, image_url, category_id, stock, is_featured, brand_id, brand, sku, compare_at_price, weight_grams, specs, meta_title, meta_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured, data.brand_id ?? null, data.brand || null, data.sku || null, data.compare_at_price ?? null, data.weight_grams ?? null, data.specs ? JSON.stringify(data.specs) : null, data.meta_title || null, data.meta_description || null]
      );
      const product = rows.rows[0];
      await this.replaceImages(client, product.id, data.gallery_images || []);
      await this.syncVariants(client, product.id, data.variants || []);
      return product;
    });
  }

  static async update(id: string, data: ProductWriteInput) {
    return withTransaction(async (client) => {
      const current = (await client.query<Product>('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!current) return null;
      if (data.stock !== undefined) assertInventoryChange(data.stock, data.inventory_version, current.inventory_version);
      const rows = await client.query<Product>(
        `UPDATE products
         SET name = $1, slug = $2, description = $3, price = $4, image_url = $5, category_id = $6, stock = COALESCE($7::int, stock), is_featured = $8,
             brand_id = $9, brand = $10, sku = $11, compare_at_price = $12, weight_grams = $13, specs = $14, meta_title = $15, meta_description = $16, updated_at = NOW()
         WHERE id = $17
         RETURNING *`,
        [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured, data.brand_id ?? null, data.brand || null, data.sku || null, data.compare_at_price ?? null, data.weight_grams ?? null, data.specs ? JSON.stringify(data.specs) : null, data.meta_title || null, data.meta_description || null, id]
      );
      const product = rows.rows[0] || null;
      if (!product) return null;
      await this.replaceImages(client, id, data.gallery_images || []);
      if (data.variants !== undefined) await this.syncVariants(client, id, data.variants);
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

  static async syncVariants(client: PoolClient, productId: string, variants: ProductVariantInput[]) {
    const current = (await client.query<ProductVariant>(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id FOR UPDATE', [productId])).rows;
    const byId = new Map(current.map(variant => [variant.id, variant]));
    const kept: string[] = [];
    const seen = new Set<string>();
    for (const variant of variants) {
      if (!variant.sku?.trim() || !variant.name?.trim() || !Number.isFinite(variant.price) || variant.price <= 0) {
        throw new AppError('Each variant requires a SKU, name and positive price.', 400);
      }
      if (variant.id) {
        const saved = byId.get(variant.id);
        if (!saved || !saved.is_active || seen.has(variant.id)) {
          throw new AppError('Variant is unavailable, duplicated or does not belong to this product. Reload the product.', 409, true, 'VARIANT_CONFLICT');
        }
        seen.add(variant.id); kept.push(variant.id);
        if (variant.stock !== undefined) assertInventoryChange(variant.stock, variant.inventory_version, saved.inventory_version);
        await client.query(
          'UPDATE product_variants SET sku = $2, name = $3, price = $4, attributes = $5::jsonb, image_url = $6, stock = COALESCE($7::int, stock) WHERE id = $1',
          [variant.id, variant.sku.trim(), variant.name.trim(), variant.price, JSON.stringify(variant.attributes || {}), variant.image_url || null, variant.stock]);
      } else {
        if (current.some(saved => saved.sku === variant.sku.trim())) {
          throw new AppError('Existing variants must retain their ID; retired SKUs cannot be recreated.', 409, true, 'VARIANT_ID_REQUIRED');
        }
        if (!Number.isSafeInteger(variant.stock) || Number(variant.stock) < 0) throw new AppError('New variants require nonnegative stock.', 400);
        const created = await client.query<{ id: string }>(
          'INSERT INTO product_variants (product_id, sku, name, price, stock, attributes, image_url) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING id',
          [productId, variant.sku.trim(), variant.name.trim(), variant.price, variant.stock, JSON.stringify(variant.attributes || {}), variant.image_url || null]);
        kept.push(created.rows[0].id);
      }
    }
    await client.query('UPDATE product_variants SET is_active = FALSE WHERE product_id = $1 AND is_active AND NOT (id = ANY($2::uuid[]))', [productId, kept]);
  }
}
