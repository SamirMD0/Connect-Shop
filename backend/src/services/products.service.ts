// backend/src/services/products.service.ts
import { query } from '../config/db';

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
  icon: string | null;
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
