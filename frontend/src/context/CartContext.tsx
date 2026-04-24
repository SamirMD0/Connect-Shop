'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Cart, CartItem, GuestCartItem } from '@/lib/types';
import { api, ApiError } from '@/lib/api';
import { CART_STORAGE_KEY } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  loading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType>({
  items: [],
  itemCount: 0,
  subtotal: '0.00',
  loading: false,
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
  clearCart: () => {},
});

// ─── Guest Cart Helpers ──────────────────────────────────────────────────────

function getGuestCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setGuestCart(items: GuestCartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function clearGuestCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_STORAGE_KEY);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal] = useState('0.00');
  const [loading, setLoading] = useState(false);

  // Fetch cart from backend for authenticated users
  const fetchCart = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; cart: Cart }>('/api/cart');
      setItems(data.cart.items);
      setItemCount(data.cart.itemCount);
      setSubtotal(data.cart.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load cart: backend for auth users, localStorage for guests
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // Merge guest cart into backend cart, then fetch
      const guestItems = getGuestCart();
      if (guestItems.length > 0) {
        (async () => {
          try {
            for (const item of guestItems) {
              await api.post('/api/cart', { productId: item.product_id, quantity: item.quantity });
            }
            clearGuestCart();
          } catch {
            // ignore merge errors
          }
          fetchCart();
        })();
      } else {
        fetchCart();
      }
    } else {
      // Guest: load from localStorage (items are minimal, just IDs + quantities)
      // We don't have full product info for guests, so items array stays empty
      // and we only track counts via GuestCartItem
      const guestItems = getGuestCart();
      setItemCount(guestItems.reduce((sum, item) => sum + item.quantity, 0));
      setSubtotal('0.00');
      setItems([]);
    }
  }, [user, authLoading, fetchCart]);

  const addItem = async (productId: string, quantity = 1) => {
    if (user) {
      try {
        const data = await api.post<{ success: boolean; cart: Cart }>('/api/cart', { productId, quantity });
        setItems(data.cart.items);
        setItemCount(data.cart.itemCount);
        setSubtotal(data.cart.total);
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    } else {
      const guestItems = getGuestCart();
      const existing = guestItems.find(item => item.product_id === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        guestItems.push({ product_id: productId, quantity });
      }
      setGuestCart(guestItems);
      setItemCount(guestItems.reduce((sum, item) => sum + item.quantity, 0));
    }
  };

  const updateItem = async (itemId: number, quantity: number) => {
    if (user) {
      try {
        const data = await api.patch<{ success: boolean; cart: Cart }>(`/api/cart/${itemId}`, { quantity });
        setItems(data.cart.items);
        setItemCount(data.cart.itemCount);
        setSubtotal(data.cart.total);
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }
  };

  const removeItem = async (itemId: number) => {
    if (user) {
      try {
        const data = await api.delete<{ success: boolean; cart: Cart }>(`/api/cart/${itemId}`);
        setItems(data.cart.items);
        setItemCount(data.cart.itemCount);
        setSubtotal(data.cart.total);
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }
  };

  const clearCartState = () => {
    setItems([]);
    setItemCount(0);
    setSubtotal('0.00');
    if (!user) {
      clearGuestCart();
    }
  };

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, loading, addItem, updateItem, removeItem, clearCart: clearCartState }}
    >
      {children}
    </CartContext.Provider>
  );
}
