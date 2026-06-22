'use client';

import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { CartItemCard } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShoppingBag, ArrowLeft, WalletCards, Truck } from 'lucide-react';

export default function CartPage() {
  const { items, loading } = useCart();
  const { loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return (
      <Container className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Your Cart</h1>
          <p className="mt-2 text-sm text-text-muted">Loading your selected products and order summary.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-border bg-white px-4 sm:px-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr] gap-3 border-b border-border py-5 last:border-b-0 sm:grid-cols-[96px_1fr_auto]">
                    <Skeleton className="h-20 w-20 rounded-lg sm:h-24 sm:w-24" />
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-full max-w-xs rounded" />
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-11 w-36 rounded-lg" />
                    </div>
                    <Skeleton className="col-span-2 h-6 w-24 rounded sm:col-span-1" />
                  </div>
                ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-in">
        <Container className="py-12">
          <div className="mx-auto max-w-2xl text-center">
            <EmptyState
              icon={<ShoppingBag className="h-16 w-16" />}
              title="Your cart is empty"
              description="Add electronics, accessories, or appliances to your cart, then return here to review quantities before checkout."
              actionLabel="Start Shopping"
              actionHref="/store"
            />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent">Cart</p>
            <h1 className="text-3xl font-bold text-text-primary">Review your cart</h1>
            <p className="mt-2 text-sm text-text-muted">Confirm products, quantities, and estimated totals before checkout.</p>
          </div>
          <Link href="/store" className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0" aria-labelledby="cart-items-heading">
            <div className="border-y border-border bg-bg-surface px-1 sm:rounded-lg sm:border sm:px-5">
              <div className="flex flex-col gap-3 border-b border-border px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
                <span className="text-sm font-semibold text-text-primary">
                  <span id="cart-items-heading" className="sr-only">Cart items</span>
                  {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-medium text-text-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1.5">
                    <WalletCards className="h-3.5 w-3.5 text-accent" />
                    COD checkout
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1.5">
                    <Truck className="h-3.5 w-3.5 text-accent" />
                    Local delivery
                  </span>
                </div>
              </div>
              {items.map(item => (
                <CartItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {/* Summary */}
          <aside>
            <CartSummary />
          </aside>
        </div>
      </Container>
    </div>
  );
}
