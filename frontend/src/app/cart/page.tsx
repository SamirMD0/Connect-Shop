'use client';

import { Container } from '@/components/layout/Container';
import { CartItemCard } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CartPage() {
  const { items, loading } = useCart();
  const { user, loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return (
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Container>
    );
  }

  // Guest users or empty cart
  if (!user) {
    return (
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Your Cart</h1>
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          }
          title="Sign in to view your cart"
          description="Create an account or sign in to start shopping."
          actionLabel="Browse Store"
          actionHref="/store"
        />
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Your Cart</h1>
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          }
          title="Your cart is empty"
          description="Looks like you haven't added any items yet."
          actionLabel="Start Shopping"
          actionHref="/store"
        />
      </Container>
    );
  }

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 glass-card p-6">
            {items.map(item => (
              <CartItemCard key={item.id} item={item} />
            ))}
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
