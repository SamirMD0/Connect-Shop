// backend/src/routes/cart.routes.ts
import { Router } from 'express';
import { get, add, update, remove } from '../controllers/cart.controller';
import { requireAuth } from '../middleware/auth';
import { cartMutationLimiter } from '../middleware/rateLimiter';
import { addToCartRules, updateCartRules, cartItemIdRules, validate } from '../middleware/validate';

const router = Router();

// All cart routes require authentication
router.use(requireAuth);

router.get('/', get);
router.post('/', cartMutationLimiter, ...addToCartRules, validate, add);
router.patch('/:itemId', cartMutationLimiter, ...updateCartRules, validate, update);
router.delete('/:itemId', cartMutationLimiter, ...cartItemIdRules, validate, remove);

export default router;
