import { Router } from 'express';
import { getPublicHomepage, getPublicHomepageFull } from '../controllers/homepage.controller';

const router = Router();

router.get('/full', getPublicHomepageFull);
router.get('/', getPublicHomepage);

export default router;
