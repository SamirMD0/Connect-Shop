// backend/src/controllers/cart.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
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
    const { productId, quantity } = req.body;

    // Verify product exists and has sufficient stock
    const products = await query<{ stock: number }>(
      'SELECT stock FROM products WHERE id = $1',
      [productId]
    );

    if (products.length === 0) {
      throw new NotFoundError('Product');
    }

    if (products[0].stock < quantity) {
      throw new AppError(`Insufficient stock. Only ${products[0].stock} available.`, 400);
    }

    const item = await addToCart(req.user!.id, productId, quantity);
    const cart = await getCart(req.user!.id);

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
