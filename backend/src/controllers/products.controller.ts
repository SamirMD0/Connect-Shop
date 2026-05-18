// backend/src/controllers/products.controller.ts
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import {
  listProducts,
  getProductBySlug,
  getFeaturedProducts,
  getCategories,
} from '../services/products.service';
import { NotFoundError } from '../utils/errors';

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

    const result = await listProducts({ page, limit, category, search, sort, ids });

    res.json({ success: true, ...result });
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
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const cacheKey = `products:featured:${limit}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.json({ success: true, products: JSON.parse(cached) });
      return;
    }

    const products = await getFeaturedProducts(limit);
    await redisClient.setex(cacheKey, 1800, JSON.stringify(products)); // 30 min cache

    res.json({ success: true, products });
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
    const product = await getProductBySlug(req.params.slug);

    if (!product) {
      throw new NotFoundError('Product');
    }

    res.json({ success: true, product });
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
    const cacheKey = 'categories:all';
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      res.json({ success: true, categories: JSON.parse(cached) });
      return;
    }

    const categories = await getCategories();
    await redisClient.setex(cacheKey, 3600, JSON.stringify(categories)); // 1 hr cache

    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}
