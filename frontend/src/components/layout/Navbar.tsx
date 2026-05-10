'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Container } from './Container';
import { CartIcon } from '@/components/cart/CartIcon';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { MobileMenu } from './MobileMenu';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME } from '@/lib/constants';
import { Menu, Zap, Search } from 'lucide-react';
import { WishlistIcon } from '@/components/wishlist/WishlistIcon';

export function Navbar() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 navbar-glass">
      <Container>
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center shadow-lg shadow-accent/25 group-hover:shadow-accent/40 transition-shadow">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/store"
              className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Store
            </Link>
            {user?.role === 'admin' && (
              <Link 
                href="/admin" 
                className="text-sm font-medium text-accent hover:text-accent-glow transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Middle: Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
            <form action="/store" method="GET" className="w-full relative">
              <input
                type="text"
                name="search"
                placeholder="Search products..."
                className="w-full bg-slate-100 border-none rounded-xl pl-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:bg-white transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-accent">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-4">
            <WishlistIcon />
            <CartIcon />
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-slate-100 skeleton-shimmer" />
            ) : user ? (
              <UserMenu />
            ) : (
              <LoginButton />
            )}
          </div>

          {/* Mobile Right */}
          <div className="flex md:hidden items-center gap-3">
            <WishlistIcon />
            <CartIcon />
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </nav>
      </Container>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
