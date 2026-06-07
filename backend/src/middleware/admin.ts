// backend/src/middleware/admin.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { logAdminSuspiciousAction } from '../services/securityEvent.service';

export type AdminPermission =
  | 'analytics'
  | 'products'
  | 'orders'
  | 'customers'
  | 'admin_roles'
  | 'reviews'
  | 'content'
  | 'homepage'
  | 'marketing'
  | 'security'
  | 'settings';

const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: [
    'analytics',
    'products',
    'orders',
    'customers',
    'admin_roles',
    'reviews',
    'content',
    'homepage',
    'marketing',
    'security',
    'settings',
  ],
  admin: ['analytics', 'products', 'orders', 'customers', 'reviews', 'content', 'homepage', 'marketing'],
  manager: ['analytics', 'products', 'orders', 'reviews', 'content', 'homepage', 'marketing'],
  support: ['analytics', 'orders', 'customers', 'reviews'],
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
      logAdminSuspiciousAction(req, 'admin_auth_required');
      throw new ForbiddenError('Access denied: Authentication required');
    }

    if (!hasAdminPermission(req.user)) {
      logAdminSuspiciousAction(req, 'admin_privileges_required');
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
        logAdminSuspiciousAction(req, 'admin_permission_auth_required', { permission });
        throw new ForbiddenError('Access denied: Authentication required');
      }

      if (!hasAdminPermission(req.user, permission)) {
        logAdminSuspiciousAction(req, 'insufficient_admin_permission', { permission });
        throw new ForbiddenError('Access denied: Insufficient admin permissions');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
