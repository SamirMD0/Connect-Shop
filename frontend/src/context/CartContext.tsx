'use client';

import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Cart, CartItem, Product } from '@/lib/types';
import { api, ApiError } from '@/lib/api';
import { getGuestCart, mutateGuestCart, prepareGuestMerge, confirmGuestMerge, type MergeResult, type RejectedMergeLine } from '@/lib/guest-cart';
import { useAuth } from '@/hooks/useAuth';
import { removePurchasedGuestItems, type CheckoutRequestItem } from '@/lib/checkout-attempt';

interface CartContextType {
  mergeError: string | null;
  mergeRejected: RejectedMergeLine[];
  guestItemsRemaining: number;
  mergeLoading: boolean;
  retryGuestMerge: () => Promise<void>;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  loading: boolean;
  addItem: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => void;
  completeCheckout: (purchased: CheckoutRequestItem[]) => Promise<void>;
}

export const CartContext = createContext<CartContextType>({
  mergeError: null, mergeRejected: [], guestItemsRemaining: 0, mergeLoading: false, retryGuestMerge: async () => {},
  items: [],
  itemCount: 0,
  subtotal: '0.00',
  loading: false,
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
  refreshCart: async () => {},
  clearCart: () => {},
  completeCheckout: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeRejected, setMergeRejected] = useState<RejectedMergeLine[]>([]);
  const [guestItemsRemaining, setGuestItemsRemaining] = useState(0);
  const [mergeLoading, setMergeLoading] = useState(false);
  const mergeRetryOf = useRef<string | undefined>(undefined);
  const currentUserId = useRef(user?.id);
  useEffect(() => { currentUserId.current = user?.id; }, [user?.id]);

  const loadGuestCart = useCallback(async () => {
    const guestItems = await getGuestCart();
    if (currentUserId.current) return;
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
          stock: guestItem.variant_id && (!variant || variant.is_active === false) ? 0 : variant?.stock ?? product.stock,
          variant_name: variant?.name || null,
          created_at: new Date().toISOString(),
        } as CartItem;
      }));

      if (currentUserId.current) return;
      const cartItems = hydratedItems.filter(Boolean) as CartItem[];
      setItems(cartItems);
      setSubtotal(cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(2));
      setItemCount(cartItems.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      if (currentUserId.current) return;
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
      if (currentUserId.current !== user.id) return;
      setItems(data.cart.items);
      setItemCount(data.cart.itemCount);
      setSubtotal(data.cart.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  const transferGuestCart = useCallback(async (retryOf?: string) => {
    if (!user) return;
    const actor = user.id;
    setMergeLoading(true); setMergeError(null);
    try {
      const prepared = await prepareGuestMerge(actor, retryOf);
      let confirmed = prepared;
      if (prepared.key && prepared.items) {
        const result = await api.post<MergeResult>('/api/cart/merge', { userId: actor, items: prepared.items },
          { headers: { 'Idempotency-Key': prepared.key } });
        // Reconcile durable storage even if the UI has since changed account.
        confirmed = await confirmGuestMerge(prepared.key, result);
      }
      if (currentUserId.current === actor) {
        mergeRetryOf.current = confirmed.retryOf;
        setMergeRejected(confirmed.rejected); setGuestItemsRemaining(confirmed.remaining);
      }
    } catch (error) {
      if (currentUserId.current === actor) setMergeError(error instanceof Error ? error.message : 'Could not confirm your guest cart transfer. Retry safely.');
    } finally {
      if (currentUserId.current === actor) { setMergeLoading(false); await fetchCart(); }
    }
  }, [user, fetchCart]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void (async () => {
      // Skip effects cleaned up by a remount/account change before storage work.
      await Promise.resolve();
      if (!active) return;
      if (user) await transferGuestCart();
      else {
        setMergeError(null); setMergeRejected([]); setGuestItemsRemaining(0); setMergeLoading(false);
        mergeRetryOf.current = undefined;
        await loadGuestCart().catch(error => {
          if (active) setMergeError(error instanceof Error ? error.message : 'Could not read the saved cart.');
        });
      }
    })();
    return () => { active = false; };
  }, [user, authLoading, transferGuestCart, loadGuestCart]);

  const retryGuestMerge = () => transferGuestCart(mergeRetryOf.current);

  const applyCart = (cart: Cart) => { setItems(cart.items); setItemCount(cart.itemCount); setSubtotal(cart.total); };

  const addItem = async (productId: string, quantity = 1, variantId?: string | null) => {
    if (user) {
      try {
        const data = await api.post<{ success: boolean; cart: Cart }>('/api/cart', { productId, quantity, variantId });
        applyCart(data.cart);
      } catch (err) { if (err instanceof ApiError) throw err; }
    } else {
      await mutateGuestCart(guestItems => {
        const existing = guestItems.find(item => item.product_id === productId.toLowerCase() && (item.variant_id || null) === (variantId?.toLowerCase() || null));
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        if (existing) { existing.quantity += quantity; existing.expires_at = expiresAt; }
        else guestItems.push({ product_id: productId, quantity, variant_id: variantId, expires_at: expiresAt });
        return guestItems;
      });
      await loadGuestCart();
    }
  };

  const updateItem = async (itemId: number, quantity: number) => {
    if (user) {
      try {
        const data = await api.patch<{ success: boolean; cart: Cart }>(`/api/cart/${itemId}`, { quantity });
        applyCart(data.cart);
      } catch (err) { if (err instanceof ApiError) throw err; }
    } else {
      await mutateGuestCart(guestItems => {
        const item = guestItems[itemId - 1];
        if (item) { item.quantity = quantity; item.expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); }
        return guestItems;
      });
      await loadGuestCart();
    }
  };

  const removeItem = async (itemId: number) => {
    if (user) {
      try {
        const data = await api.delete<{ success: boolean; cart: Cart }>(`/api/cart/${itemId}`);
        applyCart(data.cart);
      } catch (err) { if (err instanceof ApiError) throw err; }
    } else {
      await mutateGuestCart(guestItems => { guestItems.splice(itemId - 1, 1); return guestItems; });
      await loadGuestCart();
    }
  };

  const completeCheckout = async (purchased: CheckoutRequestItem[]) => {
    if (user) {
      // Server consumed only the purchased snapshot; preserve later additions.
      const data = await api.get<{ success: boolean; cart: Cart }>('/api/cart');
      applyCart(data.cart);
    } else {
      await mutateGuestCart(guestItems => removePurchasedGuestItems(guestItems, purchased));
      await loadGuestCart();
    }
  };

  const clearCartState = () => {
    setItems([]); setItemCount(0); setSubtotal('0.00');
    if (!user) void mutateGuestCart(() => []).catch(error => setMergeError(error instanceof Error ? error.message : 'Could not clear the saved cart.'));
  };

  return (
    <CartContext.Provider value={{ mergeError, mergeRejected, guestItemsRemaining, mergeLoading, retryGuestMerge,
      items, itemCount, subtotal, loading, addItem, updateItem, removeItem, clearCart: clearCartState, completeCheckout, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
