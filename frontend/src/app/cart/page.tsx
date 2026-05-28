'use client';

import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { CartItemCard } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { PhantomSkeleton } from '@/components/ui/PhantomSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const { items, loading } = useCart();
  const { loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return (
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <PhantomSkeleton loading={true} className="block">
              <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                  <span className="text-sm font-medium text-text-muted">Loading cart items</span>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4 py-5 border-b border-slate-100 last:border-b-0">
                    <div className="shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white overflow-hidden relative border border-slate-200/60" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                        Loading cart item
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">Loading option</p>
                      <p className="text-sm text-accent font-bold mt-1">$000.00</p>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200">
                          <span className="w-9 h-9" />
                          <span className="w-8 text-center text-sm font-semibold text-text-primary">1</span>
                          <span className="w-9 h-9" />
                        </div>
                        <span className="text-xs text-text-muted">Remove</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-text-primary">$000.00</p>
                    </div>
                  </div>
                ))}
              </div>
            </PhantomSkeleton>
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-in">
        <Container className="py-12">
          <h1 className="text-3xl font-bold text-text-primary mb-8">Your Cart</h1>
          <EmptyState
            icon={<ShoppingBag className="w-16 h-16" />}
            title="Your cart is empty"
            description="Looks like you haven&apos;t added any items yet. Start exploring our products!"
            actionLabel="Start Shopping"
            actionHref="/store"
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Your Cart</h1>
          <Link href="/store" className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                <span className="text-sm font-medium text-text-muted">
                  {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
                </span>
              </div>
              {items.map(item => (
                <CartItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <CartSummary />
          </div>
        </div>
      </Container>
    </div>
  );
}
