// backend/src/controllers/products.controller.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getJsonCache, setJsonCache } from '../config/redis';
import {
  listProducts,
  getProductBySlug,
  getFeaturedProducts,
  getCategories,
  Product,
  ProductListResult,
  Category,
} from '../services/products.service';
import { CACHE_KEYS, CACHE_TTL_SECONDS, normalizeProductListCacheParams } from '../utils/cachePolicy';
import { NotFoundError } from '../utils/errors';

function buildWeakEtag(payload: string): string {
  return `W/"${crypto.createHash('sha1').update(payload).digest('hex')}"`;
}

function sendCachedJson(req: Request, res: Response, body: unknown, maxAgeSeconds: number): void {
  const payload = JSON.stringify(body);
  const etag = buildWeakEtag(payload);

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=300`);

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.type('application/json').send(payload);
}

/**
 * GET /api/products
 * List products with optional filters: ?page=1&limit=12&category=laptops&search=titan
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const sort = req.query.sort as string | undefined;
    const idsString = req.query.ids as string | undefined;
    const ids = idsString ? idsString.split(',').filter(Boolean) : undefined;
    const brand = req.query.brand as string | undefined;
    const min_price = req.query.min_price ? parseFloat(req.query.min_price as string) : undefined;
    const max_price = req.query.max_price ? parseFloat(req.query.max_price as string) : undefined;
    const parent_id = req.query.parent_id ? parseInt(req.query.parent_id as string, 10) : undefined;
    const min_rating = req.query.min_rating ? parseFloat(req.query.min_rating as string) : undefined;
    const specsString = req.query.specs as string | undefined;
    const specs = specsString
      ? Object.fromEntries(
          specsString
            .split(',')
            .map((entry) => entry.split(':').map((part) => part.trim()))
            .filter(([key, value]) => key && value)
        )
      : undefined;
    const cacheParams = normalizeProductListCacheParams({
      page,
      limit,
      category,
      search,
      sort,
      ids,
      brand,
      min_price,
      max_price,
      parent_id,
      min_rating,
      specs,
    });
    const cacheKey = CACHE_KEYS.productList(cacheParams);

    const cached = await getJsonCache<ProductListResult>(cacheKey);
    if (cached) {
      sendCachedJson(req, res, { success: true, ...cached }, 30);
      return;
    }

    const result = await listProducts({
      page,
      limit,
      category,
      search,
      sort,
      ids,
      brand,
      min_price,
      max_price,
      parent_id,
      min_rating,
      specs,
    });

    await setJsonCache(cacheKey, result, CACHE_TTL_SECONDS.productList);
    sendCachedJson(req, res, { success: true, ...result }, 30);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/featured
 * Return featured products.
 */
export async function featured(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const limit = Math.min(Math.max(1, requestedLimit), 100);
    const cacheKey = CACHE_KEYS.featuredProducts(limit);
    
    const cached = await getJsonCache<Product[]>(cacheKey);
    if (cached) {
      sendCachedJson(req, res, { success: true, products: cached }, 300);
      return;
    }

    const products = await getFeaturedProducts(limit);
    await setJsonCache(cacheKey, products, CACHE_TTL_SECONDS.featuredProducts);

    sendCachedJson(req, res, { success: true, products }, 300);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:slug
 * Return a single product by its slug.
 */
export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = CACHE_KEYS.productSlug(req.params.slug);
    const cached = await getJsonCache<Product>(cacheKey);
    if (cached) {
      sendCachedJson(req, res, { success: true, product: cached }, 300);
      return;
    }

    const product = await getProductBySlug(req.params.slug);

    if (!product) {
      throw new NotFoundError('Product');
    }

    await setJsonCache(cacheKey, product, CACHE_TTL_SECONDS.productDetail);
    sendCachedJson(req, res, { success: true, product }, 300);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/categories
 * Return all categories with product counts.
 */
export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = CACHE_KEYS.categoriesTree;
    const cached = await getJsonCache<Category[]>(cacheKey);
    
    if (cached) {
      sendCachedJson(_req, res, { success: true, categories: cached }, 600);
      return;
    }

    const categories = await getCategories();
    await setJsonCache(cacheKey, categories, CACHE_TTL_SECONDS.categories);

    sendCachedJson(_req, res, { success: true, categories }, 600);
  } catch (err) {
    next(err);
  }
}
