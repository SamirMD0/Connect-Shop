// backend/src/services/products.service.ts
import { query } from '../config/db';
import { ConflictError } from '../utils/errors';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string; // DECIMAL comes as string from pg
  image_url: string | null;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  stock: number;
  rating: string;
  review_count: number;
  is_featured: boolean;
  specs: Record<string, string> | null;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  product_count?: number;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * List products with pagination, category filtering, and search.
 */
export async function listProducts(options: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<ProductListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 12;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.category) {
    conditions.push(`c.slug = $${paramIndex++}`);
    values.push(options.category);
  }

  if (options.search) {
    conditions.push(`p.name ILIKE $${paramIndex++}`);
    values.push(`%${options.search}%`);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  // Count total matching products
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM products p
     JOIN categories c ON c.id = p.category_id
     ${whereClause}`,
    values
  );
  const total = parseInt(countRows[0].count, 10);

  // Fetch paginated products
  const products = await query<Product>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     ${whereClause}
     ORDER BY p.is_featured DESC, p.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return {
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single product by slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = await query<Product>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1`,
    [slug]
  );

  return rows[0] || null;
}

/**
 * Get featured products (for the homepage).
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
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

/**
 * Get all categories with product counts.
 */
export async function getCategories(): Promise<Category[]> {
  return query<Category>(
    `SELECT c.*, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name`
  );
}

// ─── Admin Mutations ─────────────────────────────────────────────────────────

export async function createCategory(data: { name: string; slug: string; image_url: string | null }): Promise<Category> {
  try {
    const rows = await query<Category>(
      `INSERT INTO categories (name, slug, image_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.slug, data.image_url]
    );
    return rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A category with this name or slug already exists.');
    }
    throw error;
  }
}

export async function updateCategory(id: number, data: { name: string; slug: string; image_url: string | null }): Promise<Category | null> {
  try {
    const rows = await query<Category>(
      `UPDATE categories
       SET name = $1, slug = $2, image_url = $3
       WHERE id = $4
       RETURNING *`,
      [data.name, data.slug, data.image_url, id]
    );
    return rows[0] || null;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A category with this name or slug already exists.');
    }
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<boolean> {
  // Check if categories have products
  const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM products WHERE category_id = $1`, [id]);
  if (parseInt(countRes[0].count, 10) > 0) {
    throw new ConflictError('Cannot delete category: It has existing products. Please reassign or delete the products first.');
  }

  const rows = await query<{ id: number }>(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function createProduct(data: {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: number;
  stock: number;
  is_featured: boolean;
}): Promise<Product> {
  const rows = await query<Product>(
    `INSERT INTO products (name, slug, description, price, image_url, category_id, stock, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured]
  );
  return rows[0];
}

export async function updateProduct(id: string, data: {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: number;
  stock: number;
  is_featured: boolean;
}): Promise<Product | null> {
  const rows = await query<Product>(
    `UPDATE products
     SET name = $1, slug = $2, description = $3, price = $4, image_url = $5, category_id = $6, stock = $7, is_featured = $8, updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [data.name, data.slug, data.description, data.price, data.image_url, data.category_id, data.stock, data.is_featured, id]
  );
  return rows[0] || null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  // Check if product is in any orders
  const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM order_items WHERE product_id = $1`, [id]);
  if (parseInt(countRes[0].count, 10) > 0) {
    throw new ConflictError('Cannot delete product: It is referenced in existing orders.');
  }

  const rows = await query<{ id: string }>(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
