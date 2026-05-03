// backend/src/routes/carousel.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import { validate, carouselSlideRules } from '../middleware/validate';
import { param } from 'express-validator';
import { getActive, getAll, create, update, remove } from '../controllers/carousel.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────

/** GET /api/carousel — returns only active slides */
router.get('/', getActive);

// ─── Admin ───────────────────────────────────────────────────────────────────

/** GET /api/carousel/admin — all slides */
router.get('/admin', requireAuth, isAdmin, getAll);

/** POST /api/carousel/admin — create a new slide */
router.post('/admin', requireAuth, isAdmin, ...carouselSlideRules, validate, create);

/** PATCH /api/carousel/admin/:id — partial update */
router.patch(
  '/admin/:id',
  requireAuth,
  isAdmin,
  param('id').isInt({ min: 1 }).withMessage('Slide ID must be a positive integer'),
  validate,
  update
);

/** DELETE /api/carousel/admin/:id — delete a slide */
router.delete(
  '/admin/:id',
  requireAuth,
  isAdmin,
  param('id').isInt({ min: 1 }).withMessage('Slide ID must be a positive integer'),
  validate,
  remove
);

export default router;
