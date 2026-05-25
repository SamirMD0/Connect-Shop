// backend/src/controllers/orders.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  placeOrder,
  placeGuestOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  createReturnRequest,
  reorder,
  generateInvoicePdf,
} from '../services/orders.service';
import { EmailService } from '../services/email.service';
import { NotFoundError, AppError } from '../utils/errors';

/**
 * POST /api/orders
 * Place an order from the user's current cart.
 * Body: { shippingAddress: { fullName, addressLine1, ... } }
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shippingAddress, paymentMethod, couponCode, deliverySlot, guestEmail, items } = req.body;
    const user = req.user;

    const order = user
      ? await placeOrder(user.id, shippingAddress, paymentMethod, { couponCode, deliverySlot })
      : await placeGuestOrder(guestEmail, items || [], shippingAddress, paymentMethod, { couponCode, deliverySlot });

    // Send confirmation email asynchronously
    const confirmationEmail = user?.email || guestEmail;
    if (confirmationEmail) {
      EmailService.sendOrderConfirmation(confirmationEmail, order.id, Number(order.total)).catch(console.error);
    }

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

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await cancelOrder(req.user!.id, req.params.id);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function requestReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5) {
      throw new AppError('Return reason must be at least 5 characters.', 400);
    }
    const returnRequest = await createReturnRequest(req.user!.id, req.params.id, reason);
    res.status(201).json({ success: true, returnRequest });
  } catch (err) {
    next(err);
  }
}

export async function reorderItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await reorder(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Order items added to cart.' });
  } catch (err) {
    next(err);
  }
}

export async function invoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pdf = await generateInvoicePdf(req.user!.id, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
