// backend/src/routes/review.routes.ts
import { Router } from 'express';
import { getProductReviews, createReview, deleteReview } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';
import { reviewMutationLimiter } from '../middleware/rateLimiter';
import { reviewRules, validate } from '../middleware/validate';
import { param } from 'express-validator';

const router = Router();

// Validation for product ID and review ID
const productIdRules = [param('productId').isUUID().withMessage('Invalid product ID')];
const reviewIdRules = [param('id').isUUID().withMessage('Invalid review ID')];

// Get reviews for a product (public)
router.get('/:productId', ...productIdRules, validate, getProductReviews);

// Create a review for a product (authenticated)
router.post(
  '/:productId',
  requireAuth,
  reviewMutationLimiter,
  ...productIdRules,
  ...reviewRules,
  validate,
  createReview
);

// Delete a review (authenticated: user's own review, or admin)
router.delete('/:id', requireAuth, ...reviewIdRules, validate, deleteReview);

export default router;
