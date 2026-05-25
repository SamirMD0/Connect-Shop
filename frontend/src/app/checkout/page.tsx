'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { ShippingAddress, Order, UserAddress } from '@/lib/types';
import DOMPurify from 'dompurify';
import { z } from 'zod';
import { CheckCircle2, ShoppingBag, Package, ArrowLeft, Lock, TicketPercent } from 'lucide-react';

const shippingSchema = z.object({
  guestEmail: z.string().email('Valid email is required for guest checkout').optional().or(z.literal('')),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 characters').max(20, 'Phone number is too long'),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(300),
  addressLine2: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(1, 'Country is required').max(100),
  paymentMethod: z.enum(['cod', 'bank_transfer', 'omt', 'whish_money']).default('cod'),
  couponCode: z.string().trim().max(50).optional(),
  deliverySlot: z.string().trim().min(1, 'Delivery time slot is required').max(100),
});

const shippingByRegion: Record<string, number> = {
  Beirut: 3,
  'Mount Lebanon': 4,
  North: 5,
  South: 5,
  Bekaa: 5,
};

const deliverySlots = [
  'Morning (9:00 AM - 12:00 PM)',
  'Afternoon (12:00 PM - 4:00 PM)',
  'Evening (4:00 PM - 8:00 PM)',
];

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const { addToast } = useToast();

  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [deliverySlot, setDeliverySlot] = useState(deliverySlots[0]);
  const [form, setForm] = useState<ShippingAddress & { paymentMethod: 'cod' | 'bank_transfer' | 'omt' | 'whish_money' }>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Lebanon',
    paymentMethod: 'cod',
  });

  useEffect(() => {
    if (!user) return;
    api.get<{ success: boolean; addresses: UserAddress[] }>('/api/users/me/addresses')
      .then((res) => setAddresses(res.addresses))
      .catch(() => setAddresses([]));
  }, [user]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const applyAddress = (addressId: string) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;

    setForm((prev) => ({
      ...prev,
      fullName: address.recipient_name,
      phone: address.phone,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 || '',
      city: address.city,
      state: address.state || '',
      zipCode: address.zip_code || '',
      country: address.country,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedForm = {
      fullName: DOMPurify.sanitize(form.fullName),
      phone: DOMPurify.sanitize(form.phone || ''),
      addressLine1: DOMPurify.sanitize(form.addressLine1),
      addressLine2: form.addressLine2 ? DOMPurify.sanitize(form.addressLine2) : '',
      city: DOMPurify.sanitize(form.city),
      state: form.state ? DOMPurify.sanitize(form.state) : '',
      zipCode: form.zipCode ? DOMPurify.sanitize(form.zipCode) : '',
      country: DOMPurify.sanitize(form.country),
      paymentMethod: form.paymentMethod,
      couponCode: DOMPurify.sanitize(couponCode),
      deliverySlot: DOMPurify.sanitize(deliverySlot),
      guestEmail: user ? '' : DOMPurify.sanitize(guestEmail),
    };

    const validation = shippingSchema.safeParse(sanitizedForm);
    if (!validation.success) {
      addToast(validation.error.issues[0].message, 'error');
      return;
    }

    if (!user && !validation.data.guestEmail) {
      addToast('Email is required for guest checkout.', 'error');
      return;
    }

    if (!acceptTerms) {
      addToast('Please accept the terms and delivery policy.', 'error');
      return;
    }

    setPlacing(true);
    try {
      const res = await api.post<{ success: boolean; order: Order; message: string }>(
        '/api/orders',
        { 
          guestEmail: user ? undefined : validation.data.guestEmail,
          items: user ? undefined : items.map(item => ({
            productId: item.product_id,
            variantId: item.variant_id,
            quantity: item.quantity,
          })),
          shippingAddress: {
            fullName: validation.data.fullName,
            phone: validation.data.phone,
            addressLine1: validation.data.addressLine1,
            addressLine2: validation.data.addressLine2,
            city: validation.data.city,
            state: validation.data.state,
            zipCode: validation.data.zipCode,
            country: validation.data.country,
          },
          paymentMethod: validation.data.paymentMethod,
          couponCode: validation.data.couponCode || undefined,
          deliverySlot: validation.data.deliverySlot,
        }
      );
      setOrderPlaced(res.order);
      if (user && saveAddress) {
        await api.post('/api/users/me/addresses', {
          label: 'Checkout',
          recipientName: validation.data.fullName,
          phone: validation.data.phone,
          addressLine1: validation.data.addressLine1,
          addressLine2: validation.data.addressLine2,
          city: validation.data.city,
          state: validation.data.state,
          zipCode: validation.data.zipCode,
          country: validation.data.country,
          isDefault: addresses.length === 0,
        });
      }
      clearCart();
      addToast('Order placed successfully!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  const subtotalValue = parseFloat(subtotal || '0');
  const shippingCost = subtotalValue >= 150 ? 0 : shippingByRegion[form.state || form.city] ?? 4;
  const taxAmount = Math.round(subtotalValue * 0.11 * 100) / 100;
  const estimatedTotal = (subtotalValue + shippingCost + taxAmount).toFixed(2);

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
          <div className="mb-8 rounded-2xl border border-slate-200/60 bg-bg-surface p-4 text-left">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Payment</span>
              <span className="font-medium text-text-primary">{orderPlaced.payment_method}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-text-muted">
              <span>Total</span>
              <span className="font-bold text-text-primary">${orderPlaced.total}</span>
            </div>
            {orderPlaced.delivery_slot && (
              <div className="mt-2 flex justify-between text-sm text-text-muted">
                <span>Delivery</span>
                <span className="text-text-primary">{orderPlaced.delivery_slot}</span>
              </div>
            )}
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <a 
              href={`https://wa.me/96181000000?text=Hello,%20I%20just%20placed%20order%20${orderPlaced.id.slice(0, 8).toUpperCase()}%20for%20$${orderPlaced.total}.`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="lg" className="bg-[#25D366] hover:bg-[#1ebd5a] text-white border-none">
                Contact via WhatsApp
              </Button>
            </a>
            <Link href="/orders">
              <Button variant="secondary" size="lg">
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
                  {addresses.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Saved Address</label>
                      <select className="input-field" defaultValue="" onChange={(event) => applyAddress(event.target.value)}>
                        <option value="">Use a saved address</option>
                        {addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label} - {address.address_line1}, {address.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!user && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Email *</label>
                      <input
                        name="guestEmail"
                        type="email"
                        value={guestEmail}
                        onChange={(event) => setGuestEmail(event.target.value)}
                        className="input-field"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-text-primary mb-2">Phone Number *</label>
                      <input 
                        name="phone" 
                        value={form.phone} 
                        onChange={handleChange} 
                        className="input-field" 
                        placeholder="+961 XX XXX XXX" 
                        required 
                      />
                    </div>
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
                      <label className="block text-sm font-medium text-text-primary mb-2">Region *</label>
                      <select
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        className="input-field"
                        required
                      >
                        <option value="">Select region</option>
                        {Object.keys(shippingByRegion).map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">ZIP Code</label>
                      <input 
                        name="zipCode" 
                        value={form.zipCode} 
                        onChange={handleChange} 
                        className="input-field" 
                        placeholder="10001" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Country *</label>
                    <input 
                      name="country" 
                      value={form.country} 
                      onChange={handleChange} 
                      className="input-field bg-slate-50 cursor-not-allowed" 
                      placeholder="Lebanon" 
                      readOnly 
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text-muted">
                    <input type="checkbox" disabled={!user} checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                    Save this address to my account
                  </label>
                  <label className="flex items-start gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(event) => setAcceptTerms(event.target.checked)}
                      className="mt-1"
                      required
                    />
                    <span>
                      I agree to the store terms, delivery coordination, and return policy.
                    </span>
                  </label>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-bold text-text-primary mb-4">Delivery Time</h2>
                  <select className="input-field" value={deliverySlot} onChange={(event) => setDeliverySlot(event.target.value)}>
                    {deliverySlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-bold text-text-primary mb-4">Payment Method</h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-accent transition-colors bg-white">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="cod" 
                        checked={form.paymentMethod === 'cod'} 
                        onChange={handleChange}
                        className="w-4 h-4 text-accent"
                      />
                      <div>
                        <p className="font-medium text-text-primary">Cash on Delivery (COD)</p>
                        <p className="text-sm text-text-muted">Pay when your order arrives.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-accent transition-colors bg-white">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="bank_transfer" 
                        checked={form.paymentMethod === 'bank_transfer'} 
                        onChange={handleChange}
                        className="w-4 h-4 text-accent"
                      />
                      <div>
                        <p className="font-medium text-text-primary">Bank Transfer (Whish / OMT)</p>
                        <p className="text-sm text-text-muted">We will contact you with payment details.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-accent transition-colors bg-white">
                      <input type="radio" name="paymentMethod" value="omt" checked={form.paymentMethod === 'omt'} onChange={handleChange} className="w-4 h-4 text-accent" />
                      <div>
                        <p className="font-medium text-text-primary">OMT Money Transfer</p>
                        <p className="text-sm text-text-muted">Reserve the order and pay by OMT before delivery.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-accent transition-colors bg-white">
                      <input type="radio" name="paymentMethod" value="whish_money" checked={form.paymentMethod === 'whish_money'} onChange={handleChange} className="w-4 h-4 text-accent" />
                      <div>
                        <p className="font-medium text-text-primary">Whish Money</p>
                        <p className="text-sm text-text-muted">Reserve the order and pay by Whish Money before delivery.</p>
                      </div>
                    </label>
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
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      className="input-field"
                      placeholder="Coupon code"
                    />
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <TicketPercent className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal</span>
                    <span className="text-text-primary font-medium">${subtotal}</span>
                  </div>
                  {couponCode.trim() && (
                    <div className="flex justify-between text-text-muted">
                      <span>Coupon</span>
                      <span className="text-accent font-medium">Applied at order placement</span>
                    </div>
                  )}
                  <div className="flex justify-between text-text-muted">
                    <span>Tax (VAT 11%)</span>
                    <span className="text-text-primary font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Shipping</span>
                    <span className="text-text-primary font-medium">${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-text-primary text-lg border-t border-slate-200 pt-4">
                    <span>Total</span>
                    <span>${estimatedTotal}</span>
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
                  Your order details are secure.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Container>
    </div>
  );
}
