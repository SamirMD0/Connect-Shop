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
import {
  emailRules,
  loginRules,
  mfaVerifyRules,
  registerRules,
  resetPasswordRules,
  sessionIdRules,
  tokenRules,
  validate,
} from '../middleware/validate';

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter);

// Google OAuth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Email/password auth
router.post('/register', ...registerRules, validate, register);
router.post('/login', ...loginRules, validate, login);
router.post('/verify-email', ...tokenRules, validate, verifyEmail);
router.post('/forgot-password', ...emailRules, validate, forgotPassword);
router.post('/reset-password', ...resetPasswordRules, validate, handleResetPassword);

// Session
router.get('/csrf', getCsrfToken);
router.get('/me', optionalAuth, getMe);
router.get('/sessions', requireAuth, listSessions);
router.delete('/sessions/:id', requireAuth, ...sessionIdRules, validate, revokeSession);
router.delete('/sessions', requireAuth, revokeAllSessions);
router.post('/mfa/setup', requireAuth, setupMfa);
router.post('/mfa/verify', requireAuth, ...mfaVerifyRules, validate, verifyMfa);
router.post('/logout', requireAuth, logout);

export default router;
