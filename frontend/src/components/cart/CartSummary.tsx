'use client';

import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/Button';
import { Truck, ShieldCheck, ArrowRight } from 'lucide-react';

export function CartSummary() {
  const { itemCount, subtotal } = useCart();

  const subtotalNum = parseFloat(subtotal) || 0;
  const freeShippingThreshold = 150;
  const estimatedShipping = subtotalNum >= freeShippingThreshold || subtotalNum === 0 ? 0 : 4;
  const estimatedTax = Math.round(subtotalNum * 0.11 * 100) / 100;
  const estimatedTotal = (subtotalNum + estimatedShipping + estimatedTax).toFixed(2);
  const progressPercent = Math.min((subtotalNum / freeShippingThreshold) * 100, 100);
  const amountToFreeShipping = Math.max(freeShippingThreshold - subtotalNum, 0);

  return (
    <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-6 sticky top-24 shadow-lg">
      <h2 className="text-lg font-bold text-text-primary mb-6">Order Summary</h2>

      {/* Free Shipping Progress */}
      {subtotalNum > 0 && subtotalNum < freeShippingThreshold && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-text-primary">
              ${amountToFreeShipping.toFixed(2)} away from free shipping
            </span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {subtotalNum >= freeShippingThreshold && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-success" />
          <span className="text-sm font-medium text-emerald-700">You qualify for free shipping!</span>
        </div>
      )}

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
          <span className="text-text-primary font-medium">${estimatedShipping.toFixed(2)}</span>
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
