import type { CheckoutRequestItem } from './checkout-attempt';
export interface CheckoutQuote {
  subtotal: string; discount_amount: string; tax_amount: string; shipping_cost: string; total: string; currency: string;
  tax_rate: number; coupon_code: string | null;
  items: { productId: string; variantId: string | null; quantity: number; price: string }[];
}
export interface QuoteRequest { items: CheckoutRequestItem[]; shippingAddress: { city: string; state?: string; country: string }; couponCode?: string; paymentMethod: 'cash_on_delivery' }
export const expectedQuote = (quote: CheckoutQuote) => ({ subtotal: quote.subtotal, discount_amount: quote.discount_amount,
  tax_amount: quote.tax_amount, shipping_cost: quote.shipping_cost, total: quote.total, currency: quote.currency });
