import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { getMfaRequiredForAdmin } from '../services/mfa.service';

export function requireAdminMfa(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw new ForbiddenError('Access denied: Authentication required');
    }

    if (getMfaRequiredForAdmin(req.user)) {
      throw new ForbiddenError('Admin MFA verification required');
    }

    next();
  } catch (err) {
    next(err);
  }
}
