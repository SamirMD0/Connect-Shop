// backend/src/middleware/admin.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export type AdminPermission =
  | 'analytics'
  | 'products'
  | 'orders'
  | 'users'
  | 'reviews'
  | 'content'
  | 'marketing';

const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: ['analytics', 'products', 'orders', 'users', 'reviews', 'content', 'marketing'],
  admin: ['analytics', 'products', 'orders', 'users', 'reviews', 'content', 'marketing'],
  manager: ['analytics', 'products', 'orders', 'reviews', 'content', 'marketing'],
  support: ['analytics', 'orders', 'reviews'],
  customer: [],
};

export function hasAdminPermission(
  user: { role: string } | undefined,
  permission?: AdminPermission
): boolean {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permission ? permissions.includes(permission) : permissions.length > 0;
}

/**
 * Require any admin-console privileges.
 * Must be used AFTER requireAuth so that req.user is guaranteed to exist.
 */
export function isAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw new ForbiddenError('Access denied: Authentication required');
    }

    if (!hasAdminPermission(req.user)) {
      throw new ForbiddenError('Access denied: Admin privileges required');
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdminPermission(permission: AdminPermission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Access denied: Authentication required');
      }

      if (!hasAdminPermission(req.user, permission)) {
        throw new ForbiddenError('Access denied: Insufficient admin permissions');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
