'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { api } from '../../../lib/api';
import { Order } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    tracking_carrier: '',
    tracking_number: '',
    tracking_url: '',
    estimated_delivery_date: '',
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; orders: Order[]; totalPages: number }>('/api/admin/orders', {
        params: { page, limit: 10 }
      });
      if (res.success && res.orders) {
        setOrders(res.orders);
        setTotalPages(res.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    const res = await api.get<{ success: boolean; order: any }>(`/api/admin/orders/${orderId}`);
    if (res.success) {
      setSelectedOrder(res.order);
      setTrackingForm({
        tracking_carrier: res.order.tracking_carrier || '',
        tracking_number: res.order.tracking_number || '',
        tracking_url: res.order.tracking_url || '',
        estimated_delivery_date: res.order.estimated_delivery_date?.slice(0, 10) || '',
      });
      setDetailOpen(true);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await api.put(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
    } catch (error: any) {
      alert(error.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveTracking = async () => {
    if (!selectedOrder) return;
    const res = await api.put<{ success: boolean; order: any }>(`/api/admin/orders/${selectedOrder.id}/tracking`, trackingForm);
    if (res.success) {
      setSelectedOrder({ ...selectedOrder, ...res.order });
      await fetchOrders();
    }
  };

  const updateReturnStatus = async (returnId: string, status: string) => {
    await api.put(`/api/admin/returns/${returnId}/status`, { status });
    if (selectedOrder) {
      await openOrderDetail(selectedOrder.id);
    }
  };

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-warning/20 text-warning',
    shipped: 'bg-purple-500/20 text-purple-400',
    delivered: 'bg-success/20 text-success',
    cancelled: 'bg-danger/20 text-danger',
  };

  const columns = [
    { header: 'Order ID', cell: (o: Order) => <span className="text-xs text-muted font-mono">{o.id.substring(0, 8)}...</span> },
    { header: 'Customer', cell: (o: Order) => (
      <div className="flex flex-col">
        <span className="font-medium text-primary">{(o as any).customer_name}</span>
        <span className="text-xs text-muted">{(o as any).customer_email}</span>
      </div>
    )},
    { header: 'Items', accessorKey: 'item_count' as keyof Order },
    { header: 'Total', cell: (o: Order) => `$${o.total}` },
    { header: 'Date', cell: (o: Order) => new Date(o.created_at).toLocaleDateString() },
    { header: 'Status', cell: (o: Order) => (
      <select 
        className={`px-2 py-1 rounded-full text-xs font-medium border border-transparent hover:border-slate-600 focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer ${statusColors[o.status] || 'bg-slate-800 text-slate-300'}`}
        value={o.status}
        onChange={(e) => handleStatusChange(o.id, e.target.value)}
        disabled={updatingId === o.id}
      >
        <option value="confirmed" className="bg-slate-900 text-white">Confirmed</option>
        <option value="processing" className="bg-slate-900 text-white">Processing</option>
        <option value="shipped" className="bg-slate-900 text-white">Shipped</option>
        <option value="delivered" className="bg-slate-900 text-white">Delivered</option>
        <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
      </select>
    )},
    { header: 'Actions', cell: (o: Order) => (
      <button onClick={() => void openOrderDetail(o.id)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-accent/10 hover:text-accent">
        <Eye className="h-4 w-4" />
        View
      </button>
    )},
  ];

  if (loading) return <div className="text-white">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Orders</h1>
      </div>
      <DataTable data={orders} columns={columns} keyExtractor={(o) => o.id} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#1e293b] pt-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1e293b] disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1e293b] disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Order Detail">
        {selectedOrder && (
          <div className="space-y-5 text-sm">
            <div className="rounded-xl border border-[#1e293b] bg-[#0a0a14] p-4">
              <p className="font-mono text-white">{selectedOrder.id}</p>
              <p className="mt-2 text-slate-400">{selectedOrder.customer_name} · {selectedOrder.customer_email}</p>
              <p className="text-slate-500">Status: {selectedOrder.status} · Payment: {selectedOrder.payment_status}</p>
              <p className="mt-2 text-lg font-semibold text-accent">${selectedOrder.total}</p>
            </div>

            <section>
              <h2 className="mb-2 font-semibold text-white">Shipping</h2>
              <div className="rounded-lg border border-[#1e293b] p-3 text-slate-300">
                {selectedOrder.shipping_address?.fullName}<br />
                {selectedOrder.shipping_address?.addressLine1}<br />
                {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.country}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-white">Tracking</h2>
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#1e293b] p-3 sm:grid-cols-2">
                <input className="rounded-lg border border-[#1e293b] bg-[#0a0a14] px-3 py-2 text-white outline-none focus:border-accent" placeholder="Carrier" value={trackingForm.tracking_carrier} onChange={e => setTrackingForm({ ...trackingForm, tracking_carrier: e.target.value })} />
                <input className="rounded-lg border border-[#1e293b] bg-[#0a0a14] px-3 py-2 text-white outline-none focus:border-accent" placeholder="Tracking number" value={trackingForm.tracking_number} onChange={e => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })} />
                <input className="rounded-lg border border-[#1e293b] bg-[#0a0a14] px-3 py-2 text-white outline-none focus:border-accent" placeholder="Tracking URL" value={trackingForm.tracking_url} onChange={e => setTrackingForm({ ...trackingForm, tracking_url: e.target.value })} />
                <input type="date" className="rounded-lg border border-[#1e293b] bg-[#0a0a14] px-3 py-2 text-white outline-none focus:border-accent" value={trackingForm.estimated_delivery_date} onChange={e => setTrackingForm({ ...trackingForm, estimated_delivery_date: e.target.value })} />
                <button onClick={() => void saveTracking()} className="rounded-lg bg-accent px-4 py-2 font-medium text-white sm:col-span-2">
                  Save tracking
                </button>
              </div>
            </section>

            {selectedOrder.status_history?.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold text-white">Timeline</h2>
                <div className="space-y-2">
                  {selectedOrder.status_history.map((entry: any) => (
                    <div key={entry.id} className="flex justify-between gap-3 rounded-lg border border-[#1e293b] p-3 text-slate-300">
                      <span>{entry.status}</span>
                      <span className="text-slate-500">{entry.note || new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {selectedOrder.return_requests?.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold text-white">Returns</h2>
                <div className="space-y-2">
                  {selectedOrder.return_requests.map((request: any) => (
                    <div key={request.id} className="flex flex-col gap-2 rounded-lg border border-[#1e293b] p-3 text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p>{request.reason}</p>
                        <p className="text-xs text-slate-500">{request.customer_email || 'Customer'} · {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                      <select
                        value={request.status}
                        onChange={e => void updateReturnStatus(request.id, e.target.value)}
                        className="rounded-lg border border-[#1e293b] bg-[#0a0a14] px-3 py-2 text-sm text-white outline-none focus:border-accent"
                      >
                        <option value="requested">Requested</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-2 font-semibold text-white">Items</h2>
              <div className="space-y-2">
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1e293b] p-3 text-slate-300">
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      {item.variant_name && <p className="text-xs text-slate-500">{item.variant_name}</p>}
                    </div>
                    <span>Qty {item.quantity}</span>
                    <span>${item.price_at_purchase}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
