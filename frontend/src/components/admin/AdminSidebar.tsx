'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Grid, Users, ShoppingCart, LogOut, Image as ImageIcon, Zap, X, AlertTriangle, BadgePercent, Megaphone, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AdminPermission, hasAdminPermission } from '../../lib/adminPermissions';

const navItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard, permission: 'analytics' },
  { name: 'Carousel', href: '/admin/carousel', icon: ImageIcon, permission: 'content' },
  { name: 'Products', href: '/admin/products', icon: Package, permission: 'products' },
  { name: 'Categories', href: '/admin/categories', icon: Grid, permission: 'products' },
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
    <aside className="w-64 bg-[#12121a] border-r border-[#1e293b] flex flex-col fixed h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[#1e293b]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center shadow-lg shadow-accent/25">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            Admin<span className="text-accent">Panel</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white" title="Close sidebar" aria-label="Close sidebar">
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
                  ? 'bg-accent text-white shadow-lg shadow-accent/25' 
                  : 'text-slate-400 hover:bg-[#1e293b] hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e293b]">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-[#1e293b] hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
