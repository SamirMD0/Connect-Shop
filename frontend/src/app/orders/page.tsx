'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { Order } from '@/lib/types';
import { RotateCcw, FileText, MessageCircle, XCircle, Undo2 } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
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

  const refreshOrders = async () => {
    const res = await api.get<{ success: boolean; orders: Order[] }>('/api/orders');
    setOrders(res.orders);
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await api.post(`/api/orders/${orderId}/cancel`);
      addToast('Order cancelled.', 'success');
      await refreshOrders();
      setExpandedId(null);
      setExpandedOrder(null);
    } catch (error: any) {
      addToast(error.message || 'Unable to cancel order.', 'error');
    }
  };

  const handleReturn = async (orderId: string) => {
    const reason = prompt('Why are you returning this order?');
    if (!reason) return;
    try {
      await api.post(`/api/orders/${orderId}/return`, { reason });
      addToast('Return request submitted.', 'success');
      const res = await api.get<{ success: boolean; order: Order }>(`/api/orders/${orderId}`);
      setExpandedOrder(res.order);
    } catch (error: any) {
      addToast(error.message || 'Unable to request return.', 'error');
    }
  };

  const handleReorder = async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/reorder`);
      addToast('Order items were added to your cart.', 'success');
      router.push('/cart');
    } catch (error: any) {
      addToast(error.message || 'Unable to reorder these items.', 'error');
    }
  };

  const openInvoice = (orderId: string) => {
    window.open(`${API_URL}/api/v1/orders/${orderId}/invoice`, '_blank', 'noopener,noreferrer');
  };

  const statusSteps = ['confirmed', 'processing', 'shipped', 'delivered'];

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
                      <div className="rounded-xl bg-bg-elevated p-4">
                        <p className="text-xs text-text-muted mb-3">Order progress</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {statusSteps.map(step => {
                            const active = statusSteps.indexOf(step) <= statusSteps.indexOf(expandedOrder.status);
                            return (
                              <div key={step} className={`rounded-lg border px-3 py-2 text-xs font-medium ${active ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/10 text-text-muted'}`}>
                                {step.charAt(0).toUpperCase() + step.slice(1)}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-bg-elevated p-4">
                          <p className="text-xs text-text-muted mb-1">Estimated delivery</p>
                          <p className="text-sm font-medium text-text-primary">
                            {expandedOrder.estimated_delivery_date ? new Date(expandedOrder.estimated_delivery_date).toLocaleDateString() : 'To be confirmed'}
                          </p>
                          {expandedOrder.delivery_slot && <p className="text-xs text-text-muted mt-1">{expandedOrder.delivery_slot}</p>}
                        </div>
                        <div className="rounded-xl bg-bg-elevated p-4">
                          <p className="text-xs text-text-muted mb-1">Tracking</p>
                          {expandedOrder.tracking_number ? (
                            <a href={expandedOrder.tracking_url || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent hover:text-accent-glow">
                              {expandedOrder.tracking_carrier || 'Courier'} · {expandedOrder.tracking_number}
                            </a>
                          ) : (
                            <p className="text-sm text-text-primary">Tracking pending</p>
                          )}
                        </div>
                      </div>

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

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => openInvoice(expandedOrder.id)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-text-primary hover:border-accent hover:text-accent">
                        <FileText className="w-4 h-4" />
                        Invoice PDF
                      </button>
                      <button onClick={() => void handleReorder(expandedOrder.id)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-text-primary hover:border-accent hover:text-accent">
                        <RotateCcw className="w-4 h-4" />
                        Reorder
                      </button>
                      {['confirmed', 'processing'].includes(expandedOrder.status) && (
                        <button onClick={() => void handleCancel(expandedOrder.id)} className="inline-flex items-center gap-2 rounded-lg border border-danger/20 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10">
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </button>
                      )}
                      {expandedOrder.status === 'delivered' && (
                        <button onClick={() => void handleReturn(expandedOrder.id)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-text-primary hover:border-accent hover:text-accent">
                          <Undo2 className="w-4 h-4" />
                          Return
                        </button>
                      )}
                      <a
                        href={`https://wa.me/96181000000?text=Hello,%20I%20need%20an%20update%20on%20order%20${expandedOrder.id.slice(0, 8).toUpperCase()}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#25D366]/30 px-3 py-2 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/10"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp update
                      </a>
                    </div>

                    {expandedOrder.status_history && expandedOrder.status_history.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-text-muted mb-2">Status timeline</p>
                        <div className="space-y-2">
                          {expandedOrder.status_history.map(entry => (
                            <div key={entry.id} className="flex justify-between gap-3 text-xs">
                              <span className="font-medium text-text-primary">{entry.status}</span>
                              <span className="text-text-muted">{entry.note || new Date(entry.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {expandedOrder.return_requests && expandedOrder.return_requests.length > 0 && (
                      <div className="mt-4 rounded-xl bg-bg-elevated p-4 text-xs text-text-muted">
                        Return request: {expandedOrder.return_requests[0].status}
                      </div>
                    )}

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
