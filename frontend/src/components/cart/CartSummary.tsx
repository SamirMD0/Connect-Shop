'use client';

import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function CartSummary() {
  const { itemCount, subtotal } = useCart();
  const { user } = useAuth();

  return (
    <div className="glass-card p-6 sticky top-24">
      <h2 className="text-lg font-bold text-text-primary mb-4">Order Summary</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-text-muted">
          <span>Items ({itemCount})</span>
          <span className="text-text-primary">${subtotal}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Shipping</span>
          <span className="text-success">Free</span>
        </div>
        <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-text-primary text-base">
          <span>Total</span>
          <span>${subtotal}</span>
        </div>
      </div>

      {user ? (
        <Link href="/checkout" className="block mt-6">
          <Button variant="primary" className="w-full" disabled={itemCount === 0}>
            Proceed to Checkout
          </Button>
        </Link>
      ) : (
        <div className="mt-6 text-center text-sm text-text-muted">
          <p>Sign in to checkout</p>
        </div>
      )}
    </div>
  );
}
