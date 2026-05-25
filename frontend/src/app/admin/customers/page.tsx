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
    { header: 'ID', cell: (u: User) => <span className="text-xs text-muted font-mono">{u.id}</span> },
    { header: 'Name', accessorKey: 'name' as keyof User },
    { header: 'Email', accessorKey: 'email' as keyof User },
    { header: 'Role', cell: (u: User) => (
      <select
        value={u.role}
        onChange={(event) => void updateRole(u.id, event.target.value)}
        className={`rounded-lg border border-[#1e293b] px-2 py-1 text-xs font-medium outline-none ${['admin', 'super_admin'].includes(u.role) ? 'bg-accent/20 text-accent' : 'bg-slate-800 text-slate-300'}`}
      >
        {roles.map(role => <option key={role} value={role} className="bg-slate-900 text-white">{role}</option>)}
      </select>
    )},
    { header: 'Actions', cell: (u: User) => (
      <button onClick={() => void openDetail(u)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-accent/10 hover:text-accent">
        <Eye className="h-4 w-4" />
        View
      </button>
    )},
  ];

  if (loading) return <div className="text-white">Loading customers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Customers</h1>
      </div>
      <DataTable data={users} columns={columns} keyExtractor={(u) => u.id} />

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Customer Detail">
        {selectedDetail && (
          <div className="space-y-5 text-sm">
            <div className="rounded-xl border border-[#1e293b] bg-[#0a0a14] p-4">
              <p className="font-semibold text-white">{selectedDetail.user.name}</p>
              <p className="text-slate-400">{selectedDetail.user.email}</p>
              <p className="mt-2 text-slate-500">Role: {selectedDetail.user.role}</p>
              <p className="text-slate-500">Orders: {selectedDetail.totals.order_count} · Total spent: ${selectedDetail.totals.total_spent}</p>
            </div>

            <section>
              <h2 className="mb-2 font-semibold text-white">Addresses</h2>
              <div className="space-y-2">
                {selectedDetail.addresses.map((address: any) => (
                  <div key={address.id} className="rounded-lg border border-[#1e293b] p-3 text-slate-300">
                    {address.recipient_name}, {address.address_line1}, {address.city}, {address.country}
                  </div>
                ))}
                {selectedDetail.addresses.length === 0 && <p className="text-slate-500">No saved addresses.</p>}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-white">Recent Orders</h2>
              <div className="space-y-2">
                {selectedDetail.orders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-[#1e293b] p-3 text-slate-300">
                    <span className="font-mono">{String(order.id).slice(0, 8)}</span>
                    <span>{order.status}</span>
                    <span>${order.total}</span>
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
