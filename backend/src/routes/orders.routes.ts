// backend/src/routes/orders.routes.ts
import { Router } from 'express';
import { create, list, getById, cancel, requestReturn, reorderItems, invoice } from '../controllers/orders.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { placeOrderRules, orderIdRules, returnRequestRules, validate } from '../middleware/validate';

const router = Router();

router.post('/', optionalAuth, ...placeOrderRules, validate, create);

// Order history/detail requires authentication
router.use(requireAuth);
router.get('/', list);
router.get('/:id', ...orderIdRules, validate, getById);
router.post('/:id/cancel', ...orderIdRules, validate, cancel);
router.post('/:id/return', ...returnRequestRules, validate, requestReturn);
router.post('/:id/reorder', ...orderIdRules, validate, reorderItems);
router.get('/:id/invoice', ...orderIdRules, validate, invoice);

export default router;
