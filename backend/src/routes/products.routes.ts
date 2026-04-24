// backend/src/routes/products.routes.ts
import { Router } from 'express';
import { list, featured, getBySlug, listCategories } from '../controllers/products.controller';
import { productQueryRules, productSlugRules, validate } from '../middleware/validate';

const router = Router();

// Categories (mounted at both /api/products and /api/categories)
router.get('/categories', listCategories);

// Products
router.get('/featured', featured);
router.get('/', ...productQueryRules, validate, list);
router.get('/:slug', ...productSlugRules, validate, getBySlug);

export default router;
