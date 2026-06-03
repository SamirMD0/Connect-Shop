'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full ring-2 ring-transparent transition-all hover:ring-accent-glow focus:outline-none focus:ring-accent"
        aria-label={`Open account menu for ${user.name}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface border border-white/10 flex items-center justify-center relative">
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
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface/90 backdrop-blur-xl border border-white/10 shadow-2xl py-1 z-50 animate-fade-in overflow-hidden origin-top-right">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
          
          <div className="p-1">
            <Link
              href="/account"
              className="block px-3 py-2 text-sm text-text-primary hover:bg-white/5 rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Account
            </Link>
            <Link
              href="/orders"
              className="block px-3 py-2 text-sm text-text-primary hover:bg-white/5 rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              My Orders
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-md transition-colors mt-1"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
