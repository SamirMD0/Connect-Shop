'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Cart, CartItem, GuestCartItem, Product } from '@/lib/types';
import { api, ApiError } from '@/lib/api';
import { CART_STORAGE_KEY } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  loading: boolean;
  addItem: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
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
    const items: GuestCartItem[] = stored ? JSON.parse(stored) : [];
    const activeItems = items.filter(item => !item.expires_at || new Date(item.expires_at).getTime() > Date.now());
    if (activeItems.length !== items.length) setGuestCart(activeItems);
    return activeItems;
  } catch {
    return [];
  }
}

function setGuestCart(items: GuestCartItem[]) {
  if (typeof window === 'undefined') return;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(item => ({ ...item, expires_at: item.expires_at || expiresAt }))));
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

  const loadGuestCart = useCallback(async () => {
    const guestItems = getGuestCart();
    const itemCount = guestItems.reduce((sum, item) => sum + item.quantity, 0);
    setItemCount(itemCount);

    if (guestItems.length === 0) {
      setItems([]);
      setSubtotal('0.00');
      return;
    }

    setLoading(true);
    try {
      const ids = [...new Set(guestItems.map(item => item.product_id))];
      const productRes = await api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { ids: ids.join(','), limit: 1000 },
      });
      const products = productRes.products || [];
      const productsById = new Map(products.map(product => [product.id, product]));
      const detailCache = new Map<string, Product>();

      const hydratedItems = await Promise.all(guestItems.map(async (guestItem, index) => {
        let product = productsById.get(guestItem.product_id);
        if (!product) return null;

        let variant = product.variants?.find(item => item.id === guestItem.variant_id);
        if (guestItem.variant_id && !variant) {
          if (!detailCache.has(product.id)) {
            const detail = await api.get<{ success: boolean; product: Product }>(`/api/products/${product.slug}`);
            detailCache.set(product.id, detail.product);
          }
          product = detailCache.get(product.id) || product;
          variant = product.variants?.find(item => item.id === guestItem.variant_id);
        }

        return {
          id: index + 1,
          user_id: 'guest',
          product_id: guestItem.product_id,
          variant_id: guestItem.variant_id || null,
          quantity: guestItem.quantity,
          name: product.name,
          slug: product.slug,
          price: variant?.price || product.price,
          image_url: variant?.image_url || product.image_url,
          stock: variant?.stock ?? product.stock,
          variant_name: variant?.name || null,
          created_at: new Date().toISOString(),
        } as CartItem;
      }));

      const cartItems = hydratedItems.filter(Boolean) as CartItem[];
      setItems(cartItems);
      setSubtotal(cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(2));
      setItemCount(cartItems.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      setItems([]);
      setSubtotal('0.00');
    } finally {
      setLoading(false);
    }
  }, []);

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
              await api.post('/api/cart', { productId: item.product_id, quantity: item.quantity, variantId: item.variant_id });
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
      void loadGuestCart();
    }
  }, [user, authLoading, fetchCart, loadGuestCart]);

  const addItem = async (productId: string, quantity = 1, variantId?: string | null) => {
    if (user) {
      try {
        const data = await api.post<{ success: boolean; cart: Cart }>('/api/cart', { productId, quantity, variantId });
        setItems(data.cart.items);
        setItemCount(data.cart.itemCount);
        setSubtotal(data.cart.total);
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    } else {
      const guestItems = getGuestCart();
      const existing = guestItems.find(item => item.product_id === productId && item.variant_id === variantId);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      if (existing) {
        existing.quantity += quantity;
        existing.expires_at = expiresAt;
      } else {
        guestItems.push({ product_id: productId, quantity, variant_id: variantId, expires_at: expiresAt });
      }
      setGuestCart(guestItems);
      await loadGuestCart();
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
    } else {
      const guestItems = getGuestCart();
      const item = guestItems[itemId - 1];
      if (!item) return;
      item.quantity = quantity;
      item.expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      setGuestCart(guestItems);
      await loadGuestCart();
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
    } else {
      const guestItems = getGuestCart();
      guestItems.splice(itemId - 1, 1);
      setGuestCart(guestItems);
      await loadGuestCart();
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
