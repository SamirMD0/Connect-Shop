import type { ShippingAddress, GuestCartItem } from './types';

export interface CheckoutRequestItem { productId: string; variantId?: string | null; quantity: number; cartItemId?: number }
export interface CheckoutRequest {
  expectedQuote?: { subtotal: string; discount_amount: string; tax_amount: string; shipping_cost: string; total: string; currency: string };
  guestEmail?: string;
  items: CheckoutRequestItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  couponCode?: string;
  deliverySlot?: string;
}
export interface CheckoutAttempt { key: string; fingerprint: string }
const storageKey = 'connect-shop-checkout-attempt-v1';

function canonical(value: unknown): unknown {
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function normalizedCheckoutAttempt(actor: string, request: CheckoutRequest): string {
  const items = request.items.map(item => ({ ...item, productId: item.productId.toLowerCase(),
    variantId: item.variantId?.toLowerCase() || null }));
  items.sort((a, b) => {
    const first = JSON.stringify(canonical(a)); const second = JSON.stringify(canonical(b));
    return first < second ? -1 : first > second ? 1 : 0;
  });
  const intent = { ...request };
  // Re-quoted price preconditions do not create new purchase intent. Unknown
  // outcomes must keep the original key so the server can replay a committed order.
  delete intent.expectedQuote;
  return JSON.stringify(canonical({ actor, ...intent, items,
    guestEmail: request.guestEmail?.trim().toLowerCase(), couponCode: request.couponCode?.trim().toUpperCase(),
    paymentMethod: request.paymentMethod === 'cod' ? 'cash_on_delivery' : request.paymentMethod }));
}

function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}

export async function prepareCheckoutAttempt(actor: string, request: CheckoutRequest, previous?: CheckoutAttempt | null,
  storage = browserStorage()): Promise<CheckoutAttempt> {
  const bytes = new TextEncoder().encode(normalizedCheckoutAttempt(actor, request));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const fingerprint = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
  let saved = previous;
  if (!saved) {
    try { saved = JSON.parse(storage?.getItem(storageKey) || 'null') as CheckoutAttempt | null; } catch { /* Storage is optional. */ }
  }
  const attempt = saved?.fingerprint === fingerprint && typeof saved.key === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(saved.key)
    ? saved : { key: crypto.randomUUID(), fingerprint };
  // Persist only an opaque key + digest, never addresses, email or checkout bodies.
  try { storage?.setItem(storageKey, JSON.stringify(attempt)); } catch { /* Keep the in-memory key. */ }
  return attempt;
}

export function resetCheckoutAttempt(storage = browserStorage()): void {
  try { storage?.removeItem(storageKey); } catch { /* Confirmation must remain successful. */ }
}

export function removePurchasedGuestItems(current: GuestCartItem[], purchased: CheckoutRequestItem[]): GuestCartItem[] {
  const key = (productId: string, variantId?: string | null) => productId + ':' + (variantId || '');
  const remaining = new Map<string, number>();
  for (const item of purchased) {
    const identity = key(item.productId, item.variantId);
    remaining.set(identity, (remaining.get(identity) || 0) + item.quantity);
  }
  return current.flatMap(item => {
    const identity = key(item.product_id, item.variant_id);
    const consumed = Math.min(item.quantity, remaining.get(identity) || 0);
    remaining.set(identity, (remaining.get(identity) || 0) - consumed);
    return item.quantity > consumed ? [{ ...item, quantity: item.quantity - consumed }] : [];
  });
}

export function checkoutFollowUps(tasks: Array<() => Promise<unknown>>): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled(tasks.map(task => Promise.resolve().then(task)));
}
