// backend/src/services/products.service.ts
import { ConflictError } from '../utils/errors';
import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';

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
  sort?: string;
  ids?: string[];
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

  if (options.ids && options.ids.length > 0) {
    conditions.push(`p.id = ANY($${paramIndex++}::uuid[])`);
    values.push(options.ids);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  // Build ORDER BY from sort param (whitelist to prevent SQL injection)
  const sortMap: Record<string, string> = {
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    newest: 'p.created_at DESC',
    rating: 'p.rating DESC',
  };
  const orderBy = sortMap[options.sort ?? ''] ?? 'p.is_featured DESC, p.created_at DESC';

  const countRows = await ProductRepository.countProducts(whereClause, values);
  const total = parseInt(countRows[0].count, 10);

  const products = await ProductRepository.listProducts(whereClause, orderBy, limit, offset, values, paramIndex);

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
  return ProductRepository.getBySlug(slug);
}

/**
 * Get featured products (for the homepage).
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return ProductRepository.getFeatured(limit);
}

/**
 * Get all categories with product counts.
 */
export async function getCategories(): Promise<Category[]> {
  return CategoryRepository.getAll();
}

// ─── Admin Mutations ─────────────────────────────────────────────────────────

export async function createCategory(data: { name: string; slug: string; image_url: string | null }): Promise<Category> {
  try {
    return await CategoryRepository.create(data);
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A category with this name or slug already exists.');
    }
    throw error;
  }
}

export async function updateCategory(id: number, data: { name: string; slug: string; image_url: string | null }): Promise<Category | null> {
  try {
    return await CategoryRepository.update(id, data);
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A category with this name or slug already exists.');
    }
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<boolean> {
  const count = await CategoryRepository.countProducts(id);
  if (count > 0) {
    throw new ConflictError('Cannot delete category: It has existing products. Please reassign or delete the products first.');
  }
  return CategoryRepository.delete(id);
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
  return ProductRepository.create(data);
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
  return ProductRepository.update(id, data);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const count = await ProductRepository.countInOrders(id);
  if (count > 0) {
    throw new ConflictError('Cannot delete product: It is referenced in existing orders.');
  }
  return ProductRepository.delete(id);
}
