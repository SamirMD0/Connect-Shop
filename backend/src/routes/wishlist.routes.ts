// backend/src/routes/wishlist.routes.ts
import { Router } from 'express';
import { getUserWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { param, body } from 'express-validator';

const router = Router();

// Validation
const productIdParamRules = [param('productId').isUUID().withMessage('Invalid product ID')];
const productIdBodyRules = [body('productId').isUUID().withMessage('Invalid product ID')];

// All wishlist routes require authentication
router.use(requireAuth);

router.get('/', getUserWishlist);
router.post('/', ...productIdBodyRules, validate, addToWishlist);
router.delete('/:productId', ...productIdParamRules, validate, removeFromWishlist);

export default router;
