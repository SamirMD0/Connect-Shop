// backend/src/middleware/validate.ts
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

// ─── Validation Runner ───────────────────────────────────────────────────────

/**
 * Runs validation chains and throws a ValidationError if any fail.
 * Use as the LAST middleware after your validation chains.
 *
 * Usage: router.post('/cart', ...addToCartRules, validate, controller)
 */
export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: 'path' in err ? err.path : 'unknown',
      message: err.msg as string,
    }));
    throw new ValidationError(formatted);
  }

  next();
}

// ─── Reusable Validation Chains ──────────────────────────────────────────────

/** Validate adding an item to cart */
export const addToCartRules: ValidationChain[] = [
  body('productId')
    .trim()
    .isUUID()
    .withMessage('productId must be a valid UUID'),
  body('quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('quantity must be an integer between 1 and 99'),
];

/** Validate updating cart item quantity */
export const updateCartRules: ValidationChain[] = [
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('itemId must be a positive integer'),
  body('quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('quantity must be an integer between 1 and 99'),
];

/** Validate cart item ID param */
export const cartItemIdRules: ValidationChain[] = [
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('itemId must be a positive integer'),
];

/** Validate placing an order */
export const placeOrderRules: ValidationChain[] = [
  body('shippingAddress.fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 200 })
    .withMessage('Full name must be under 200 characters')
    .escape(),
  body('shippingAddress.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be 7-20 characters')
    .escape(),
  body('shippingAddress.addressLine1')
    .trim()
    .notEmpty()
    .withMessage('Address line 1 is required')
    .isLength({ max: 300 })
    .withMessage('Address line 1 must be under 300 characters')
    .escape(),
  body('shippingAddress.addressLine2')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Address line 2 must be under 300 characters')
    .escape(),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .escape(),
  body('shippingAddress.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .escape(),
  body('shippingAddress.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .escape(),
  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .escape(),
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'bank_transfer'])
    .withMessage('Payment method must be cod or bank_transfer'),
];

/** Validate product listing query params */
export const productQueryRules: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be between 1 and 1000'),
  query('category')
    .optional()
    .trim()
    .isSlug()
    .withMessage('category must be a valid slug'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search must be under 100 characters')
    .escape(),
  query('sort')
    .optional()
    .isIn(['price_asc', 'price_desc', 'newest', 'rating', ''])
    .withMessage('sort must be one of: price_asc, price_desc, newest, rating'),
];

/** Validate product slug param */
export const productSlugRules: ValidationChain[] = [
  param('slug')
    .trim()
    .isSlug()
    .withMessage('Invalid product slug'),
];

/** Validate order ID param */
export const orderIdRules: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Order ID must be a valid UUID'),
];

/** Validate Admin Category */
export const adminCategoryRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('slug').trim().isSlug().withMessage('Valid slug is required').isLength({ max: 100 }),
  body('image_url').optional({ nullable: true }).trim().isLength({ max: 2048 }),
];

/** Validate Admin Product */
export const adminProductRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('slug').trim().isSlug().withMessage('Valid slug is required').isLength({ max: 255 }),
  body('description').optional({ nullable: true }).trim(),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('image_url').optional({ nullable: true }).trim().isURL().withMessage('Must be a valid URL'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be 0 or greater'),
  body('is_featured').optional().isBoolean(),
];

/** Validate Admin Order Status Update */
export const adminOrderStatusRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Valid Order ID required'),
  body('status')
    .isIn(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
];

/** Validate Carousel Slide create/update */
export const carouselSlideRules: ValidationChain[] = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
  body('subtitle').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('image_url').trim().notEmpty().withMessage('Image URL is required'),
  body('link_url').optional({ nullable: true }).trim(),
  body('button_text').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('display_order').isInt({ min: 0 }).withMessage('display_order must be a non-negative integer'),
  body('is_active').isBoolean().withMessage('is_active must be a boolean'),
];

/** Validate Review create */
export const reviewRules: ValidationChain[] = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('body').optional({ nullable: true }).trim(),
];
