'use client';

import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Truck, WalletCards } from 'lucide-react';

export function CartSummary() {
  const { itemCount, subtotal } = useCart();

  const subtotalNum = parseFloat(subtotal) || 0;
  const freeShippingThreshold = 150;
  const estimatedShipping = subtotalNum >= freeShippingThreshold || subtotalNum === 0 ? 0 : 4;
  const estimatedTax = Math.round(subtotalNum * 0.11 * 100) / 100;
  const estimatedTotal = (subtotalNum + estimatedShipping + estimatedTax).toFixed(2);

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200/60 bg-bg-surface p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-bold text-text-primary">Order Summary</h2>

      <div className="mb-5 grid gap-3">
        <div className="flex items-start gap-3 rounded-xl border border-accent/15 bg-accent/10 p-4">
          <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Cash on Delivery</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">Pay when your order arrives. No online payment required.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Delivery estimate</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">Final delivery fee is confirmed at checkout based on your region.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-text-muted">
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          <span className="text-text-primary font-medium">${subtotal}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Tax estimate</span>
          <span className="text-text-primary font-medium">${estimatedTax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Shipping</span>
          <span className="text-text-primary font-medium">
            {subtotalNum >= freeShippingThreshold ? '$0.00' : `$${estimatedShipping.toFixed(2)}`}
          </span>
        </div>
        <div className="border-t border-slate-200 pt-4 flex justify-between font-bold text-text-primary text-lg">
          <span>Total</span>
          <span>${estimatedTotal}</span>
        </div>
      </div>

      <Link href="/checkout" className="block mt-6">
        <Button 
          variant="primary" 
          size="lg"
          className="w-full shadow-lg shadow-accent/25"
          disabled={itemCount === 0}
        >
          Proceed to Checkout
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
