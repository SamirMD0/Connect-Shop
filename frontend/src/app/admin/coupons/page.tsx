'use client';

import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '../../../lib/api';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';
import { ConfirmDialog } from '../../../components/admin/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

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
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function deleteCoupon() {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/coupons/${couponToDelete.id}`);
      setCouponToDelete(null);
      addToast('Coupon deleted.', 'success');
      await fetchCoupons();
    } catch (error: unknown) {
      addToast(getErrorMessage(error, 'Failed to delete coupon.'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  const inputClasses = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15';
  const columns = [
    { header: 'Code', cell: (coupon: Coupon) => (
      <div>
        <p className="font-mono font-semibold text-[#0B1B48]">{coupon.code}</p>
        <p className="text-xs text-slate-500">{coupon.description || 'No description'}</p>
      </div>
    ) },
    { header: 'Discount', cell: (coupon: Coupon) => coupon.type === 'percent' ? `${coupon.value}%` : `$${coupon.value}` },
    { header: 'Usage', cell: (coupon: Coupon) => `${coupon.used_count}${coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}` },
    { header: 'Status', cell: (coupon: Coupon) => (
      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${coupon.is_active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
        {coupon.is_active ? 'Active' : 'Inactive'}
      </span>
    ) },
    { header: 'Actions', cell: (coupon: Coupon) => (
      <div className="flex gap-1">
        <button onClick={() => openModal(coupon)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-accent/10 hover:text-accent" aria-label={`Edit ${coupon.code}`}>
          <Edit2 className="h-4 w-4" />
        </button>
        <button onClick={() => setCouponToDelete(coupon)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${coupon.code}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage discount codes.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-glow">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <DataTable data={coupons} columns={columns} keyExtractor={(coupon) => coupon.id} emptyMessage="No coupons found" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'}>
        <form onSubmit={saveCoupon} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Code *</span>
            <input required className={inputClasses} placeholder="WELCOME10" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Description</span>
            <textarea className={inputClasses} rows={3} placeholder="Optional internal description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Type</span>
              <select className={inputClasses} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Value *</span>
              <input required type="number" min="0" step="0.01" className={inputClasses} placeholder="10" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Starts at</span>
              <input type="datetime-local" className={inputClasses} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Expires at</span>
              <input type="datetime-local" className={inputClasses} value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Usage limit</span>
            <input type="number" min="1" className={inputClasses} placeholder="Optional" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} />
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-glow">Save</button>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(couponToDelete)}
        title="Delete coupon"
        description={`Delete coupon ${couponToDelete?.code || ''}? Existing historical orders will not be changed.`}
        confirmLabel="Delete coupon"
        loading={deleting}
        onCancel={() => setCouponToDelete(null)}
        onConfirm={() => void deleteCoupon()}
      />
    </div>
  );
}
