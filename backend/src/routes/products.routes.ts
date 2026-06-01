// backend/src/routes/products.routes.ts
import { Router } from 'express';
import { list, featured, getBySlug, listCategories } from '../controllers/products.controller';
import { listQuestions, createQuestion } from '../controllers/productQuestions.controller';
import { requireAuth } from '../middleware/auth';
import { reviewMutationLimiter } from '../middleware/rateLimiter';
import { productQueryRules, productSlugRules, productQuestionRules, validate } from '../middleware/validate';

const router = Router();

// Categories (mounted at both /api/products and /api/categories)
router.get('/categories', listCategories);

// Products
router.get('/featured', featured);
router.get('/', ...productQueryRules, validate, list);
router.get('/:slug/questions', ...productSlugRules, validate, listQuestions);
router.post('/:slug/questions', requireAuth, reviewMutationLimiter, ...productSlugRules, ...productQuestionRules, validate, createQuestion);
router.get('/:slug', ...productSlugRules, validate, getBySlug);

export default router;
