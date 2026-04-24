'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, login, logout } = useAuth();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-[280px] bg-bg-surface/95 backdrop-blur-xl border-l border-white/10 shadow-2xl animate-slide-in">
        {/* Close */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-sm font-medium text-text-muted">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <nav className="p-4 space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className="block px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/store"
            onClick={onClose}
            className="block px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors"
          >
            Store
          </Link>
          <Link
            href="/cart"
            onClick={onClose}
            className="block px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors"
          >
            Cart
          </Link>
          {user && (
            <Link
              href="/orders"
              onClick={onClose}
              className="block px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              My Orders
            </Link>
          )}
        </nav>

        {/* Auth */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          {user ? (
            <div className="space-y-3">
              <div className="px-3">
                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
              <Button variant="danger" size="sm" className="w-full" onClick={() => { onClose(); logout(); }}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button variant="primary" className="w-full" onClick={() => { onClose(); login(); }}>
              Sign in with Google
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
