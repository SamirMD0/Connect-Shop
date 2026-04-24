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
    .trim()
    .notEmpty()
    .withMessage('ZIP code is required')
    .isLength({ max: 20 })
    .escape(),
  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .escape(),
];

/** Validate product listing query params */
export const productQueryRules: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
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
