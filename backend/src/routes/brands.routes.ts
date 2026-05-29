import { Router } from 'express';
import { listPublicBrands } from '../controllers/brands.controller';

const router = Router();

router.get('/', listPublicBrands);

export default router;
