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
import { api, getErrorMessage } from '@/lib/api';
import { createWhatsAppUrl } from '@/lib/business-config';
import { ShippingAddress, Order, UserAddress } from '@/lib/types';
import DOMPurify from 'dompurify';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
  TicketPercent,
  WalletCards,
} from 'lucide-react';

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
  state: z.string().trim().min(1, 'Region is required').max(100),
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

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  const message = errors[field];
  if (!message) return null;
  return <p id={`${field}-error`} className="mt-1.5 text-sm text-danger">{message}</p>;
}

function focusCheckoutField(field: string) {
  window.requestAnimationFrame(() => document.getElementById(field)?.focus());
}

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, itemCount, clearCart, loading: cartLoading } = useCart();
  const { addToast } = useToast();

  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  if (authLoading || cartLoading) {
    return (
      <Container className="py-8">
        <div className="mb-8">
          <Skeleton className="mb-3 h-10 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
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
    setFieldErrors((current) => {
      if (!current[e.target.name]) return current;
      const next = { ...current };
      delete next[e.target.name];
      return next;
    });
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const selectedPhoneRegion = phoneRegions.find((region) => region.code === phoneRegionCode) || phoneRegions[0];

  const applyAddress = (addressId: string) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    const phoneParts = splitPhoneNumber(address.phone);
    setPhoneRegionCode(phoneParts.code);
    setFieldErrors({});

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
    setFieldErrors({});

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
      const errors = validation.error.issues.reduce<Record<string, string>>((current, issue) => {
        const field = String(issue.path[0] || 'form');
        if (!current[field]) current[field] = issue.message;
        return current;
      }, {});
      setFieldErrors(errors);
      const message = 'Please review the highlighted checkout fields.';
      setFormError(message);
      addToast(validation.error.issues[0].message, 'error');
      focusCheckoutField(String(validation.error.issues[0].path[0] || ''));
      return;
    }

    if (!user && !validation.data.guestEmail) {
      const message = 'Email is required for guest checkout.';
      setFieldErrors({ guestEmail: message });
      setFormError(message);
      addToast(message, 'error');
      focusCheckoutField('guestEmail');
      return;
    }

    if (!acceptTerms) {
      const message = 'Please accept the terms and delivery policy.';
      setFieldErrors({ acceptTerms: message });
      setFormError(message);
      addToast(message, 'error');
      focusCheckoutField('acceptTerms');
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
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to place order. Please try again.');
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
            We will contact you to confirm delivery details before dispatch. Payment is collected on delivery.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Order ID: <span className="text-accent font-mono font-medium">{orderPlaced.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <div className="mb-8 rounded-lg border border-border bg-bg-surface p-4 text-left">
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
          <div className="flex flex-wrap justify-center gap-3">
            <a 
              href={createWhatsAppUrl(`Hello, I placed order #${orderPlaced.id.slice(0, 8).toUpperCase()} and want to confirm it.`)}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1ebd5a]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Contact via WhatsApp
            </a>
            <Link href="/orders" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-elevated">
              <Package className="h-4 w-4" aria-hidden="true" />
              View orders
            </Link>
            <Link href="/store" className="inline-flex min-h-12 items-center rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-elevated">
              Continue shopping
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
        <p className="text-text-muted mb-6">Add products to your cart before starting checkout.</p>
        <Link href="/store" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
          Browse store
        </Link>
      </Container>
    );
  }

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">Single-step checkout</p>
            <h1 className="text-3xl font-bold text-text-primary">Delivery and order review</h1>
            <p className="mt-2 text-sm text-text-muted">
              Complete your delivery details. Payment is Cash on Delivery, with no online payment required.
            </p>
          </div>
          <Link href="/cart" className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div id="checkout-form-error" role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{formError}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Shipping Form */}
            <div>
              <div className="rounded-lg border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Delivery details</h2>
                    <p className="mt-1 text-sm text-text-muted">Fields marked with * are required.</p>
                  </div>
                </div>
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">Contact information</h3>
                    <div className="grid gap-4">
                  {addresses.length > 0 && (
                    <div>
                      <label htmlFor="saved-address" className="mb-2 block text-sm font-medium text-text-primary">Saved address</label>
                      <select id="saved-address" className="input-field" defaultValue="" onChange={(event) => applyAddress(event.target.value)}>
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
                      <label htmlFor="guestEmail" className="mb-2 block text-sm font-medium text-text-primary">Email <span className="text-danger" aria-hidden="true">*</span></label>
                      <input
                        id="guestEmail"
                        name="guestEmail"
                        type="email"
                        value={guestEmail}
                        onChange={(event) => {
                          setGuestEmail(event.target.value);
                          setFieldErrors((current) => ({ ...current, guestEmail: '' }));
                          setFormError('');
                        }}
                        className={`input-field ${fieldErrors.guestEmail ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        placeholder="you@example.com"
                        required
                        aria-invalid={Boolean(fieldErrors.guestEmail)}
                        aria-describedby={fieldErrors.guestEmail ? 'guestEmail-error' : undefined}
                      />
                      <FieldError field="guestEmail" errors={fieldErrors} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-text-primary">Full name <span className="text-danger" aria-hidden="true">*</span></label>
                      <input 
                        id="fullName"
                        name="fullName" 
                        value={form.fullName} 
                        onChange={handleChange} 
                        className={`input-field ${fieldErrors.fullName ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        placeholder="John Doe" 
                        required 
                        aria-invalid={Boolean(fieldErrors.fullName)}
                        aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                      />
                      <FieldError field="fullName" errors={fieldErrors} />
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-2 block text-sm font-medium text-text-primary">Phone number <span className="text-danger" aria-hidden="true">*</span></label>
                      <div className="relative flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPhoneRegionMenuOpen((open) => !open)}
                          className="flex h-[46px] w-[104px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-bg-surface px-3 text-sm font-medium text-text-primary transition-all hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                          aria-label={`Phone region code: ${selectedPhoneRegion.country} ${selectedPhoneRegion.code}`}
                          aria-expanded={phoneRegionMenuOpen}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          id="phone"
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleChange}
                          className={`input-field min-w-0 flex-1 ${fieldErrors.phone ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                          placeholder="81 000 000"
                          required
                          aria-invalid={Boolean(fieldErrors.phone)}
                          aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                        />
                      </div>
                      <FieldError field="phone" errors={fieldErrors} />
                    </div>
                  </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">Delivery information</h3>
                    <div className="grid gap-4">
                  <div>
                    <label htmlFor="addressLine1" className="mb-2 block text-sm font-medium text-text-primary">Street address <span className="text-danger" aria-hidden="true">*</span></label>
                    <input 
                      id="addressLine1"
                      name="addressLine1" 
                      value={form.addressLine1} 
                      onChange={handleChange} 
                      className={`input-field ${fieldErrors.addressLine1 ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                      placeholder="123 Main Street" 
                      required 
                      aria-invalid={Boolean(fieldErrors.addressLine1)}
                      aria-describedby={fieldErrors.addressLine1 ? 'addressLine1-error' : undefined}
                    />
                    <FieldError field="addressLine1" errors={fieldErrors} />
                  </div>
                  <div>
                    <label htmlFor="addressLine2" className="mb-2 block text-sm font-medium text-text-primary">Apartment, floor or suite <span className="font-normal text-text-muted">(optional)</span></label>
                    <input 
                      id="addressLine2"
                      name="addressLine2" 
                      value={form.addressLine2} 
                      onChange={handleChange} 
                      className={`input-field ${fieldErrors.addressLine2 ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                      placeholder="Apt, Suite, etc. (optional)" 
                    />
                    <FieldError field="addressLine2" errors={fieldErrors} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="city" className="mb-2 block text-sm font-medium text-text-primary">City <span className="text-danger" aria-hidden="true">*</span></label>
                      <input 
                        id="city"
                        name="city" 
                        value={form.city} 
                        onChange={handleChange} 
                        className={`input-field ${fieldErrors.city ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        placeholder="Beirut" 
                        required 
                        aria-invalid={Boolean(fieldErrors.city)}
                        aria-describedby={fieldErrors.city ? 'city-error' : undefined}
                      />
                      <FieldError field="city" errors={fieldErrors} />
                    </div>
                    <div>
                      <label htmlFor="state" className="mb-2 block text-sm font-medium text-text-primary">Region <span className="text-danger" aria-hidden="true">*</span></label>
                      <select
                        id="state"
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        className={`input-field ${fieldErrors.state ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        required
                        aria-invalid={Boolean(fieldErrors.state)}
                        aria-describedby={fieldErrors.state ? 'state-error' : undefined}
                      >
                        <option value="">Select region</option>
                        {Object.keys(shippingByRegion).map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                      <FieldError field="state" errors={fieldErrors} />
                    </div>
                    <div>
                      <label htmlFor="zipCode" className="mb-2 block text-sm font-medium text-text-primary">ZIP code <span className="font-normal text-text-muted">(optional)</span></label>
                      <input 
                        id="zipCode"
                        name="zipCode" 
                        value={form.zipCode} 
                        onChange={handleChange} 
                        className={`input-field ${fieldErrors.zipCode ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                        placeholder="10001" 
                      />
                      <FieldError field="zipCode" errors={fieldErrors} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="country" className="mb-2 block text-sm font-medium text-text-primary">Country <span className="text-danger" aria-hidden="true">*</span></label>
                    <input 
                      id="country"
                      name="country" 
                      value={form.country} 
                      onChange={handleChange} 
                      className="input-field cursor-not-allowed bg-slate-50"
                      placeholder="Lebanon" 
                      readOnly 
                    />
                  </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">Order notes</h3>
                  <div>
                    <label htmlFor="notes" className="mb-2 block text-sm font-medium text-text-primary">Delivery notes <span className="font-normal text-text-muted">(optional)</span></label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={form.notes || ''}
                      onChange={handleChange}
                      className={`input-field min-h-24 resize-y ${fieldErrors.notes ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                      placeholder="Optional building, floor, landmark, or delivery instructions"
                      aria-invalid={Boolean(fieldErrors.notes)}
                      aria-describedby={fieldErrors.notes ? 'notes-error' : 'notes-help'}
                    />
                    <p id="notes-help" className="mt-1.5 text-xs text-text-muted">Include only details that help the delivery team find you.</p>
                    <FieldError field="notes" errors={fieldErrors} />
                  </div>
                  </div>

                  {user && (
                    <label className="flex min-h-11 items-center gap-3 rounded-lg bg-bg-elevated p-3 text-sm text-text-secondary">
                      <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                      Save this address to my account
                    </label>
                  )}
                  <div>
                  <label className={`flex min-h-11 items-start gap-3 rounded-lg border p-3 text-sm text-text-secondary ${fieldErrors.acceptTerms ? 'border-danger bg-danger/5' : 'border-border bg-bg-elevated'}`}>
                    <input
                      id="acceptTerms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(event) => {
                        setAcceptTerms(event.target.checked);
                        setFieldErrors((current) => ({ ...current, acceptTerms: '' }));
                        setFormError('');
                      }}
                      className="mt-1"
                      required
                      aria-invalid={Boolean(fieldErrors.acceptTerms)}
                      aria-describedby={fieldErrors.acceptTerms ? 'acceptTerms-error' : undefined}
                    />
                    <span>
                      I agree to the store terms, delivery coordination, and return policy.
                    </span>
                  </label>
                  <FieldError field="acceptTerms" errors={fieldErrors} />
                  </div>
                </div>

                <div className="mt-7 border-t border-border pt-6">
                  <h2 className="text-lg font-bold text-text-primary">Delivery time</h2>
                  <p id="deliverySlot-help" className="mb-4 mt-1 text-sm text-text-muted">Choose the time window that is easiest for coordination.</p>
                  <label htmlFor="deliverySlot" className="sr-only">Delivery time</label>
                  <select
                    id="deliverySlot"
                    name="deliverySlot"
                    className={`input-field ${fieldErrors.deliverySlot ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                    value={deliverySlot}
                    onChange={(event) => {
                      setDeliverySlot(event.target.value);
                      setFieldErrors((current) => ({ ...current, deliverySlot: '' }));
                    }}
                    aria-invalid={Boolean(fieldErrors.deliverySlot)}
                    aria-describedby={fieldErrors.deliverySlot ? 'deliverySlot-error' : 'deliverySlot-help'}
                  >
                    {deliverySlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                  <FieldError field="deliverySlot" errors={fieldErrors} />
                </div>

                <div className="mt-7 rounded-lg border border-accent/20 bg-accent/10 p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">Payment method</h2>
                      <p className="mt-1 text-sm text-text-muted">Cash on Delivery only. Pay when your order arrives.</p>
                    </div>
                  </div>
                  <input type="hidden" name="paymentMethod" value={form.paymentMethod} />
                  <div className="rounded-lg border border-accent/20 bg-white p-4">
                    <p className="font-semibold text-text-primary">Cash on Delivery confirmed</p>
                    <p className="mt-1 text-sm text-text-muted">No card details or online payment are required.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="rounded-lg border border-border bg-bg-surface p-4 shadow-sm sm:p-5 lg:sticky lg:top-24">
                <h2 className="mb-2 text-lg font-bold text-text-primary">Order review</h2>
                <p className="mb-4 text-sm text-text-muted">Review items and COD payment before placing the order.</p>

                <div className="mb-4 rounded-lg bg-accent/10 p-3">
                  <div className="flex items-start gap-3">
                    <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Cash on Delivery</p>
                      <p className="mt-1 text-xs leading-5 text-text-muted">Pay when your order arrives. No online payment required.</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 max-h-64 space-y-3 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 rounded-lg bg-bg-elevated p-3">
                      <div className="relative w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200/60">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill className="object-contain p-1.5" />
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

                <div className="space-y-3 border-t border-border pt-4 text-sm">
                  <div>
                    <label htmlFor="couponCode" className="mb-2 block text-sm font-medium text-text-primary">Coupon code <span className="font-normal text-text-muted">(optional)</span></label>
                    <div className="flex gap-2">
                    <input
                      id="couponCode"
                      name="couponCode"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        setFieldErrors((current) => ({ ...current, couponCode: '' }));
                      }}
                      className={`input-field min-w-0 ${fieldErrors.couponCode ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                      placeholder="Coupon code"
                      aria-invalid={Boolean(fieldErrors.couponCode)}
                      aria-describedby={fieldErrors.couponCode ? 'couponCode-error' : undefined}
                    />
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent" aria-hidden="true">
                      <TicketPercent className="h-5 w-5" />
                    </div>
                  </div>
                    <FieldError field="couponCode" errors={fieldErrors} />
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
                    <span>Delivery fee</span>
                    <span className="text-text-primary font-medium">${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-4 text-lg font-bold text-text-primary">
                    <span>Estimated total</span>
                    <span>${estimatedTotal}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="mt-6 w-full"
                  loading={placing}
                  disabled={placing}
                  aria-describedby="checkout-submit-help"
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  Place COD order
                </Button>

                <p id="checkout-submit-help" className="mt-4 text-center text-xs text-text-muted" aria-live="polite">
                  No online payment is collected on this website.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Container>
    </div>
  );
}
