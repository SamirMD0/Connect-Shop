'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Grid, Users, ShoppingCart, LogOut, Image as ImageIcon, Zap, X, AlertTriangle, BadgePercent, Megaphone, Search, MessageSquare, Tags, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AdminPermission, hasAdminPermission } from '../../lib/adminPermissions';

const navItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard, permission: 'analytics' },
  { name: 'Homepage', href: '/admin/homepage', icon: Home, permission: 'content' },
  { name: 'Carousel', href: '/admin/carousel', icon: ImageIcon, permission: 'content' },
  { name: 'Products', href: '/admin/products', icon: Package, permission: 'products' },
  { name: 'Categories', href: '/admin/categories', icon: Grid, permission: 'products' },
  { name: 'Brands', href: '/admin/brands', icon: Tags, permission: 'products' },
  { name: 'Customers', href: '/admin/customers', icon: Users, permission: 'users' },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, permission: 'orders' },
  { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare, permission: 'reviews' },
  { name: 'Inventory', href: '/admin/inventory', icon: AlertTriangle, permission: 'products' },
  { name: 'Promotions', href: '/admin/promotions', icon: Megaphone, permission: 'marketing' },
  { name: 'Coupons', href: '/admin/coupons', icon: BadgePercent, permission: 'marketing' },
  { name: 'Search', href: '/admin/search', icon: Search, permission: 'analytics' },
] satisfies Array<{ name: string; href: string; icon: ComponentType<{ className?: string }>; permission: AdminPermission }>;

interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const visibleNavItems = navItems.filter(item => hasAdminPermission(user?.role, item.permission));

  return (
    <aside className="fixed flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent shadow-sm shadow-blue-200">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0B1B48]">
            Admin<span className="text-accent">Panel</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-[#0B1B48] lg:hidden" title="Close sidebar" aria-label="Close sidebar">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-accent text-white shadow-sm shadow-blue-200' 
                  : 'text-slate-600 hover:bg-blue-50 hover:text-accent'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
