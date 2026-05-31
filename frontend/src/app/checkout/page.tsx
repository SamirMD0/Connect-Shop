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
import { createWhatsAppUrl } from '@/lib/business-config';
import { ShippingAddress, Order, UserAddress } from '@/lib/types';
import DOMPurify from 'dompurify';
import { z } from 'zod';
import { CheckCircle2, ShoppingBag, Package, ArrowLeft, Lock, TicketPercent, MessageCircle } from 'lucide-react';

type CheckoutPaymentMethod = 'cash_on_delivery';

const phoneRegions = [
  { country: 'Lebanon', flagCode: 'lb', code: '+961' },
  { country: 'Jordan', flagCode: 'jo', code: '+962' },
  { country: 'Syria', flagCode: 'sy', code: '+963' },
  { country: 'Palestine', flagCode: 'ps', code: '+970' },
  { country: 'UAE', flagCode: 'ae', code: '+971' },
  { country: 'Saudi Arabia', flagCode: 'sa', code: '+966' },
  { country: 'Qatar', flagCode: 'qa', code: '+974' },
  { country: 'Kuwait', flagCode: 'kw', code: '+965' },
  { country: 'Bahrain', flagCode: 'bh', code: '+973' },
  { country: 'Oman', flagCode: 'om', code: '+968' },
  { country: 'Iraq', flagCode: 'iq', code: '+964' },
  { country: 'Egypt', flagCode: 'eg', code: '+20' },
];

const defaultPhoneRegion = phoneRegions[0].code;

function splitPhoneNumber(phone: string): { code: string; localNumber: string } {
  const normalizedPhone = phone.trim();
  const matchingRegion = [...phoneRegions]
    .sort((a, b) => b.code.length - a.code.length)
    .find((region) => normalizedPhone.startsWith(region.code));

  if (!matchingRegion) {
    return { code: defaultPhoneRegion, localNumber: normalizedPhone };
  }

  return {
    code: matchingRegion.code,
    localNumber: normalizedPhone.slice(matchingRegion.code.length).trim(),
  };
}

const shippingSchema = z.object({
  guestEmail: z.string().email('Valid email is required for guest checkout').optional().or(z.literal('')),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 characters').max(30, 'Phone number is too long'),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(300),
  addressLine2: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(1, 'Country is required').max(100),
  notes: z.string().trim().max(1000, 'Notes must be under 1000 characters').optional(),
  paymentMethod: z.enum(['cash_on_delivery']).default('cash_on_delivery'),
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
  const [formError, setFormError] = useState('');
  const [phoneRegionCode, setPhoneRegionCode] = useState(defaultPhoneRegion);
  const [phoneRegionMenuOpen, setPhoneRegionMenuOpen] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState(deliverySlots[0]);
  const [form, setForm] = useState<ShippingAddress & { paymentMethod: CheckoutPaymentMethod }>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Lebanon',
    notes: '',
    paymentMethod: 'cash_on_delivery',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const selectedPhoneRegion = phoneRegions.find((region) => region.code === phoneRegionCode) || phoneRegions[0];

  const applyAddress = (addressId: string) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    const phoneParts = splitPhoneNumber(address.phone);
    setPhoneRegionCode(phoneParts.code);

    setForm((prev) => ({
      ...prev,
      fullName: address.recipient_name,
      phone: phoneParts.localNumber,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 || '',
      city: address.city,
      state: address.state || '',
      zipCode: address.zip_code || '',
      country: address.country,
      notes: address.notes || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (itemCount === 0) {
      const message = 'Your cart is empty. Add at least one product before checkout.';
      setFormError(message);
      addToast(message, 'error');
      return;
    }

    const sanitizedForm = {
      fullName: DOMPurify.sanitize(form.fullName),
      phone: DOMPurify.sanitize(form.phone.trim().startsWith('+') ? form.phone : `${phoneRegionCode} ${form.phone}`),
      addressLine1: DOMPurify.sanitize(form.addressLine1),
      addressLine2: form.addressLine2 ? DOMPurify.sanitize(form.addressLine2) : '',
      city: DOMPurify.sanitize(form.city),
      state: form.state ? DOMPurify.sanitize(form.state) : '',
      zipCode: form.zipCode ? DOMPurify.sanitize(form.zipCode) : '',
      country: DOMPurify.sanitize(form.country),
      notes: form.notes ? DOMPurify.sanitize(form.notes) : '',
      paymentMethod: form.paymentMethod,
      couponCode: DOMPurify.sanitize(couponCode),
      deliverySlot: DOMPurify.sanitize(deliverySlot),
      guestEmail: user ? '' : DOMPurify.sanitize(guestEmail),
    };

    const validation = shippingSchema.safeParse(sanitizedForm);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      setFormError(message);
      addToast(message, 'error');
      return;
    }

    if (!user && !validation.data.guestEmail) {
      const message = 'Email is required for guest checkout.';
      setFormError(message);
      addToast(message, 'error');
      return;
    }

    if (!acceptTerms) {
      const message = 'Please accept the terms and delivery policy.';
      setFormError(message);
      addToast(message, 'error');
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
            notes: validation.data.notes,
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
      const message = error.message || 'Failed to place order. Please try again.';
      setFormError(message);
      addToast(message, 'error');
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
          <p className="text-sm text-text-muted mb-2">
            We will contact you to confirm the delivery details before dispatch.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Order ID: <span className="text-accent font-mono font-medium">{orderPlaced.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <div className="mb-8 rounded-2xl border border-slate-200/60 bg-bg-surface p-4 text-left">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Payment</span>
              <span className="font-medium text-text-primary">Cash on Delivery</span>
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
              href={createWhatsAppUrl(`Hello, I placed order #${orderPlaced.id.slice(0, 8).toUpperCase()} and want to confirm it.`)}
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="lg" className="bg-[#25D366] hover:bg-[#1ebd5a] text-white border-none">
                <MessageCircle className="w-4 h-4 mr-2" />
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
                      <div className="relative flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPhoneRegionMenuOpen((open) => !open)}
                          className="flex h-[46px] w-[104px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-bg-surface px-3 text-sm font-medium text-text-primary transition-all hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                          aria-label={`Phone region code: ${selectedPhoneRegion.country} ${selectedPhoneRegion.code}`}
                          aria-expanded={phoneRegionMenuOpen}
                        >
                          <img
                            src={`https://flagcdn.com/w20/${selectedPhoneRegion.flagCode}.png`}
                            alt=""
                            className="h-3.5 w-5 rounded-sm object-cover"
                          />
                          <span>{selectedPhoneRegion.code}</span>
                        </button>
                        {phoneRegionMenuOpen && (
                          <div className="absolute left-0 top-full z-20 mt-2 max-h-64 w-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/80">
                            {phoneRegions.map((region) => (
                              <button
                                key={region.code}
                                type="button"
                                onClick={() => {
                                  setFormError('');
                                  setPhoneRegionCode(region.code);
                                  setPhoneRegionMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-text-primary transition-colors hover:bg-slate-50"
                                aria-label={`${region.country} ${region.code}`}
                              >
                                <img
                                  src={`https://flagcdn.com/w20/${region.flagCode}.png`}
                                  alt=""
                                  className="h-3.5 w-5 rounded-sm object-cover"
                                />
                                <span>{region.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleChange}
                          className="input-field min-w-0 flex-1"
                          placeholder="81 000 000"
                          required
                        />
                      </div>
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
                        placeholder="Beirut" 
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
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Delivery Notes</label>
                    <textarea
                      name="notes"
                      value={form.notes || ''}
                      onChange={handleChange}
                      className="input-field min-h-24 resize-y"
                      placeholder="Optional building, floor, landmark, or delivery instructions"
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
                        value="cash_on_delivery" 
                        checked={form.paymentMethod === 'cash_on_delivery'} 
                        onChange={handleChange}
                        className="w-4 h-4 text-accent"
                      />
                      <div>
                        <p className="font-medium text-text-primary">Cash on Delivery</p>
                        <p className="text-sm text-text-muted">Pay in cash when your order arrives.</p>
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

                {formError && (
                  <p className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {formError}
                  </p>
                )}

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
