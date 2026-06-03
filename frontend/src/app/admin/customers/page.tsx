'use client';

import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { api } from '../../../lib/api';
import { User, ApiResponse } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

const roles = ['customer', 'support', 'manager', 'admin', 'super_admin'];

export default function AdminCustomers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get<ApiResponse<{ users: User[] }>>('/api/admin/users');
        if (res.success) {
          setUsers(res.data?.users || res.users || []);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  async function updateRole(userId: string, role: string) {
    const res = await api.put<{ success: boolean; user: User }>(`/api/admin/users/${userId}/role`, { role });
    if (res.success) {
      setUsers(current => current.map(user => user.id === userId ? { ...user, role: res.user.role } : user));
      if (selectedDetail?.user?.id === userId) {
        setSelectedDetail({ ...selectedDetail, user: { ...selectedDetail.user, role: res.user.role } });
      }
    }
  }

  async function openDetail(user: User) {
    const res = await api.get<{ success: boolean; user: any; addresses: any[]; orders: any[]; totals: any }>(`/api/admin/users/${user.id}`);
    if (res.success) {
      setSelectedDetail(res);
      setDetailOpen(true);
    }
  }

  const columns = [
    { header: 'ID', cell: (u: User) => <span className="font-mono text-xs text-slate-500">{u.id.slice(0, 8)}</span> },
    { header: 'Name', cell: (u: User) => <span className="font-semibold text-[#0B1B48]">{u.name}</span> },
    { header: 'Email', cell: (u: User) => <span className="text-slate-600">{u.email}</span> },
    { header: 'Role', cell: (u: User) => (
      <select
        value={u.role}
        onChange={(event) => void updateRole(u.id, event.target.value)}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors focus:border-accent ${
          ['admin', 'super_admin'].includes(u.role)
            ? 'border-accent/20 bg-accent/10 text-accent'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {roles.map(role => <option key={role} value={role}>{role}</option>)}
      </select>
    )},
    { header: 'Actions', cell: (u: User) => (
      <button onClick={() => void openDetail(u)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-accent/10 hover:text-accent">
        <Eye className="h-4 w-4" />
        View
      </button>
    )},
  ];

  if (loading) return <DataTable data={[]} columns={columns} keyExtractor={(u) => u.id} loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Review customer profiles, roles, addresses, and recent orders.</p>
        </div>
      </div>
      <DataTable data={users} columns={columns} keyExtractor={(u) => u.id} emptyMessage="No customers found" />

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Customer Detail">
        {selectedDetail && (
          <div className="space-y-5 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-[#0B1B48]">{selectedDetail.user.name}</p>
              <p className="text-slate-600">{selectedDetail.user.email}</p>
              <div className="mt-3 grid gap-2 rounded-lg bg-white p-3 text-xs text-slate-500 sm:grid-cols-2">
                <span>Role: <strong className="text-[#0B1B48]">{selectedDetail.user.role}</strong></span>
                <span>Orders: <strong className="text-[#0B1B48]">{selectedDetail.totals.order_count}</strong></span>
                <span className="sm:col-span-2">Total spent: <strong className="text-[#0B1B48]">${selectedDetail.totals.total_spent}</strong></span>
              </div>
            </div>

            <section>
              <h2 className="mb-2 font-semibold text-[#0B1B48]">Addresses</h2>
              <div className="space-y-2">
                {selectedDetail.addresses.map((address: any) => (
                  <div key={address.id} className="rounded-lg border border-slate-200 bg-white p-3 text-slate-600">
                    {address.recipient_name}, {address.address_line1}, {address.city}, {address.country}
                  </div>
                ))}
                {selectedDetail.addresses.length === 0 && <p className="text-slate-500">No saved addresses.</p>}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-[#0B1B48]">Recent Orders</h2>
              <div className="space-y-2">
                {selectedDetail.orders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-600">
                    <span className="font-mono">{String(order.id).slice(0, 8)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-600">{order.status}</span>
                    <span className="font-semibold text-[#0B1B48]">${order.total}</span>
                  </div>
                ))}
                {selectedDetail.orders.length === 0 && <p className="text-slate-500">No orders yet.</p>}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
