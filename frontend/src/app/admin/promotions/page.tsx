'use client';

import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Brand, Category, Product } from '../../../lib/types';
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

type LinkTargetType = 'product' | 'category' | 'brand' | 'custom';

function getPromotionLink(type: LinkTargetType, value: string): string {
  if (!value) return '';
  if (type === 'product') return `/store/${value}`;
  if (type === 'category') return `/store?category=${encodeURIComponent(value)}`;
  if (type === 'brand') return `/store?brand=${encodeURIComponent(value)}`;
  return value;
}

function parsePromotionLink(link: string | null | undefined): { type: LinkTargetType; value: string } {
  if (!link) return { type: 'product', value: '' };

  if (link.startsWith('/store/')) {
    return { type: 'product', value: link.replace('/store/', '') };
  }

  if (link.startsWith('/store?')) {
    const params = new URLSearchParams(link.replace('/store?', ''));
    const category = params.get('category');
    const brand = params.get('brand');

    if (category) return { type: 'category', value: category };
    if (brand) return { type: 'brand', value: brand };
  }

  return { type: 'custom', value: link };
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [linkTargetType, setLinkTargetType] = useState<LinkTargetType>('product');
  const [linkTargetValue, setLinkTargetValue] = useState('');
  const [productSearch, setProductSearch] = useState('');

  async function fetchPromotions() {
    const [promoRes, productRes, categoryRes, brandRes] = await Promise.all([
      api.get<{ success: boolean; promotions: Promotion[] }>('/api/admin/promotions'),
      api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { limit: 1000, sort: 'newest' },
      }).catch(() => ({ success: false, products: [] })),
      api.get<{ success: boolean; categories: Category[] }>('/api/categories').catch(() => ({ success: false, categories: [] })),
      api.get<{ success: boolean; brands: Brand[] }>('/api/admin/brands').catch(() => ({ success: false, brands: [] })),
    ]);

    if (promoRes.success) setPromotions(promoRes.promotions || []);
    if (productRes.success) setProducts(productRes.products || []);
    if (categoryRes.success) setCategories(categoryRes.categories || []);
    if (brandRes.success) setBrands(brandRes.brands || []);
  }

  useEffect(() => {
    void fetchPromotions();
  }, []);

  function openModal(promotion?: Promotion) {
    const parsedLink = parsePromotionLink(promotion?.link_url);
    setEditing(promotion || null);
    setForm(promotion ? {
      title: promotion.title,
      description: promotion.description || '',
      image_url: promotion.image_url || '',
      link_url: promotion.link_url || '',
      starts_at: toDatetimeLocal(promotion.starts_at),
      ends_at: toDatetimeLocal(promotion.ends_at),
      display_order: String(promotion.display_order),
      is_active: promotion.is_active,
    } : emptyForm);
    setLinkTargetType(parsedLink.type);
    setLinkTargetValue(parsedLink.value);
    setProductSearch('');
    setOpen(true);
  }

  async function savePromotion(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      link_url: getPromotionLink(linkTargetType, linkTargetValue) || null,
      display_order: parseInt(form.display_order || '0', 10),
      starts_at: fromDatetimeLocal(form.starts_at),
      ends_at: fromDatetimeLocal(form.ends_at),
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

  const inputClasses = 'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15';
  const filteredProducts = products
    .filter(product => {
      const term = productSearch.trim().toLowerCase();
      if (!term) return true;
      return [product.name, product.sku, product.brand, product.category_name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    })
    .slice(0, 80);
  const columns = [
    { header: 'Title', cell: (promotion: Promotion) => (
      <div>
        <p className="font-medium text-[#0B1B48]">{promotion.title}</p>
        <p className="text-xs text-slate-500">{promotion.link_url || 'No link'}</p>
      </div>
    ) },
    { header: 'Order', accessorKey: 'display_order' as keyof Promotion },
    { header: 'Status', cell: (promotion: Promotion) => (
      <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${promotion.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
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
          <h1 className="text-2xl font-bold text-[#0B1B48]">Promotions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage promotional banners beyond the homepage carousel.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <DataTable data={promotions} columns={columns} keyExtractor={(promotion) => promotion.id} />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Promotion' : 'Add Promotion'}>
        <form onSubmit={savePromotion} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Promotion title</label>
            <input required className={inputClasses} placeholder="Samsung OLED TV deal" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Description</label>
            <textarea className={inputClasses} rows={3} placeholder="Short promotion copy" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Image URL</label>
            <input className={inputClasses} placeholder="Image URL or /uploads path" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-sm font-medium text-[#0B1B48]">Promotion click target</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ['product', 'Product'],
                ['category', 'Category'],
                ['brand', 'Brand'],
                ['custom', 'Custom'],
              ] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setLinkTargetType(type);
                    setLinkTargetValue('');
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    linkTargetType === type
                      ? 'border-accent bg-accent text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:text-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {linkTargetType === 'product' && (
                <>
                  <input
                    className={inputClasses}
                    placeholder="Search products by name, SKU, brand, or category"
                    value={productSearch}
                    onChange={event => setProductSearch(event.target.value)}
                  />
                  <select
                    className={inputClasses}
                    value={linkTargetValue}
                    onChange={event => setLinkTargetValue(event.target.value)}
                  >
                    <option value="">Select product</option>
                    {filteredProducts.map(product => (
                      <option key={product.id} value={product.slug}>
                        {product.name}{product.brand ? ` - ${product.brand}` : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {linkTargetType === 'category' && (
                <select
                  className={inputClasses}
                  value={linkTargetValue}
                  onChange={event => setLinkTargetValue(event.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
              )}

              {linkTargetType === 'brand' && (
                <select
                  className={inputClasses}
                  value={linkTargetValue}
                  onChange={event => setLinkTargetValue(event.target.value)}
                >
                  <option value="">Select brand</option>
                  {brands.filter(brand => brand.is_active).map(brand => (
                    <option key={brand.id} value={brand.slug}>{brand.name}</option>
                  ))}
                </select>
              )}

              {linkTargetType === 'custom' && (
                <input
                  className={inputClasses}
                  placeholder="/store, /store?sort=rating, or https://example.com"
                  value={linkTargetValue}
                  onChange={event => setLinkTargetValue(event.target.value)}
                />
              )}

              <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500">
                Link preview: <span className="font-medium text-[#0B1B48]">{getPromotionLink(linkTargetType, linkTargetValue) || 'No link selected'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Starts at</label>
              <input type="datetime-local" className={inputClasses} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Ends at</label>
              <input type="datetime-local" className={inputClasses} value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Display order</label>
            <input type="number" className={inputClasses} placeholder="0" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white">Save</button>
        </form>
      </Modal>
    </div>
  );
}
