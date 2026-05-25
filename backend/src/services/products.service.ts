// backend/src/services/products.service.ts
import { AppError, ConflictError } from '../utils/errors';
import { ProductRepository } from '../repositories/product.repository';
import type { ProductImageInput, ProductVariantInput } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { cacheDel } from '../config/redis';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
  attributes: Record<string, any>;
  image_url: string | null;
  created_at: Date;
}

export interface ProductImage {
  id: number;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

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
  brand: string | null;
  sku: string | null;
  compare_at_price: string | null;
  weight_grams: number | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: Date;
  updated_at: Date;
  variants?: ProductVariant[];
  gallery_images?: ProductImage[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: number | null;
  depth: number;
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
  brand?: string;
  min_price?: number;
  max_price?: number;
  parent_id?: number;
  min_rating?: number;
  specs?: Record<string, string>;
}): Promise<ProductListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 12;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.category) {
    conditions.push(`(c.slug = $${paramIndex} OR pc.slug = $${paramIndex})`);
    values.push(options.category);
    paramIndex++;
  }

  if (options.parent_id !== undefined) {
    conditions.push(`c.parent_id = $${paramIndex++}`);
    values.push(options.parent_id);
  }

  if (options.search) {
    conditions.push(`p.name ILIKE $${paramIndex++}`);
    values.push(`%${options.search}%`);
  }

  if (options.ids && options.ids.length > 0) {
    conditions.push(`p.id = ANY($${paramIndex++}::uuid[])`);
    values.push(options.ids);
  }

  if (options.brand) {
    conditions.push(`p.brand = $${paramIndex++}`);
    values.push(options.brand);
  }

  if (options.min_price !== undefined) {
    conditions.push(`p.price >= $${paramIndex++}`);
    values.push(options.min_price);
  }

  if (options.max_price !== undefined) {
    conditions.push(`p.price <= $${paramIndex++}`);
    values.push(options.max_price);
  }

  if (options.min_rating !== undefined) {
    conditions.push(`p.rating >= $${paramIndex++}`);
    values.push(options.min_rating);
  }

  if (options.specs) {
    Object.entries(options.specs).forEach(([key, value]) => {
      if (!key || !value) return;
      conditions.push(`p.specs ->> $${paramIndex++} ILIKE $${paramIndex++}`);
      values.push(key, `%${value}%`);
    });
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

export async function createCategory(data: { name: string; slug: string; image_url: string | null; parent_id?: number | null; depth?: number }): Promise<Category> {
  try {
    const category = await normalizeCategoryInput(data);
    const created = await CategoryRepository.create(category);
    await cacheDel('categories:all');
    return created;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A category with this name or slug already exists.');
    }
    throw error;
  }
}

export async function updateCategory(id: number, data: { name: string; slug: string; image_url: string | null; parent_id?: number | null; depth?: number }): Promise<Category | null> {
  try {
    if (data.parent_id === id) {
      throw new AppError('A category cannot be its own parent.', 400);
    }
    const category = await normalizeCategoryInput(data);
    const updated = await CategoryRepository.update(id, category);
    await cacheDel('categories:all');
    return updated;
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
  const deleted = await CategoryRepository.delete(id);
  if (deleted) await cacheDel('categories:all');
  return deleted;
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
  brand?: string | null;
  sku?: string | null;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  meta_title?: string | null;
  meta_description?: string | null;
  gallery_images?: ProductImageInput[];
  variants?: ProductVariantInput[];
}): Promise<Product> {
  const product = await ProductRepository.create(data);
  await cacheDel('categories:all', `products:featured:8`, `products:slug:${product.slug}`);
  return product;
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
  brand?: string | null;
  sku?: string | null;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  meta_title?: string | null;
  meta_description?: string | null;
  gallery_images?: ProductImageInput[];
  variants?: ProductVariantInput[];
}): Promise<Product | null> {
  const existing = await ProductRepository.getById(id);
  const product = await ProductRepository.update(id, data);
  await cacheDel(
    'categories:all',
    `products:featured:8`,
    ...(existing ? [`products:slug:${existing.slug}`] : []),
    ...(product ? [`products:slug:${product.slug}`] : [])
  );
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const existing = await ProductRepository.getById(id);
  const count = await ProductRepository.countInOrders(id);
  if (count > 0) {
    throw new ConflictError('Cannot delete product: It is referenced in existing orders.');
  }
  const deleted = await ProductRepository.delete(id);
  if (deleted) {
    await cacheDel(
      'categories:all',
      `products:featured:8`,
      ...(existing ? [`products:slug:${existing.slug}`] : [])
    );
  }
  return deleted;
}

async function normalizeCategoryInput(data: { name: string; slug: string; image_url: string | null; parent_id?: number | null; depth?: number }) {
  if (!data.parent_id) {
    return { ...data, parent_id: null, depth: 0 };
  }

  const parent = await CategoryRepository.getById(data.parent_id);
  if (!parent) {
    throw new AppError('Parent category not found.', 400);
  }

  return {
    ...data,
    parent_id: data.parent_id,
    depth: parent.depth + 1,
  };
}
