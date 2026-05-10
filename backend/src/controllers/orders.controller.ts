// backend/src/controllers/orders.controller.ts
import { Request, Response, NextFunction } from 'express';
import { placeOrder, getUserOrders, getOrderById } from '../services/orders.service';
import { NotFoundError, AppError } from '../utils/errors';

/**
 * POST /api/orders
 * Place an order from the user's current cart.
 * Body: { shippingAddress: { fullName, addressLine1, ... } }
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    const order = await placeOrder(req.user!.id, shippingAddress, paymentMethod);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order,
    });
  } catch (err) {
    // Convert known business logic errors
    if (err instanceof Error && (err.message.includes('Cart is empty') || err.message.includes('Insufficient stock'))) {
      return next(new AppError(err.message, 400));
    }
    next(err);
  }
}

/**
 * GET /api/orders
 * Get the authenticated user's order history.
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await getUserOrders(req.user!.id);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:id
 * Get a single order with its items.
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await getOrderById(req.user!.id, req.params.id);

    if (!order) {
      throw new NotFoundError('Order');
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}
