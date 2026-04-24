// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { validateSession, User } from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';

const COOKIE_NAME = 'elecshop_session';

/**
 * Extend Express Request with our user type.
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Require authentication — rejects with 401 if no valid session.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.signedCookies?.[COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedError('No session cookie provided');
    }

    const user = await validateSession(token);

    if (!user) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication — attaches user if session exists, proceeds either way.
 * Use for endpoints that behave differently for logged-in vs anonymous users.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.signedCookies?.[COOKIE_NAME];

    if (token) {
      const user = await validateSession(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch {
    // Silently continue without auth on error
    next();
  }
}
