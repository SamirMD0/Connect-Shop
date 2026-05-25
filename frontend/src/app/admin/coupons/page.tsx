'use client';

import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

interface Coupon {
  id: number;
  code: string;
  description: string | null;
  type: 'percent' | 'fixed';
  value: string;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

interface CouponForm {
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: string;
  starts_at: string;
  expires_at: string;
  usage_limit: string;
  is_active: boolean;
}

const emptyForm: CouponForm = {
  code: '',
  description: '',
  type: 'percent' as const,
  value: '',
  starts_at: '',
  expires_at: '',
  usage_limit: '',
  is_active: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);

  async function fetchCoupons() {
    const res = await api.get<{ success: boolean; coupons: Coupon[] }>('/api/admin/coupons');
    if (res.success) setCoupons(res.coupons || []);
  }

  useEffect(() => {
    void fetchCoupons();
  }, []);

  function openModal(coupon?: Coupon) {
    setEditing(coupon || null);
    setForm(coupon ? {
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: String(coupon.value),
      starts_at: coupon.starts_at?.slice(0, 16) || '',
      expires_at: coupon.expires_at?.slice(0, 16) || '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      is_active: coupon.is_active,
    } : emptyForm);
    setOpen(true);
  }

  async function saveCoupon(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      value: parseFloat(form.value),
      usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
    };

    if (editing) {
      await api.put(`/api/admin/coupons/${editing.id}`, payload);
    } else {
      await api.post('/api/admin/coupons', payload);
    }
    setOpen(false);
    await fetchCoupons();
  }

  async function deleteCoupon(id: number) {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/api/admin/coupons/${id}`);
    await fetchCoupons();
  }

  const inputClasses = 'w-full rounded-xl border border-[#1e293b] bg-[#0a0a14] px-4 py-3 text-white outline-none focus:border-accent';
  const columns = [
    { header: 'Code', cell: (coupon: Coupon) => (
      <div>
        <p className="font-mono font-semibold text-white">{coupon.code}</p>
        <p className="text-xs text-slate-500">{coupon.description || 'No description'}</p>
      </div>
    ) },
    { header: 'Discount', cell: (coupon: Coupon) => coupon.type === 'percent' ? `${coupon.value}%` : `$${coupon.value}` },
    { header: 'Usage', cell: (coupon: Coupon) => `${coupon.used_count}${coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}` },
    { header: 'Status', cell: (coupon: Coupon) => (
      <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${coupon.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
        {coupon.is_active ? 'Active' : 'Inactive'}
      </span>
    ) },
    { header: 'Actions', cell: (coupon: Coupon) => (
      <div className="flex gap-1">
        <button onClick={() => openModal(coupon)} className="rounded-lg p-2 text-slate-400 hover:bg-accent/10 hover:text-accent">
          <Edit2 className="h-4 w-4" />
        </button>
        <button onClick={() => void deleteCoupon(coupon.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-400/10 hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Coupons</h1>
          <p className="mt-1 text-sm text-slate-400">Create and manage discount codes.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <DataTable data={coupons} columns={columns} keyExtractor={(coupon) => coupon.id} />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'}>
        <form onSubmit={saveCoupon} className="space-y-4">
          <input required className={inputClasses} placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <textarea className={inputClasses} rows={3} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select className={inputClasses} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input required type="number" min="0" step="0.01" className={inputClasses} placeholder="Value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="datetime-local" className={inputClasses} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            <input type="datetime-local" className={inputClasses} value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <input type="number" min="1" className={inputClasses} placeholder="Usage limit" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} />
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white">Save</button>
        </form>
      </Modal>
    </div>
  );
}
