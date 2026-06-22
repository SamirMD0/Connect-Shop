'use client';

import { useEffect, useRef } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close navigation"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        className="absolute right-0 top-0 flex h-full w-[340px] max-w-[88vw] animate-slide-in flex-col border-l border-border bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <span id="mobile-navigation-title" className="block text-sm font-semibold text-text-primary">ELECTRO SHOP Menu</span>
            <span className="text-xs text-text-muted">Browse categories and pages</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-accent hover:text-accent"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action="/store" method="GET" className="border-b border-border p-4">
          <label className="sr-only" htmlFor="mobile-search">Search products</label>
          <div className="relative">
            <input
              id="mobile-search"
              name="search"
              className="h-11 w-full rounded-lg border border-border bg-slate-50 px-4 pr-12 text-sm outline-none transition-all placeholder:text-text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
              placeholder="Search electronics"
            />
            <button
              type="submit"
              onClick={onClose}
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg bg-accent text-white transition-colors hover:bg-accent-hover"
              aria-label="Search products"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4 [&_a]:min-h-11">
          <Link
            href="/"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Home
          </Link>
          <Link
            href="/store"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Shop
          </Link>
          <Link
            href="/store?sort=rating"
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Best Sellers
            <span className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase leading-4 text-white">
              Sale
            </span>
          </Link>
          <Link
            href="/contact"
            onClick={onClose}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-blue-50 hover:text-accent"
          >
            Contact
          </Link>
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
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              Shopping
            </p>
            <Link
              href="/cart"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Cart
            </Link>
            <Link
              href="/wishlist"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Wishlist
            </Link>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
            >
              Checkout
            </Link>
            {user && (
              <>
                <Link
                  href="/account"
                  onClick={onClose}
                  className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
                >
                  My Account
                </Link>
                <Link
                  href="/orders"
                  onClick={onClose}
                  className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-blue-50 hover:text-accent"
                >
                  My Orders
                </Link>
              </>
            )}
            {user && hasAdminAccess(user.role) && (
              <Link
                href="/admin"
                onClick={onClose}
                className="block rounded-md px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-blue-50"
              >
                Dashboard
              </Link>
            )}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              Help
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
          </div>
        </nav>

        <div className="border-t border-border bg-slate-50 p-4">
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-semibold text-text-muted">
            <span className="rounded-lg bg-white px-3 py-2 text-center ring-1 ring-slate-200">
              Cash on Delivery
            </span>
            <span className="rounded-lg bg-white px-3 py-2 text-center ring-1 ring-slate-200">
              Local Delivery
            </span>
          </div>
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
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/auth/login"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:border-border-strong hover:bg-bg-elevated"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
