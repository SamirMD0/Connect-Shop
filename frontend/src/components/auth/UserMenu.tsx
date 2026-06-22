'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full ring-2 ring-transparent transition-colors hover:ring-accent/40"
        aria-label={`Open account menu for ${user.name}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="account-menu"
      >
        <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-elevated">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <span className="text-sm font-medium text-text-primary">{initials}</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div id="account-menu" className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-xl origin-top-right">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
          
          <div className="p-1">
            <Link
              href="/account"
              className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-elevated"
              onClick={() => setIsOpen(false)}
            >
              Account
            </Link>
            <Link
              href="/orders"
              className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-elevated"
              onClick={() => setIsOpen(false)}
            >
              My Orders
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="mt-1 flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
