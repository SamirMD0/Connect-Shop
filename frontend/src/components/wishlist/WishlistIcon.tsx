'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useEffect, useState } from 'react';

export function WishlistIcon() {
  const { itemCount } = useWishlist();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="relative p-2 text-text-muted">
        <Heart className="w-6 h-6" />
      </div>
    );
  }

  return (
    <Link href="/wishlist" className="relative p-2 text-text-muted hover:text-accent transition-colors group">
      <Heart className="w-6 h-6 group-hover:fill-accent/20 transition-all" />
      {itemCount > 0 && (
        <span className="absolute top-1 right-0.5 w-4 h-4 bg-accent text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
