// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import {
  googleLogin,
  googleCallback,
  register,
  login,
  verifyEmail,
  forgotPassword,
  handleResetPassword,
  getMe,
  getCsrfToken,
  listSessions,
  revokeSession,
  revokeAllSessions,
  setupMfa,
  verifyMfa,
  logout,
} from '../controllers/auth.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter);

// Google OAuth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Email/password auth
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', handleResetPassword);

// Session
router.get('/csrf', getCsrfToken);
router.get('/me', optionalAuth, getMe);
router.get('/sessions', requireAuth, listSessions);
router.delete('/sessions/:id', requireAuth, revokeSession);
router.delete('/sessions', requireAuth, revokeAllSessions);
router.post('/mfa/setup', requireAuth, setupMfa);
router.post('/mfa/verify', requireAuth, verifyMfa);
router.post('/logout', requireAuth, logout);

export default router;
