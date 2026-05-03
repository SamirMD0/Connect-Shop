'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { ShippingAddress, Order } from '@/lib/types';
import DOMPurify from 'dompurify';
import { z } from 'zod';

const shippingSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(300),
  addressLine2: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().min(1, 'ZIP code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(100),
});


export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const { addToast } = useToast();
  const router = useRouter();

  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
  const [form, setForm] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  // Route guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <Container className="py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Container>
    );
  }

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedForm = {
      fullName: DOMPurify.sanitize(form.fullName),
      addressLine1: DOMPurify.sanitize(form.addressLine1),
      addressLine2: form.addressLine2 ? DOMPurify.sanitize(form.addressLine2) : '',
      city: DOMPurify.sanitize(form.city),
      state: form.state ? DOMPurify.sanitize(form.state) : '',
      zipCode: DOMPurify.sanitize(form.zipCode),
      country: DOMPurify.sanitize(form.country),
    };

    const validation = shippingSchema.safeParse(sanitizedForm);
    if (!validation.success) {
      addToast(validation.error.issues[0].message, 'error');
      return;
    }

    setPlacing(true);
    try {
      const res = await api.post<{ success: boolean; order: Order; message: string }>(
        '/api/orders',
        { shippingAddress: validation.data }
      );
      setOrderPlaced(res.order);
      clearCart();
      addToast('Order placed successfully!', 'success');
    } catch {
      addToast('Failed to place order. Please try again.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  // Success screen
  if (orderPlaced) {
    return (
      <div className="animate-fade-in">
        <Container className="py-16 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-success">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Order Confirmed!</h1>
          <p className="text-text-muted mb-2">
            Your order has been placed successfully.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Order ID: <span className="text-accent font-mono">{orderPlaced.id.slice(0, 8)}</span>
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={() => router.push('/orders')}>
              View Orders
            </Button>
            <Button variant="secondary" onClick={() => router.push('/store')}>
              Continue Shopping
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Your cart is empty</h1>
        <p className="text-text-muted mb-6">Add some items before checking out.</p>
        <Button variant="primary" onClick={() => router.push('/store')}>
          Browse Store
        </Button>
      </Container>
    );
  }

  const inputClasses =
    'w-full px-4 py-3 rounded-xl bg-bg-surface/50 border border-white/10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all';

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipping Form */}
            <div className="lg:col-span-2 glass-card p-6">
              <h2 className="text-lg font-bold text-text-primary mb-6">Shipping Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Full Name *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} className={inputClasses} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Address Line 1 *</label>
                  <input name="addressLine1" value={form.addressLine1} onChange={handleChange} className={inputClasses} placeholder="123 Main Street" required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Address Line 2</label>
                  <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className={inputClasses} placeholder="Apt, Suite, etc. (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">City *</label>
                    <input name="city" value={form.city} onChange={handleChange} className={inputClasses} placeholder="New York" required />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">State</label>
                    <input name="state" value={form.state} onChange={handleChange} className={inputClasses} placeholder="NY" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">ZIP Code *</label>
                    <input name="zipCode" value={form.zipCode} onChange={handleChange} className={inputClasses} placeholder="10001" required />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Country *</label>
                    <input name="country" value={form.country} onChange={handleChange} className={inputClasses} placeholder="United States" required />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="glass-card p-6 h-fit sticky top-24">
              <h2 className="text-lg font-bold text-text-primary mb-4">Order Review</h2>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-text-muted truncate mr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-text-primary shrink-0">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="text-text-primary">${subtotal}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Shipping</span>
                  <span className="text-success">Free</span>
                </div>
                <div className="flex justify-between font-bold text-text-primary text-base border-t border-white/10 pt-2">
                  <span>Total</span>
                  <span>${subtotal}</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-6"
                loading={placing}
                disabled={placing}
              >
                Place Order
              </Button>
            </div>
          </div>
        </form>
      </Container>
    </div>
  );
}
