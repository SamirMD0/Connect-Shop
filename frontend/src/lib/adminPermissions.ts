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

export function hasAdminAccess(role?: string | null): boolean {
  return Boolean(role && (ROLE_PERMISSIONS[role] || []).length > 0);
}

export function hasAdminPermission(role: string | undefined | null, permission: AdminPermission): boolean {
  return Boolean(role && (ROLE_PERMISSIONS[role] || []).includes(permission));
}
