// backend/src/routes/orders.routes.ts
import { Router } from 'express';
import { create, list, getById } from '../controllers/orders.controller';
import { requireAuth } from '../middleware/auth';
import { placeOrderRules, orderIdRules, validate } from '../middleware/validate';

const router = Router();

// All order routes require authentication
router.use(requireAuth);

router.post('/', ...placeOrderRules, validate, create);
router.get('/', list);
router.get('/:id', ...orderIdRules, validate, getById);

export default router;
