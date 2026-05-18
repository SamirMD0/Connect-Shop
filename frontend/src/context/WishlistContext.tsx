'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Product } from '@/lib/types';

export interface WishlistItem {
  user_id: string;
  product_id: string;
  created_at: string;
  product_name: string;
  product_slug: string;
  product_price: number;
  product_image: string;
  product_stock: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => void;
}

export const WishlistContext = createContext<WishlistContextType>({
  items: [],
  itemCount: 0,
  loading: false,
  isInWishlist: () => false,
  addToWishlist: async () => {},
  removeFromWishlist: async () => {},
  toggleWishlist: async () => {},
  clearWishlist: () => {},
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; wishlist: WishlistItem[] }>('/api/wishlist');
      setItems(data.wishlist);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchWishlist();
    } else {
      setItems([]);
    }
  }, [user, authLoading, fetchWishlist]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.product_id === productId);
  }, [items]);

  const addToWishlist = async (productId: string) => {
    if (!user) return; // Only logged in users can add to wishlist
    try {
      const data = await api.post<{ success: boolean; item: WishlistItem }>('/api/wishlist', { productId });
      setItems(prev => [data.item, ...prev]);
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    try {
      await api.delete(`/api/wishlist/${productId}`);
      setItems(prev => prev.filter(item => item.product_id !== productId));
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  };

  const clearWishlist = () => {
    setItems([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount: items.length,
        loading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
