'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { Order, OrderItem, ShippingAddress } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';
import { useToast } from '@/hooks/useToast';
import { SafeImage } from '@/components/ui/SafeImage';

type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface AdminOrder extends Order {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  item_count?: number;
}

interface AdminOrderDetail extends AdminOrder {
  shipping_address: ShippingAddress;
  items: OrderItem[];
  status_history?: Array<{ id: number; status: string; note: string | null; created_at: string }>;
}

const orderStatuses: Array<{ value: OrderStatus; label: string }> = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusClasses: Record<OrderStatus, string> = {
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function formatMoney(value?: string | number | null): string {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : 'Not set';
}

function formatPaymentMethod(value?: string | null): string {
  if (value === 'cash_on_delivery' || value === 'cod') return 'Cash on Delivery';
  return value ? value.replace(/_/g, ' ') : 'Not set';
}

export default function AdminOrders() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>('confirmed');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async (pageOverride = page) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get<{
        success: boolean;
        orders: AdminOrder[];
        totalPages: number;
      }>('/api/admin/orders', {
        params: {
          page: pageOverride,
          limit: 10,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
        },
      });

      setOrders(res.orders || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load orders.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const openOrderDetail = async (orderId: string) => {
    try {
      setDetailLoading(true);
      setError('');
      const res = await api.get<{ success: boolean; order: AdminOrderDetail }>(`/api/admin/orders/${orderId}`);
      setSelectedOrder(res.order);
      setStatusDraft(res.order.status as OrderStatus);
      setDetailOpen(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load order details.';
      addToast(message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await api.put<{ success: boolean; order: AdminOrder }>(`/api/admin/orders/${orderId}/status`, {
        status: newStatus,
      });

      setOrders((current) => current.map((order) => (
        order.id === orderId ? { ...order, status: res.order.status } : order
      )));
      setSelectedOrder((current) => current && current.id === orderId ? { ...current, ...res.order } : current);
      setStatusDraft(res.order.status as OrderStatus);
      addToast('Order status updated.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update status.';
      addToast(message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    void fetchOrders(1);
  };

  const selectedAddress = selectedOrder?.shipping_address;
  const totals = useMemo(() => {
    if (!selectedOrder) return [];

    return [
      ['Subtotal', selectedOrder.subtotal],
      ['Tax', selectedOrder.tax_amount],
      ['Shipping', selectedOrder.shipping_cost],
      ['Discount', selectedOrder.discount_amount],
      ['Total', selectedOrder.total],
    ];
  }, [selectedOrder]);

  const columns = [
    {
      header: 'Order',
      cell: (order: AdminOrder) => (
        <div>
          <p className="font-mono text-xs font-semibold text-[#0B1B48]">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDate(order.created_at)}</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (order: AdminOrder) => (
        <div className="min-w-48">
          <p className="font-semibold text-[#0B1B48]">{order.customer_name || order.shipping_address?.fullName || 'Guest customer'}</p>
          <p className="text-xs text-slate-500">{order.customer_phone || order.shipping_address?.phone || 'No phone'}</p>
          <p className="text-xs text-slate-500">{order.customer_email || order.guest_email || 'No email'}</p>
        </div>
      ),
    },
    { header: 'Items', cell: (order: AdminOrder) => order.item_count || 0 },
    { header: 'Total', cell: (order: AdminOrder) => <span className="font-semibold">{formatMoney(order.total)}</span> },
    {
      header: 'Payment',
      cell: (order: AdminOrder) => (
        <div className="space-y-1">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {formatPaymentMethod(order.payment_method)}
          </span>
          <p className="text-xs text-slate-500">{order.payment_status || 'pending'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (order: AdminOrder) => (
        <select
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 ${statusClasses[order.status as OrderStatus] || 'border-slate-200 bg-slate-50 text-slate-700'}`}
          value={order.status}
          onChange={(event) => void updateOrderStatus(order.id, event.target.value as OrderStatus)}
          disabled={updatingId === order.id}
        >
          {orderStatuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      ),
    },
    {
      header: 'Actions',
      cell: (order: AdminOrder) => (
        <button
          onClick={() => void openOrderDetail(order.id)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-accent hover:text-accent"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Review cash-on-delivery orders and update fulfillment status.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-[#0B1B48] outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15 sm:w-72"
              placeholder="Search name, phone, email, order ID"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0B1B48] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
          >
            <option value="all">All statuses</option>
            {orderStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        data={orders}
        columns={columns}
        keyExtractor={(order) => order.id}
        loading={loading}
        emptyMessage="No orders found."
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Order Detail" size="wide">
        {detailLoading && <p className="text-sm text-slate-500">Loading order details...</p>}

        {selectedOrder && !detailLoading && (
          <div className="space-y-6 text-sm text-slate-700">
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-semibold text-[#0B1B48]">Customer</h2>
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-[#0B1B48]">{selectedOrder.customer_name || selectedAddress?.fullName || 'Guest customer'}</p>
                  <p>{selectedOrder.customer_phone || selectedAddress?.phone || 'No phone'}</p>
                  <p>{selectedOrder.customer_email || selectedOrder.guest_email || 'No email'}</p>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-semibold text-[#0B1B48]">Payment</h2>
                <div className="mt-3 space-y-2">
                  <p>{formatPaymentMethod(selectedOrder.payment_method)}</p>
                  <p className="text-slate-500">Status: {selectedOrder.payment_status || 'pending'}</p>
                  <p className="font-semibold text-[#0B1B48]">{formatMoney(selectedOrder.total)}</p>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-semibold text-[#0B1B48]">Status</h2>
                <div className="mt-3 flex gap-2">
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0B1B48] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  >
                    {orderStatuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void updateOrderStatus(selectedOrder.id, statusDraft)}
                    disabled={updatingId === selectedOrder.id || statusDraft === selectedOrder.status}
                    className="rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="font-semibold text-[#0B1B48]">Delivery Address</h2>
              <div className="mt-3 leading-6">
                <p>{selectedAddress?.fullName}</p>
                <p>{selectedAddress?.addressLine1}</p>
                {selectedAddress?.addressLine2 && <p>{selectedAddress.addressLine2}</p>}
                <p>{[selectedAddress?.city, selectedAddress?.state, selectedAddress?.zipCode].filter(Boolean).join(', ')}</p>
                <p>{selectedAddress?.country}</p>
                {selectedAddress?.notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-slate-600">Notes: {selectedAddress.notes}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-[#0B1B48]">Order Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              <SafeImage
                                src={item.image_url}
                                alt={item.name || 'Product'}
                                fill
                                className="object-cover"
                                sizes="48px"
                                fallback={
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                    N/A
                                  </div>
                                }
                              />
                            </div>
                            <div>
                              <p className="font-medium text-[#0B1B48]">{item.name || item.product_id}</p>
                              {item.variant_name && <p className="text-xs text-slate-500">{item.variant_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3">{formatMoney(item.price_at_purchase)}</td>
                        <td className="px-4 py-3 font-semibold">{formatMoney(Number(item.price_at_purchase) * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-slate-200 p-4">
                <h2 className="font-semibold text-[#0B1B48]">Totals</h2>
                <div className="mt-3 space-y-2">
                  {totals.map(([label, value]) => (
                    <div key={label} className={`flex justify-between ${label === 'Total' ? 'border-t border-slate-200 pt-2 text-base font-bold text-[#0B1B48]' : ''}`}>
                      <span>{label}</span>
                      <span>{formatMoney(value)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <h2 className="font-semibold text-[#0B1B48]">Status Timeline</h2>
                <div className="mt-3 space-y-2">
                  {selectedOrder.status_history?.length ? selectedOrder.status_history.map((entry) => (
                    <div key={entry.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-[#0B1B48]">{entry.status}</span>
                        <span className="text-xs text-slate-500">{formatDate(entry.created_at)}</span>
                      </div>
                      {entry.note && <p className="mt-1 text-slate-500">{entry.note}</p>}
                    </div>
                  )) : (
                    <p className="text-slate-500">No status history yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
