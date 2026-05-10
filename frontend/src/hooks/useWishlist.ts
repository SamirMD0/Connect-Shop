import { useState, useEffect, useCallback } from 'react';

const WISHLIST_KEY = 'elecshop_wishlist';

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem(WISHLIST_KEY);
    if (stored) {
      try {
        setWishlist(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) => {
      const isWishlisted = prev.includes(productId);
      const newWishlist = isWishlisted 
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(newWishlist));
      window.dispatchEvent(new Event('wishlistUpdated'));
      return newWishlist;
    });
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.includes(productId);
  }, [wishlist]);

  // Listen for changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WISHLIST_KEY && e.newValue) {
        setWishlist(JSON.parse(e.newValue));
      }
    };

    const handleLocalUpdate = () => {
      const stored = localStorage.getItem(WISHLIST_KEY);
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wishlistUpdated', handleLocalUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wishlistUpdated', handleLocalUpdate);
    };
  }, []);

  return {
    wishlist,
    toggleWishlist,
    isInWishlist,
    count: wishlist.length,
    isMounted
  };
}
