import { Router } from 'express';
import { listCategories } from '../controllers/products.controller';

const router = Router();

router.get('/', listCategories);

export default router;
