// backend/src/middleware/validate.ts
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import {
  HOMEPAGE_BLOCK_TYPES,
  HOMEPAGE_BRAND_PRODUCT_LAYOUTS,
  HOMEPAGE_BRAND_PRODUCT_LIMITS,
  HOMEPAGE_BRAND_PRODUCT_SORT_KEYS,
  HOMEPAGE_CATEGORY_PRODUCT_LAYOUTS,
  HOMEPAGE_CATEGORY_PRODUCT_LIMITS,
  HOMEPAGE_CATEGORY_PRODUCT_SORT_KEYS,
  HOMEPAGE_SECTION_KEYS,
  HOMEPAGE_SECTION_TYPES,
} from '../services/homepage.service';

function isImageReference(value: string): boolean {
  if (value.startsWith('/')) return !value.startsWith('//') && !/[\u0000-\u001F\u007F]/.test(value);

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isSafeLink(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/')) return !value.startsWith('//') && !/[\u0000-\u001F\u007F]/.test(value);

  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isSafeHomepageSectionKey(value: string): boolean {
  return HOMEPAGE_SECTION_KEYS.includes(value as any) || /^[a-z][a-z0-9_]*$/.test(value);
}

function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
  body('variantId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('variantId must be a valid UUID'),
];

export const registerRules: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must be under 255 characters')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone must be under 30 characters')
    .escape(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
];

export const loginRules: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
];

export const emailRules: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
];

export const tokenRules: ValidationChain[] = [
  body('token')
    .trim()
    .isLength({ min: 16, max: 512 })
    .withMessage('Token is invalid'),
];

export const resetPasswordRules: ValidationChain[] = [
  ...tokenRules,
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
];

export const sessionIdRules: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Session ID must be a valid UUID'),
];

export const mfaVerifyRules: ValidationChain[] = [
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('MFA code must be 6 digits'),
];

export const profileRules: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
    .escape(),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone must be under 30 characters')
    .escape(),
];

export const addressRules: ValidationChain[] = [
  body('label').optional().trim().isLength({ max: 80 }).withMessage('Label must be under 80 characters').escape(),
  body('recipientName').trim().isLength({ min: 1, max: 200 }).withMessage('Recipient name is required').escape(),
  body('phone').trim().isLength({ min: 7, max: 30 }).withMessage('Phone must be 7-30 characters').escape(),
  body('addressLine1').trim().isLength({ min: 1, max: 300 }).withMessage('Address line 1 is required').escape(),
  body('addressLine2').optional({ nullable: true }).trim().isLength({ max: 300 }).escape(),
  body('city').trim().isLength({ min: 1, max: 120 }).withMessage('City is required').escape(),
  body('state').optional({ nullable: true }).trim().isLength({ max: 120 }).escape(),
  body('zipCode').optional({ nullable: true }).trim().isLength({ max: 30 }).escape(),
  body('country').optional({ nullable: true }).trim().isLength({ max: 120 }).escape(),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }).escape(),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
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
    .isLength({ min: 7, max: 30 })
    .withMessage('Phone number must be 7-30 characters')
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
  body('shippingAddress.notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be under 1000 characters')
    .escape(),
  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .escape(),
  body('paymentMethod')
    .optional()
    .isIn(['cash_on_delivery', 'cod'])
    .withMessage('Cash on delivery is the only supported payment method'),
  body('couponCode')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .matches(/^[a-zA-Z0-9_-]*$/)
    .withMessage('Coupon code is invalid'),
  body('deliverySlot')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Delivery slot must be under 100 characters'),
  body('guestEmail')
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage('Guest email must be valid')
    .normalizeEmail(),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Guest checkout requires cart items'),
  body('items.*.productId')
    .optional()
    .isUUID()
    .withMessage('Product ID must be valid'),
  body('items.*.variantId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Variant ID must be valid'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
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
    .isIn(['price_asc', 'price_desc', 'newest', 'rating', 'popular', ''])
    .withMessage('sort must be one of: price_asc, price_desc, newest, rating, popular'),
  query('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('brand must be under 100 characters'),
  query('min_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('min_price must be a positive number'),
  query('max_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('max_price must be a positive number'),
  query('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('parent_id must be a positive integer'),
  query('min_rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('min_rating must be between 0 and 5'),
  query('specs')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .matches(/^[a-zA-Z0-9_\- ]+:[^,]+(,[a-zA-Z0-9_\- ]+:[^,]+)*$/)
    .withMessage('specs must be key:value pairs separated by commas'),
];

/** Validate product slug param */
export const productSlugRules: ValidationChain[] = [
  param('slug')
    .trim()
    .isSlug()
    .withMessage('Invalid product slug'),
];

export const productQuestionRules: ValidationChain[] = [
  body('question')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Question must be between 5 and 1000 characters')
    .escape(),
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
  body('image_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isImageReference(value))
    .withMessage('Image URL must be a safe URL or site image path'),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Parent category must be valid'),
  body('depth').optional().isInt({ min: 0 }).withMessage('Depth must be 0 or greater'),
];

/** Validate Admin Brand */
export const adminBrandRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('slug').trim().isSlug().withMessage('Valid slug is required').isLength({ max: 100 }),
  body('logo_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isImageReference(value))
    .withMessage('Logo URL must be a safe URL or site image path'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('is_active').optional().isBoolean(),
];

/** Validate Admin Product */
export const adminProductRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('slug').trim().isSlug().withMessage('Valid slug is required').isLength({ max: 255 }),
  body('description').optional({ nullable: true }).trim(),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  body('image_url').optional({ nullable: true }).trim().custom((value) => !value || isImageReference(value)).withMessage('Must be a valid URL or site image path'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be 0 or greater'),
  body('is_featured').optional().isBoolean(),
  body('brand_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Brand must be valid'),
  body('brand').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('sku').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('compare_at_price').optional({ nullable: true }).isFloat({ gt: 0 }),
  body('weight_grams').optional({ nullable: true }).isInt({ min: 0 }),
  body('meta_title').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('meta_description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('gallery_images').optional().isArray(),
  body('gallery_images.*.image_url').optional().trim().custom(isImageReference).withMessage('Gallery image must be a valid URL or site image path'),
  body('gallery_images.*.alt_text').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('gallery_images.*.sort_order').optional().isInt({ min: 0 }),
  body('gallery_images.*.is_primary').optional().isBoolean(),
  body('variants').optional().isArray(),
  body('variants.*.sku').optional().trim().isLength({ max: 100 }),
  body('variants.*.name').optional().trim().isLength({ max: 255 }),
  body('variants.*.price').optional().isFloat({ gt: 0 }),
  body('variants.*.stock').optional().isInt({ min: 0 }),
  body('variants.*.attributes').optional().isObject(),
  body('variants.*.image_url').optional({ nullable: true }).trim().custom((value) => !value || isImageReference(value)).withMessage('Variant image must be a valid URL or site image path'),
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
  body('link_url').optional({ nullable: true }).trim().isLength({ max: 2048 }).custom((value) => !value || isSafeLink(value)).withMessage('Link URL must be a safe URL or site path'),
  body('button_text').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('display_order').isInt({ min: 0 }).withMessage('display_order must be a non-negative integer'),
  body('is_active').isBoolean().withMessage('is_active must be a boolean'),
];

const homepageSectionFields: ValidationChain[] = [
  body('section_key')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('section_key must be under 100 characters')
    .custom(isSafeHomepageSectionKey)
    .withMessage('section_key must be a known key or safe slug-like value'),
  body('section_type')
    .optional()
    .trim()
    .isIn(HOMEPAGE_SECTION_TYPES)
    .withMessage('section_type is invalid'),
  body('title').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('title must be under 255 characters'),
  body('subtitle').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('subtitle must be under 1000 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 5000 }).withMessage('description must be under 5000 characters'),
  body('eyebrow').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('eyebrow must be under 255 characters'),
  body('button_text').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('button_text must be under 100 characters'),
  body('button_link')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isSafeLink(value))
    .withMessage('button_link must be a safe URL or site path'),
  body('image_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isImageReference(value))
    .withMessage('image_url must be a safe image URL or site image path'),
  body('background_image_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isImageReference(value))
    .withMessage('background_image_url must be a safe image URL or site image path'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order must be a non-negative integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('metadata').optional({ nullable: true }).custom(isPlainObject).withMessage('metadata must be an object'),
];

const homepageItemFields: ValidationChain[] = [
  body('title').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('title must be under 255 characters'),
  body('subtitle').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('subtitle must be under 1000 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 5000 }).withMessage('description must be under 5000 characters'),
  body('button_text').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('button_text must be under 100 characters'),
  body('button_link')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isSafeLink(value))
    .withMessage('button_link must be a safe URL or site path'),
  body('image_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2048 })
    .custom((value) => !value || isImageReference(value))
    .withMessage('image_url must be a safe image URL or site image path'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order must be a non-negative integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('metadata').optional({ nullable: true }).custom(isPlainObject).withMessage('metadata must be an object'),
];

export const homepageSectionIdRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Homepage section ID must be a valid UUID'),
];

export const homepageItemIdRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Homepage section item ID must be a valid UUID'),
];

export const homepageBlockIdRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Homepage block ID must be a valid UUID'),
];

export const homepageSectionCreateRules: ValidationChain[] = [
  body('section_key').exists().withMessage('section_key is required'),
  body('section_type').exists().withMessage('section_type is required'),
  ...homepageSectionFields,
];

export const homepageSectionUpdateRules: ValidationChain[] = [
  ...homepageSectionIdRules,
  ...homepageSectionFields,
];

export const homepageItemCreateRules: ValidationChain[] = [
  ...homepageSectionIdRules,
  ...homepageItemFields,
];

export const homepageItemUpdateRules: ValidationChain[] = [
  ...homepageItemIdRules,
  ...homepageItemFields,
];

const forbiddenHomepageBlockFields: ValidationChain[] = [
  body('display_order').not().exists().withMessage('display_order is controlled by move up/down actions'),
  body('sort_order').not().exists().withMessage('sort_order is not supported for homepage blocks'),
  body('metadata').not().exists().withMessage('metadata is not supported for homepage blocks'),
  body('image_url').not().exists().withMessage('image_url is not supported for homepage blocks'),
  body('background_image_url').not().exists().withMessage('background_image_url is not supported for homepage blocks'),
  body('button_link').not().exists().withMessage('button_link is not supported for homepage blocks'),
  body('link_url').not().exists().withMessage('link_url is not supported for homepage blocks'),
  body('url').not().exists().withMessage('url is not supported for homepage blocks'),
  body('raw_url').not().exists().withMessage('raw_url is not supported for homepage blocks'),
];

const homepageBlockFields: ValidationChain[] = [
  body('block_type')
    .optional()
    .trim()
    .isIn(HOMEPAGE_BLOCK_TYPES)
    .withMessage('block_type is invalid'),
  body('brand_product_section_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('brand_product_section_id must be a valid UUID'),
  body('category_product_section_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('category_product_section_id must be a valid UUID'),
  body('promotion_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('promotion_id must be a positive integer')
    .toInt(),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
    .toBoolean(),
  ...forbiddenHomepageBlockFields,
];

export const homepageBlockCreateRules: ValidationChain[] = [
  body('block_type').exists().withMessage('block_type is required'),
  ...homepageBlockFields,
];

export const homepageBlockUpdateRules: ValidationChain[] = [
  ...homepageBlockIdRules,
  ...homepageBlockFields,
];

export const homepageBrandProductSectionIdRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Homepage brand product section ID must be a valid UUID'),
];

const forbiddenHomepageBrandProductFields: ValidationChain[] = [
  body('display_order').not().exists().withMessage('display_order is controlled by move up/down actions'),
  body('sort_order').not().exists().withMessage('sort_order is not supported for brand product sections'),
  body('metadata').not().exists().withMessage('metadata is not supported for brand product sections'),
  body('image_url').not().exists().withMessage('image_url is not supported for brand product sections'),
  body('background_image_url').not().exists().withMessage('background_image_url is not supported for brand product sections'),
  body('button_link').not().exists().withMessage('button_link is not supported for brand product sections'),
  body('link_url').not().exists().withMessage('link_url is not supported for brand product sections'),
];

const homepageBrandProductSectionFields: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 255 })
    .withMessage('title must be under 255 characters'),
  body('subtitle')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('subtitle must be under 1000 characters'),
  body('brand_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('brand_id must be a positive integer')
    .toInt(),
  body('product_limit')
    .optional()
    .isInt()
    .withMessage('product_limit must be one of: 4, 8, 12')
    .bail()
    .custom((value) => HOMEPAGE_BRAND_PRODUCT_LIMITS.includes(Number(value) as any))
    .withMessage('product_limit must be one of: 4, 8, 12')
    .toInt(),
  body('sort_key')
    .optional()
    .trim()
    .isIn(HOMEPAGE_BRAND_PRODUCT_SORT_KEYS)
    .withMessage('sort_key must be one of: newest, rating, price_asc, price_desc'),
  body('layout')
    .optional()
    .trim()
    .isIn(HOMEPAGE_BRAND_PRODUCT_LAYOUTS)
    .withMessage('layout must be one of: grid, rail'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
    .toBoolean(),
  ...forbiddenHomepageBrandProductFields,
];

export const homepageBrandProductSectionCreateRules: ValidationChain[] = [
  body('title').exists().withMessage('title is required'),
  body('brand_id').exists().withMessage('brand_id is required'),
  ...homepageBrandProductSectionFields,
];

export const homepageBrandProductSectionUpdateRules: ValidationChain[] = [
  ...homepageBrandProductSectionIdRules,
  ...homepageBrandProductSectionFields,
];

export const homepageCategoryProductSectionIdRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Homepage category product section ID must be a valid UUID'),
];

const forbiddenHomepageCategoryProductFields: ValidationChain[] = [
  body('display_order').not().exists().withMessage('display_order is controlled by move up/down actions'),
  body('sort_order').not().exists().withMessage('sort_order is not supported for category product sections'),
  body('metadata').not().exists().withMessage('metadata is not supported for category product sections'),
  body('image_url').not().exists().withMessage('image_url is not supported for category product sections'),
  body('background_image_url').not().exists().withMessage('background_image_url is not supported for category product sections'),
  body('button_link').not().exists().withMessage('button_link is not supported for category product sections'),
  body('link_url').not().exists().withMessage('link_url is not supported for category product sections'),
];

const homepageCategoryProductSectionFields: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 255 })
    .withMessage('title must be under 255 characters'),
  body('subtitle')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('subtitle must be under 1000 characters'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('category_id must be a positive integer')
    .toInt(),
  body('product_limit')
    .optional()
    .isInt()
    .withMessage('product_limit must be one of: 4, 8, 12')
    .bail()
    .custom((value) => HOMEPAGE_CATEGORY_PRODUCT_LIMITS.includes(Number(value) as any))
    .withMessage('product_limit must be one of: 4, 8, 12')
    .toInt(),
  body('sort_key')
    .optional()
    .trim()
    .isIn(HOMEPAGE_CATEGORY_PRODUCT_SORT_KEYS)
    .withMessage('sort_key must be one of: newest, rating, price_asc, price_desc'),
  body('layout')
    .optional()
    .trim()
    .isIn(HOMEPAGE_CATEGORY_PRODUCT_LAYOUTS)
    .withMessage('layout must be one of: grid, rail'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
    .toBoolean(),
  ...forbiddenHomepageCategoryProductFields,
];

export const homepageCategoryProductSectionCreateRules: ValidationChain[] = [
  body('title').exists().withMessage('title is required'),
  body('category_id').exists().withMessage('category_id is required'),
  ...homepageCategoryProductSectionFields,
];

export const homepageCategoryProductSectionUpdateRules: ValidationChain[] = [
  ...homepageCategoryProductSectionIdRules,
  ...homepageCategoryProductSectionFields,
];

/** Validate Review create */
export const reviewRules: ValidationChain[] = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional({ nullable: true }).trim().isLength({ max: 255 }).escape(),
  body('body').optional({ nullable: true }).trim().isLength({ max: 5000 }).escape(),
];

export const reviewModerationRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Review ID must be a valid UUID'),
  body('status')
    .isIn(['pending', 'published', 'hidden', 'rejected'])
    .withMessage('Invalid review status'),
];

export const reviewIdRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Review ID must be a valid UUID'),
];

export const returnRequestRules: ValidationChain[] = [
  ...orderIdRules,
  body('reason')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Return reason must be between 5 and 1000 characters')
    .escape(),
];

export const trackingRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Valid Order ID required'),
  body('tracking_carrier').optional({ nullable: true }).trim().isLength({ max: 100 }).escape(),
  body('tracking_number').optional({ nullable: true }).trim().isLength({ max: 100 }).escape(),
  body('tracking_url').optional({ nullable: true }).trim().isLength({ max: 2048 }).custom((value) => !value || isSafeLink(value)).withMessage('Tracking URL must be safe'),
  body('estimated_delivery_date').optional({ nullable: true }).isISO8601().withMessage('Estimated delivery date must be valid'),
];

export const returnStatusRules: ValidationChain[] = [
  param('id').isUUID().withMessage('Return request ID must be valid'),
  body('status')
    .isIn(['requested', 'approved', 'rejected', 'refunded'])
    .withMessage('Invalid return status'),
];
