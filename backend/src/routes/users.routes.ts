import { Router } from 'express';
import { param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  deleteMe,
  exportMe,
  getAddresses,
  patchMe,
  postAddress,
  putAddress,
  removeAddress,
} from '../controllers/users.controller';

const router = Router();

router.use(requireAuth);

router.patch('/me', patchMe);
router.get('/me/export', exportMe);
router.delete('/me', deleteMe);

router.get('/me/addresses', getAddresses);
router.post('/me/addresses', postAddress);
router.put('/me/addresses/:id', param('id').isUUID(), validate, putAddress);
router.delete('/me/addresses/:id', param('id').isUUID(), validate, removeAddress);

export default router;
