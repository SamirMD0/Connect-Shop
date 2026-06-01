// backend/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import * as productsService from '../services/products.service';
import { ReviewService, Review } from '../services/review.service';
import { uploadImageToImageKit } from '../services/imageUpload.service';
import { AppError, NotFoundError } from '../utils/errors';
import { logUploadRejected } from '../services/securityEvent.service';

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

function csvEscape(value: unknown): string {
  const stringValue = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function formatCsv(rows: Record<string, any>[]): string {
  const headers = [
    'id', 'name', 'slug', 'description', 'price', 'image_url', 'category_id',
    'category_name', 'stock', 'is_featured', 'brand_id', 'brand', 'sku', 'compare_at_price',
    'weight_grams', 'meta_title', 'meta_description', 'created_at', 'updated_at',
  ];
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function classifyUploadRejection(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('too large')) return 'oversized';
  if (message.includes('data URLs') || message.includes('files are supported')) return 'invalid_mime';
  if (message.includes('contents do not match')) return 'invalid_magic_bytes';
  if (message.includes('extension does not match')) return 'extension_mismatch';
  if (message.includes('ImageKit is not configured')) return 'provider_unavailable';
  if (message.includes('Image upload failed')) return 'provider_failed';
  return 'upload_rejected';
}

function getDeclaredUploadMime(dataUrl: unknown): string | undefined {
  if (typeof dataUrl !== 'string') return undefined;
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match?.[1];
}

function estimateDecodedBytes(dataUrl: unknown): number | undefined {
  if (typeof dataUrl !== 'string') return undefined;
  const base64 = dataUrl.split(',')[1];
  if (!base64) return undefined;
  return Math.floor((base64.length * 3) / 4);
}

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

export async function exportProductsCsv(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await adminService.getProductsForCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(formatCsv(rows));
  } catch (err) {
    next(err);
  }
}

export async function importProductsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csv = typeof req.body.csv === 'string' ? req.body.csv : '';
    if (!csv.trim()) throw new AppError('CSV content is required', 400);

    const rows = parseCsv(csv);
    const headers = rows.shift()?.map(header => header.trim()) || [];
    const requiredHeaders = ['name', 'slug', 'price', 'category_id', 'stock'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new AppError(`Missing required CSV columns: ${missingHeaders.join(', ')}`, 400);
    }

    const created: any[] = [];
    const errors: { row: number; message: string }[] = [];

    for (const [index, row] of rows.entries()) {
      const record = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() || '']));
      try {
        const product = await productsService.createProduct({
          name: record.name,
          slug: record.slug,
          description: record.description || null,
          price: parseFloat(record.price),
          image_url: record.image_url || null,
          category_id: parseInt(record.category_id, 10),
          stock: parseInt(record.stock || '0', 10),
          is_featured: ['true', '1', 'yes'].includes((record.is_featured || '').toLowerCase()),
          brand_id: record.brand_id ? parseInt(record.brand_id, 10) : null,
          brand: record.brand || null,
          sku: record.sku || null,
          compare_at_price: record.compare_at_price ? parseFloat(record.compare_at_price) : null,
          weight_grams: record.weight_grams ? parseInt(record.weight_grams, 10) : null,
          meta_title: record.meta_title || null,
          meta_description: record.meta_description || null,
        });
        created.push(product);
      } catch (error: any) {
        errors.push({ row: index + 2, message: error.message || 'Import failed' });
      }
    }

    res.status(errors.length ? 207 : 201).json({ success: errors.length === 0, created, errors });
  } catch (err) {
    next(err);
  }
}

export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
    const uploadedImage = await uploadImageToImageKit({ fileName, dataUrl: dataUrl || '' });

    res.status(201).json({
      success: true,
      url: uploadedImage.url,
      ...(uploadedImage.fileId && { fileId: uploadedImage.fileId }),
      ...(uploadedImage.name && { name: uploadedImage.name }),
      ...(uploadedImage.thumbnailUrl && { thumbnailUrl: uploadedImage.thumbnailUrl }),
      provider: uploadedImage.provider,
    });
  } catch (err) {
    const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
    logUploadRejected(req, classifyUploadRejection(err), {
      fileName,
      declaredMime: getDeclaredUploadMime(dataUrl),
      estimatedDecodedBytes: estimateDecodedBytes(dataUrl),
    });
    next(err);
  }
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await productsService.getCategories();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

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

// ─── Brands ─────────────────────────────────────────────────────────────────

export async function listBrands(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brands = await productsService.getBrands();
    res.json({ success: true, brands });
  } catch (err) {
    next(err);
  }
}

export async function createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = await productsService.createBrand(req.body);
    res.status(201).json({ success: true, brand });
  } catch (err) {
    next(err);
  }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const brand = await productsService.updateBrand(id, req.body);
    if (!brand) throw new NotFoundError('Brand');
    res.json({ success: true, brand });
  } catch (err) {
    next(err);
  }
}

export async function deleteBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await productsService.deleteBrand(id);
    if (!success) throw new NotFoundError('Brand');
    res.json({ success: true, message: 'Brand deleted' });
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

export async function getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const detail = await adminService.getUserDetail(req.params.id);
    if (!detail) throw new NotFoundError('User');
    res.json({ success: true, ...detail });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role, req.user!.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : undefined;
    const result = await adminService.getAllOrders(page, limit, { status, search });
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

export async function updateOrderTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await adminService.updateOrderTracking(req.params.id, {
      tracking_carrier: req.body.tracking_carrier,
      tracking_number: req.body.tracking_number,
      tracking_url: req.body.tracking_url,
      estimated_delivery_date: req.body.estimated_delivery_date,
    });
    if (!order) throw new NotFoundError('Order');
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function updateReturnRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const returnRequest = await adminService.updateReturnRequestStatus(req.params.id, req.body.status);
    if (!returnRequest) throw new NotFoundError('Return request');
    res.json({ success: true, returnRequest });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await adminService.getOrderDetail(req.params.id);
    if (!order) throw new NotFoundError('Order');
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const threshold = Math.max(0, parseInt(req.query.threshold as string || '5', 10));
    const alerts = await adminService.getInventoryAlerts(Number.isNaN(threshold) ? 5 : threshold);
    res.json({ success: true, alerts });
  } catch (err) {
    next(err);
  }
}

export async function searchAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      res.json({ success: true, results: { products: [], orders: [], users: [], categories: [] } });
      return;
    }
    const results = await adminService.searchAdmin(q.slice(0, 100));
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function listReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const status = String(req.query.status || 'all') as Review['status'] | 'all';
    const result = await ReviewService.listReviewsForModeration({ page, limit, status });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function moderateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await ReviewService.moderateReview(
      req.params.id,
      req.body.status,
      req.user!.id
    );
    res.json({ success: true, review });
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ReviewService.deleteReview(req.params.id, req.user!.id, true);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Promotions ─────────────────────────────────────────────────────────────

export async function listPromotions(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promotions = await adminService.listPromotions();
    res.json({ success: true, promotions });
  } catch (err) {
    next(err);
  }
}

export async function createPromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promotion = await adminService.createPromotion({
      ...req.body,
      starts_at: normalizeDateInput(req.body.starts_at),
      ends_at: normalizeDateInput(req.body.ends_at),
    });
    res.status(201).json({ success: true, promotion });
  } catch (err) {
    next(err);
  }
}

export async function updatePromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promotion = await adminService.updatePromotion(parseInt(req.params.id, 10), {
      ...req.body,
      starts_at: normalizeDateInput(req.body.starts_at),
      ends_at: normalizeDateInput(req.body.ends_at),
    });
    if (!promotion) throw new NotFoundError('Promotion');
    res.json({ success: true, promotion });
  } catch (err) {
    next(err);
  }
}

export async function deletePromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const success = await adminService.deletePromotion(parseInt(req.params.id, 10));
    if (!success) throw new NotFoundError('Promotion');
    res.json({ success: true, message: 'Promotion deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Coupons ────────────────────────────────────────────────────────────────

export async function listCoupons(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupons = await adminService.listCoupons();
    res.json({ success: true, coupons });
  } catch (err) {
    next(err);
  }
}

export async function createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await adminService.createCoupon({
      ...req.body,
      value: parseFloat(req.body.value),
      usage_limit: req.body.usage_limit ? parseInt(req.body.usage_limit, 10) : null,
      starts_at: normalizeDateInput(req.body.starts_at),
      expires_at: normalizeDateInput(req.body.expires_at),
    });
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    next(err);
  }
}

export async function updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await adminService.updateCoupon(parseInt(req.params.id, 10), {
      ...req.body,
      value: parseFloat(req.body.value),
      usage_limit: req.body.usage_limit ? parseInt(req.body.usage_limit, 10) : null,
      starts_at: normalizeDateInput(req.body.starts_at),
      expires_at: normalizeDateInput(req.body.expires_at),
    });
    if (!coupon) throw new NotFoundError('Coupon');
    res.json({ success: true, coupon });
  } catch (err) {
    next(err);
  }
}

export async function deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const success = await adminService.deleteCoupon(parseInt(req.params.id, 10));
    if (!success) throw new NotFoundError('Coupon');
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}
