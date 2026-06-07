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

export function hasAdminAccess(role?: string | null): boolean {
  return Boolean(role && (ROLE_PERMISSIONS[role] || []).length > 0);
}

export function hasAdminPermission(role: string | undefined | null, permission: AdminPermission): boolean {
  return Boolean(role && (ROLE_PERMISSIONS[role] || []).includes(permission));
}
