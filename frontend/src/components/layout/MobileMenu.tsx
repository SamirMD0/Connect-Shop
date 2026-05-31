'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { hasAdminAccess } from '@/lib/adminPermissions';
import type { Category } from '@/lib/types';
import { Search, X } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
}

export function MobileMenu({ isOpen, onClose, categories = [] }: MobileMenuProps) {
  const { user, logout } = useAuth();

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
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 flex h-full w-[340px] max-w-[90vw] animate-slide-in flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <span className="block text-sm font-semibold text-text-primary">ELECTRO SHOP Menu</span>
            <span className="text-xs text-text-muted">Browse categories and pages</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-text-muted transition-colors hover:border-accent hover:text-accent"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action="/store" method="GET" className="border-b border-slate-100 p-5">
          <label className="sr-only" htmlFor="mobile-search">Search products</label>
          <div className="relative">
            <input
              id="mobile-search"
              name="search"
              className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 pr-11 text-sm outline-none transition-all placeholder:text-text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
              placeholder="I am shopping for..."
            />
            <button
              type="submit"
              onClick={onClose}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-slate-900"
              aria-label="Search products"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        <nav className="flex-1 space-y-1 overflow-y-auto p-5">
          <Link
            href="/contact"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Popular
          </Link>
          <Link
            href="/store"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Shop
          </Link>
          <Link
            href="/"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Contact
          </Link>
          <Link
            href="/cart"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Cart
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Wishlist
          </Link>
          <Link
            href="/checkout"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Checkout
          </Link>
          <Link
            href="/store?sort=rating"
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Best Selling
            <span className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase leading-4 text-white">
              Sale
            </span>
          </Link>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              Pages
            </p>
            <Link
              href="/about"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              About
            </Link>
            <Link
              href="/faq"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              FAQ
            </Link>
            <Link
              href="/privacy-policy"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Privacy Policy
            </Link>
            <Link
              href="/return-policy"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Return Policy
            </Link>
            <Link
              href="/terms"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Terms
            </Link>
            <Link
              href="/auth/login"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Sign up
            </Link>
            <Link
              href="/account"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              My Account
            </Link>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              Blogs
            </p>
            {['Blog Grid with sidebar', 'Blog Grid', 'Blog details with sidebar', 'Blog details'].map((item) => (
              <Link
                key={item}
                href="/"
                onClick={onClose}
                className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
              >
                {item}
              </Link>
            ))}
          </div>
          {user && (
            <>
              <Link
                href="/orders"
                onClick={onClose}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
              >
                My Orders
              </Link>
              {hasAdminAccess(user.role) && (
                <Link 
                  href="/admin" 
                  onClick={onClose}
                  className="block rounded-md px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-blue-50"
                >
                  Dashboard
                </Link>
              )}
            </>
          )}
          {categories.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
                Categories
              </p>
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/store?category=${category.slug}`}
                  onClick={onClose}
                  className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 bg-slate-50 p-5">
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
            <Link href="/auth/register" onClick={onClose}>
              <Button variant="primary" className="w-full">
                Sign up
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
