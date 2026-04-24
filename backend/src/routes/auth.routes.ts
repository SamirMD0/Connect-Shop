// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { googleLogin, googleCallback, getMe, logout } from '../controllers/auth.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter);

// Google OAuth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Session
router.get('/me', optionalAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
