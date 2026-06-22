'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Truck, WalletCards } from 'lucide-react';

export function CartSummary() {
  const { itemCount, subtotal } = useCart();
  const router = useRouter();

  const subtotalNum = parseFloat(subtotal) || 0;
  const freeShippingThreshold = 150;
  const estimatedShipping = subtotalNum >= freeShippingThreshold || subtotalNum === 0 ? 0 : 4;
  const estimatedTax = Math.round(subtotalNum * 0.11 * 100) / 100;
  const estimatedTotal = (subtotalNum + estimatedShipping + estimatedTax).toFixed(2);

  return (
    <section className="rounded-lg border border-border bg-bg-surface p-5 shadow-sm lg:sticky lg:top-24" aria-labelledby="cart-summary-heading">
      <h2 id="cart-summary-heading" className="text-lg font-bold text-text-primary">Order summary</h2>
      <p className="mt-1 text-sm text-text-muted">Estimated charges before delivery confirmation.</p>

      <div className="my-5 grid gap-3">
        <div className="flex items-start gap-3 rounded-lg bg-accent/10 p-3">
          <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Cash on Delivery</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">Pay when your order arrives. No online payment required.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-bg-elevated p-3">
          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Delivery estimate</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">The estimate updates from your delivery region at checkout.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-text-muted">
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          <span className="text-text-primary font-medium">${subtotal}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Estimated tax</span>
          <span className="text-text-primary font-medium">${estimatedTax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Estimated delivery</span>
          <span className="text-text-primary font-medium">
            {subtotalNum >= freeShippingThreshold ? '$0.00' : `$${estimatedShipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between border-t border-border pt-4 text-lg font-bold text-text-primary">
          <span>Estimated total</span>
          <span>${estimatedTotal}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        disabled={itemCount === 0}
        onClick={() => router.push('/checkout')}
      >
        Proceed to checkout
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <p className="mt-3 text-center text-xs text-text-muted">No online payment is collected.</p>
    </section>
  );
}
