// backend/src/middleware/admin.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Require admin privileges.
 * Must be used AFTER requireAuth so that req.user is guaranteed to exist.
 */
export function isAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw new ForbiddenError('Access denied: Authentication required');
    }

    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Access denied: Admin privileges required');
    }

    next();
  } catch (err) {
    next(err);
  }
}
