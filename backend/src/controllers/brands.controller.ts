import { Request, Response, NextFunction } from 'express';
import * as productsService from '../services/products.service';
import { getJsonCache, setJsonCache } from '../config/redis';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../utils/cachePolicy';
import type { Brand } from '../services/products.service';

export async function listPublicBrands(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cached = await getJsonCache<Brand[]>(CACHE_KEYS.brandsPublic);
    if (cached) {
      res.json({ success: true, brands: cached });
      return;
    }

    const brands = (await productsService.getBrands()).filter((brand) => brand.is_active);
    await setJsonCache(CACHE_KEYS.brandsPublic, brands, CACHE_TTL_SECONDS.brands);
    res.json({ success: true, brands });
  } catch (err) {
    next(err);
  }
}
