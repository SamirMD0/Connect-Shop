'use client';

import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

interface Promotion {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  is_active: boolean;
}

const emptyForm = {
  title: '',
  description: '',
  image_url: '',
  link_url: '',
  starts_at: '',
  ends_at: '',
  display_order: '0',
  is_active: true,
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);

  async function fetchPromotions() {
    const res = await api.get<{ success: boolean; promotions: Promotion[] }>('/api/admin/promotions');
    if (res.success) setPromotions(res.promotions || []);
  }

  useEffect(() => {
    void fetchPromotions();
  }, []);

  function openModal(promotion?: Promotion) {
    setEditing(promotion || null);
    setForm(promotion ? {
      title: promotion.title,
      description: promotion.description || '',
      image_url: promotion.image_url || '',
      link_url: promotion.link_url || '',
      starts_at: promotion.starts_at?.slice(0, 16) || '',
      ends_at: promotion.ends_at?.slice(0, 16) || '',
      display_order: String(promotion.display_order),
      is_active: promotion.is_active,
    } : emptyForm);
    setOpen(true);
  }

  async function savePromotion(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      display_order: parseInt(form.display_order || '0', 10),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    if (editing) {
      await api.put(`/api/admin/promotions/${editing.id}`, payload);
    } else {
      await api.post('/api/admin/promotions', payload);
    }
    setOpen(false);
    await fetchPromotions();
  }

  async function deletePromotion(id: number) {
    if (!confirm('Delete this promotion?')) return;
    await api.delete(`/api/admin/promotions/${id}`);
    await fetchPromotions();
  }

  const inputClasses = 'w-full rounded-xl border border-[#1e293b] bg-[#0a0a14] px-4 py-3 text-white outline-none focus:border-accent';
  const columns = [
    { header: 'Title', cell: (promotion: Promotion) => (
      <div>
        <p className="font-medium text-white">{promotion.title}</p>
        <p className="text-xs text-slate-500">{promotion.link_url || 'No link'}</p>
      </div>
    ) },
    { header: 'Order', accessorKey: 'display_order' as keyof Promotion },
    { header: 'Status', cell: (promotion: Promotion) => (
      <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${promotion.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
        {promotion.is_active ? 'Active' : 'Inactive'}
      </span>
    ) },
    { header: 'Actions', cell: (promotion: Promotion) => (
      <div className="flex gap-1">
        <button onClick={() => openModal(promotion)} className="rounded-lg p-2 text-slate-400 hover:bg-accent/10 hover:text-accent">
          <Edit2 className="h-4 w-4" />
        </button>
        <button onClick={() => void deletePromotion(promotion.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-400/10 hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions</h1>
          <p className="mt-1 text-sm text-slate-400">Manage promotional banners beyond the homepage carousel.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <DataTable data={promotions} columns={columns} keyExtractor={(promotion) => promotion.id} />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Promotion' : 'Add Promotion'}>
        <form onSubmit={savePromotion} className="space-y-4">
          <input required className={inputClasses} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea className={inputClasses} rows={3} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className={inputClasses} placeholder="Image URL or /uploads path" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
          <input className={inputClasses} placeholder="Link URL" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="datetime-local" className={inputClasses} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            <input type="datetime-local" className={inputClasses} value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
          </div>
          <input type="number" className={inputClasses} placeholder="Display order" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} />
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
