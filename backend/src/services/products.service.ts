// backend/src/services/products.service.ts
import { AppError, ConflictError } from '../utils/errors';
import { ProductRepository } from '../repositories/product.repository';
import type { ProductImageInput, ProductVariantInput } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BrandRepository } from '../repositories/brand.repository';
import { delCache, delCacheByPattern } from '../config/redis';
import { CACHE_KEYS } from '../utils/cachePolicy';

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
  brand_id: number | null;
  brand: string | null;
  brand_slug?: string | null;
  brand_logo_url?: string | null;
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

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  product_count?: number;
  created_at: Date;
  updated_at: Date;
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
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const limit = Math.min(Math.max(1, Math.floor(options.limit ?? 12)), 100);
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
    conditions.push(`(p.brand = $${paramIndex} OR b.name = $${paramIndex} OR b.slug = $${paramIndex})`);
    values.push(options.brand);
    paramIndex++;
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
    popular: 'p.review_count DESC, p.rating DESC',
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
    totalPages: Math.max(1, Math.ceil(total / limit)),
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

export async function getBrands(): Promise<Brand[]> {
  return BrandRepository.getAll();
}

// ─── Admin Mutations ─────────────────────────────────────────────────────────

async function invalidateCategoryCaches(): Promise<void> {
  await Promise.all([
    delCache(CACHE_KEYS.categoriesTree, CACHE_KEYS.homepageFull),
    delCacheByPattern(CACHE_KEYS.productListPattern),
  ]);
}

export async function invalidateProductCaches(slugs: string[] = []): Promise<void> {
  await delCache(CACHE_KEYS.homepageFull, ...slugs.map((slug) => CACHE_KEYS.productSlug(slug)));
  await Promise.all([
    delCacheByPattern(CACHE_KEYS.featuredProductsPattern),
    delCacheByPattern(CACHE_KEYS.productListPattern),
  ]);
}

async function invalidateBrandCaches(): Promise<void> {
  await Promise.all([
    delCache(CACHE_KEYS.brandsPublic, CACHE_KEYS.homepageFull),
    delCacheByPattern(CACHE_KEYS.productListPattern),
  ]);
}

export async function createCategory(data: { name: string; slug: string; image_url: string | null; parent_id?: number | null; depth?: number }): Promise<Category> {
  try {
    const category = await normalizeCategoryInput(data);
    const created = await CategoryRepository.create(category);
    await invalidateCategoryCaches();
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
    if (data.parent_id && await CategoryRepository.isDescendant(id, data.parent_id)) {
      throw new AppError('A category cannot use one of its descendants as its parent.', 400);
    }
    const category = await normalizeCategoryInput(data);
    const updated = await CategoryRepository.update(id, category);
    await invalidateCategoryCaches();
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
  if (deleted) await invalidateCategoryCaches();
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
}): Promise<Product> {
  try {
    const productInput = await normalizeProductBrandInput(data);
    const product = await ProductRepository.create(productInput);
    await invalidateCategoryCaches();
    await invalidateProductCaches([product.slug]);
    return product;
  } catch (error: any) {
    handleProductWriteError(error);
  }
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
}): Promise<Product | null> {
  try {
    const existing = await ProductRepository.getById(id);
    const productInput = await normalizeProductBrandInput(data);
    const product = await ProductRepository.update(id, productInput);
    await invalidateCategoryCaches();
    await invalidateProductCaches([
      ...(existing ? [existing.slug] : []),
      ...(product ? [product.slug] : []),
    ]);
    return product;
  } catch (error: any) {
    handleProductWriteError(error);
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const existing = await ProductRepository.getById(id);
  const count = await ProductRepository.countInOrders(id);
  if (count > 0) {
    throw new ConflictError('Cannot delete product: It is referenced in existing orders.');
  }
  const deleted = await ProductRepository.delete(id);
  if (deleted) {
    await invalidateCategoryCaches();
    await invalidateProductCaches(existing ? [existing.slug] : []);
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

function handleProductWriteError(error: any): never {
  if (error.code === '23505') {
    const constraint = String(error.constraint || '');
    if (constraint.includes('slug')) {
      throw new ConflictError('A product with this slug already exists.');
    }
    if (constraint.includes('sku')) {
      throw new ConflictError('A product or variant with this SKU already exists.');
    }
    throw new ConflictError('A product with the same unique value already exists.');
  }

  if (error.code === '23503') {
    throw new AppError('Selected category, brand, or variant reference is invalid.', 400);
  }

  throw error;
}

async function normalizeProductBrandInput<T extends { brand_id?: number | null; brand?: string | null }>(data: T): Promise<T> {
  if (!data.brand_id) {
    return {
      ...data,
      brand_id: null,
      brand: data.brand?.trim() || null,
    };
  }

  const brand = await BrandRepository.getById(data.brand_id);
  if (!brand || !brand.is_active) {
    throw new AppError('Brand not found or inactive.', 400);
  }

  return {
    ...data,
    brand_id: brand.id,
    brand: brand.name,
  };
}

export async function createBrand(data: {
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  is_active?: boolean;
}): Promise<Brand> {
  try {
    const brand = await BrandRepository.create(data);
    await invalidateBrandCaches();
    return brand;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A brand with this name or slug already exists.');
    }
    throw error;
  }
}

export async function updateBrand(id: number, data: {
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  is_active?: boolean;
}): Promise<Brand | null> {
  try {
    const brand = await BrandRepository.update(id, data);
    if (brand) {
      await invalidateBrandCaches();
      await invalidateProductCaches();
    }
    return brand;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('A brand with this name or slug already exists.');
    }
    throw error;
  }
}

export async function deleteBrand(id: number): Promise<boolean> {
  const deleted = await BrandRepository.delete(id);
  if (deleted) {
    await invalidateBrandCaches();
    await invalidateProductCaches();
  }
  return deleted;
}
