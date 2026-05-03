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

export function Navbar() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <Container>
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h8.25c1.035 0 1.875-.84 1.875-1.875V15Z" />
                <path d="M8.25 19.5a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM15.75 6.75a.75.75 0 0 0-.75.75v11.25c0 .087.015.17.042.248a3 3 0 0 1 5.958.464c.034-.11.052-.227.052-.348V7.5a.75.75 0 0 0-.75-.75h-4.552Z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/store"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Store
            </Link>
            {user?.role === 'admin' && (
              <Link 
                href="/admin" 
                className="text-sm text-accent hover:text-accent-glow transition-colors font-medium"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            <CartIcon />
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-bg-elevated/50 skeleton-shimmer" />
            ) : user ? (
              <UserMenu />
            ) : (
              <LoginButton />
            )}
          </div>

          {/* Mobile Right */}
          <div className="flex md:hidden items-center gap-2">
            <CartIcon />
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-text-muted">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </nav>
      </Container>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
