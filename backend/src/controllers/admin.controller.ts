// backend/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import * as productsService from '../services/products.service';
import { NotFoundError } from '../utils/errors';

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analytics = await adminService.getMonthlyAnalytics();
    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productsService.createProduct(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productsService.updateProduct(req.params.id, req.body);
    if (!product) throw new NotFoundError('Product');
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const success = await productsService.deleteProduct(req.params.id);
    if (!success) throw new NotFoundError('Product');
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await productsService.createCategory(req.body);
    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const category = await productsService.updateCategory(id, req.body);
    if (!category) throw new NotFoundError('Category');
    res.json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await productsService.deleteCategory(id);
    if (!success) throw new NotFoundError('Category');
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await adminService.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const result = await adminService.getAllOrders(page, limit);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await adminService.updateOrderStatus(req.params.id, req.body.status);
    if (!order) throw new NotFoundError('Order');
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}
