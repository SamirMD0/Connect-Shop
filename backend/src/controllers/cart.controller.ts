// backend/src/controllers/cart.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  queueAbandonedCartRecovery,
} from '../services/cart.service';
import { NotFoundError, AppError } from '../utils/errors';
import { query } from '../config/db';

/**
 * GET /api/cart
 * Get the authenticated user's cart.
 */
export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cart = await getCart(req.user!.id);
    res.json({ success: true, cart });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cart
 * Add an item to the cart.
 * Body: { productId: string, quantity: number }
 */
export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, quantity, variantId } = req.body;

    let stockToCheck = 0;

    if (variantId) {
      const variants = await query<{ stock: number }>(
        'SELECT stock FROM product_variants WHERE id = $1 AND product_id = $2',
        [variantId, productId]
      );
      if (variants.length === 0) {
        throw new NotFoundError('Product Variant');
      }
      stockToCheck = variants[0].stock;
    } else {
      // Verify product exists and has sufficient stock
      const products = await query<{ stock: number }>(
        'SELECT stock FROM products WHERE id = $1',
        [productId]
      );

      if (products.length === 0) {
        throw new NotFoundError('Product');
      }
      stockToCheck = products[0].stock;
    }

    if (stockToCheck < quantity) {
      throw new AppError(`Insufficient stock. Only ${stockToCheck} available.`, 400);
    }

    const item = await addToCart(req.user!.id, productId, quantity, variantId);
    const cart = await getCart(req.user!.id);
    queueAbandonedCartRecovery(req.user!.id).catch(console.error);

    res.status(201).json({ success: true, item, cart });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/cart/:itemId
 * Update the quantity of a cart item.
 * Body: { quantity: number }
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { quantity } = req.body;

    const item = await updateCartItemQuantity(req.user!.id, itemId, quantity);

    if (!item) {
      throw new NotFoundError('Cart item');
    }

    const cart = await getCart(req.user!.id);
    queueAbandonedCartRecovery(req.user!.id).catch(console.error);
    res.json({ success: true, item, cart });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cart/:itemId
 * Remove an item from the cart.
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const deleted = await removeCartItem(req.user!.id, itemId);

    if (!deleted) {
      throw new NotFoundError('Cart item');
    }

    const cart = await getCart(req.user!.id);
    res.json({ success: true, cart });
  } catch (err) {
    next(err);
  }
}
