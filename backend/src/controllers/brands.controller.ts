import { Request, Response, NextFunction } from 'express';
import * as productsService from '../services/products.service';

export async function listPublicBrands(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brands = (await productsService.getBrands()).filter((brand) => brand.is_active);
    res.json({ success: true, brands });
  } catch (err) {
    next(err);
  }
}
