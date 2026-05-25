import { Router } from 'express';
import { param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { addressRules, profileRules, validate } from '../middleware/validate';
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

router.patch('/me', ...profileRules, validate, patchMe);
router.get('/me/export', exportMe);
router.delete('/me', deleteMe);

router.get('/me/addresses', getAddresses);
router.post('/me/addresses', ...addressRules, validate, postAddress);
router.put('/me/addresses/:id', param('id').isUUID(), ...addressRules, validate, putAddress);
router.delete('/me/addresses/:id', param('id').isUUID(), validate, removeAddress);

export default router;
