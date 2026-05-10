'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api';
import { Order, ApiResponse } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    </div>
  );
}
