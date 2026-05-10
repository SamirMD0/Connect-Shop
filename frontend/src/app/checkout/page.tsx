'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
import { CheckCircle2, ShoppingBag, Package, ArrowLeft, Lock } from 'lucide-react';

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
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </Container>
    );
  }

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        <Container className="py-16 max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 border-2 border-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-3">Order Confirmed!</h1>
          <p className="text-text-muted mb-2">
            Your order has been placed successfully.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Order ID: <span className="text-accent font-mono font-medium">{orderPlaced.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/orders">
              <Button variant="primary" size="lg">
                <Package className="w-4 h-4 mr-2" />
                View Orders
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="secondary" size="lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <Container className="py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Your cart is empty</h1>
        <p className="text-text-muted mb-6">Add some items before checking out.</p>
        <Link href="/store">
          <Button variant="primary">Browse Store</Button>
        </Link>
      </Container>
    );
  }

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Checkout</h1>
          <Link href="/cart" className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipping Form */}
            <div className="lg:col-span-2">
              <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-6 shadow-lg">
                <h2 className="text-lg font-bold text-text-primary mb-6">Shipping Address</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Full Name *</label>
                    <input 
                      name="fullName" 
                      value={form.fullName} 
                      onChange={handleChange} 
                      className="input-field" 
                      placeholder="John Doe" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Address Line 1 *</label>
                    <input 
                      name="addressLine1" 
                      value={form.addressLine1} 
                      onChange={handleChange} 
                      className="input-field" 
                      placeholder="123 Main Street" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Address Line 2</label>
                    <input 
                      name="addressLine2" 
                      value={form.addressLine2} 
                      onChange={handleChange} 
                      className="input-field" 
                      placeholder="Apt, Suite, etc. (optional)" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">City *</label>
                      <input 
                        name="city" 
                        value={form.city} 
                        onChange={handleChange} 
                        className="input-field" 
                        placeholder="New York" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">State</label>
                      <input 
                        name="state" 
                        value={form.state} 
                        onChange={handleChange} 
                        className="input-field" 
                        placeholder="NY" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ZIP Code *</label>
                      <input 
                        name="zipCode" 
                        value={form.zipCode} 
                        onChange={handleChange} 
                        className="input-field" 
                        placeholder="10001" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Country *</label>
                    <input 
                      name="country" 
                      value={form.country} 
                      onChange={handleChange} 
                      className="input-field" 
                      placeholder="United States" 
                      required 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-6 shadow-lg sticky top-24">
                <h2 className="text-lg font-bold text-text-primary mb-4">Order Review</h2>

                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="relative w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200/60">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent-glow/10">
                            <span className="text-sm font-bold text-accent/40">{item.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                        <p className="text-xs text-text-muted">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-text-primary shrink-0">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 text-sm border-t border-slate-200 pt-4">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal</span>
                    <span className="text-text-primary font-medium">${subtotal}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Shipping</span>
                    <span className="text-success font-medium">Free</span>
                  </div>
                  <div className="flex justify-between font-bold text-text-primary text-lg border-t border-slate-200 pt-4">
                    <span>Total</span>
                    <span>${subtotal}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-6 shadow-lg shadow-accent/25"
                  loading={placing}
                  disabled={placing}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Place Order
                </Button>

                <p className="text-xs text-text-muted text-center mt-4">
                  Your payment info is secure and encrypted.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Container>
    </div>
  );
}
