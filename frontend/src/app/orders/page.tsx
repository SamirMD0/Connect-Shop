'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<Order | null>(null);

  // Route guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const res = await api.get<{ success: boolean; orders: Order[] }>('/api/orders');
        setOrders(res.orders);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleExpand = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setExpandedOrder(null);
      return;
    }
    setExpandedId(orderId);
    try {
      const res = await api.get<{ success: boolean; order: Order }>(`/api/orders/${orderId}`);
      setExpandedOrder(res.order);
    } catch {
      setExpandedId(null);
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <Container className="py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </Container>
    );
  }

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">My Orders</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            }
            title="No orders yet"
            description="Your order history will appear here after your first purchase."
            actionLabel="Start Shopping"
            actionHref="/store"
          />
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="glass-card overflow-hidden">
                {/* Order Header */}
                <button
                  onClick={() => handleExpand(order.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <Badge variant={statusVariant[order.status] || 'default'}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-text-primary">${parseFloat(order.total).toFixed(2)}</p>
                      {order.item_count !== undefined && (
                        <p className="text-xs text-text-muted">{order.item_count} items</p>
                      )}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`w-5 h-5 text-text-muted transition-transform duration-200 ${
                        expandedId === order.id ? 'rotate-180' : ''
                      }`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Detail */}
                {expandedId === order.id && expandedOrder && (
                  <div className="border-t border-white/5 p-5 animate-fade-in">
                    <div className="space-y-3">
                      {expandedOrder.items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-accent">
                                {(item.name || 'P').charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-text-primary truncate">{item.name || 'Product'}</p>
                              <p className="text-xs text-text-muted">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="text-text-primary font-medium shrink-0">
                            ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Shipping */}
                    {expandedOrder.shipping_address && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-text-muted mb-1">Shipped to</p>
                        <p className="text-sm text-text-primary">
                          {expandedOrder.shipping_address.fullName}
                          <br />
                          {expandedOrder.shipping_address.addressLine1}
                          {expandedOrder.shipping_address.addressLine2 && (
                            <>, {expandedOrder.shipping_address.addressLine2}</>
                          )}
                          <br />
                          {expandedOrder.shipping_address.city}
                          {expandedOrder.shipping_address.state && `, ${expandedOrder.shipping_address.state}`}{' '}
                          {expandedOrder.shipping_address.zipCode}
                          <br />
                          {expandedOrder.shipping_address.country}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
