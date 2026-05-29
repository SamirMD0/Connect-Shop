'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Edit2, ImageIcon, LayoutGrid, List, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Brand, Category, HomepageSection, HomepageSectionItem, Product } from '../../../lib/types';
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

interface TopPromoForm {
  title: string;
  description: string;
  image_url: string;
  button_link: string;
  sort_order: string;
  is_active: boolean;
}

interface CountdownForm {
  title: string;
  eyebrow: string;
  description: string;
  background_image_url: string;
  button_text: string;
  button_link: string;
  end_date: string;
  sort_order: string;
  is_active: boolean;
}

const emptyTopPromoForm: TopPromoForm = {
  title: '',
  description: '',
  image_url: '',
  button_link: '',
  sort_order: '0',
  is_active: true,
};

const emptyCountdownForm: CountdownForm = {
  title: '',
  eyebrow: '',
  description: '',
  background_image_url: '',
  button_text: '',
  button_link: '',
  end_date: '',
  sort_order: '0',
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

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function topPromoToForm(promo?: HomepageSectionItem | null): TopPromoForm {
  if (!promo) return emptyTopPromoForm;

  return {
    title: promo.title || '',
    description: promo.description || getMetadataString(promo.metadata, 'savings'),
    image_url: promo.image_url || '',
    button_link: promo.button_link || '',
    sort_order: String(promo.sort_order ?? 0),
    is_active: promo.is_active,
  };
}

function countdownToForm(section?: HomepageSection | null): CountdownForm {
  if (!section) return emptyCountdownForm;

  return {
    title: section.title || '',
    eyebrow: section.eyebrow || section.subtitle || getMetadataString(section.metadata, 'eyebrow'),
    description: section.description || '',
    background_image_url: section.background_image_url || '',
    button_text: section.button_text || '',
    button_link: section.button_link || '',
    end_date: toDatetimeLocal(getMetadataString(section.metadata, 'end_date') || getMetadataString(section.metadata, 'endDate')),
    sort_order: String(section.sort_order ?? 0),
    is_active: section.is_active,
  };
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [topPromoOpen, setTopPromoOpen] = useState(false);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [editingTopPromo, setEditingTopPromo] = useState<HomepageSectionItem | null>(null);
  const [topPromoForm, setTopPromoForm] = useState<TopPromoForm>(emptyTopPromoForm);
  const [countdownForm, setCountdownForm] = useState<CountdownForm>(emptyCountdownForm);
  const [topLinkTargetType, setTopLinkTargetType] = useState<LinkTargetType>('product');
  const [topLinkTargetValue, setTopLinkTargetValue] = useState('');
  const [topProductSearch, setTopProductSearch] = useState('');
  const [countdownLinkTargetType, setCountdownLinkTargetType] = useState<LinkTargetType>('product');
  const [countdownLinkTargetValue, setCountdownLinkTargetValue] = useState('');
  const [countdownProductSearch, setCountdownProductSearch] = useState('');
  const [linkTargetType, setLinkTargetType] = useState<LinkTargetType>('product');
  const [linkTargetValue, setLinkTargetValue] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  async function fetchPromotions() {
    const [promoRes, homepageRes, productRes, categoryRes, brandRes] = await Promise.all([
      api.get<{ success: boolean; promotions: Promotion[] }>('/api/admin/promotions'),
      api.get<{ success: boolean; sections: HomepageSection[] }>('/api/admin/homepage').catch(() => ({ success: false, sections: [] })),
      api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { limit: 1000, sort: 'newest' },
      }).catch(() => ({ success: false, products: [] })),
      api.get<{ success: boolean; categories: Category[] }>('/api/categories').catch(() => ({ success: false, categories: [] })),
      api.get<{ success: boolean; brands: Brand[] }>('/api/admin/brands').catch(() => ({ success: false, brands: [] })),
    ]);

    if (promoRes.success) setPromotions(promoRes.promotions || []);
    if (homepageRes.success) setHomepageSections(homepageRes.sections || []);
    if (productRes.success) setProducts(productRes.products || []);
    if (categoryRes.success) setCategories(categoryRes.categories || []);
    if (brandRes.success) setBrands(brandRes.brands || []);
  }

  useEffect(() => {
    void fetchPromotions();
  }, []);

  const topPromoSection = homepageSections.find(section => section.section_key === 'hero_side_promo') || null;
  const topPromos = (topPromoSection?.items || []).sort((a, b) => a.sort_order - b.sort_order);
  const countdownSection = homepageSections.find(section => section.section_key === 'countdown_promo') || null;

  async function ensureHomepageSection(sectionKey: string, sectionType: string, title: string, sortOrder: number) {
    const existing = homepageSections.find(section => section.section_key === sectionKey);
    if (existing) return existing;

    const response = await api.post<{ success: boolean; section: HomepageSection }>('/api/admin/homepage/sections', {
      section_key: sectionKey,
      section_type: sectionType,
      title,
      sort_order: sortOrder,
      is_active: true,
      metadata: {},
    });

    return response.section;
  }

  function openTopPromoModal(promo?: HomepageSectionItem) {
    const parsedLink = parsePromotionLink(promo?.button_link);
    setEditingTopPromo(promo || null);
    setTopPromoForm(topPromoToForm(promo));
    setTopLinkTargetType(parsedLink.type);
    setTopLinkTargetValue(parsedLink.value);
    setTopProductSearch('');
    setTopPromoOpen(true);
  }

  async function saveTopPromo(event: React.FormEvent) {
    event.preventDefault();
    const section = await ensureHomepageSection('hero_side_promo', 'card_grid', 'Top promo', 10);
    const payload = {
      title: topPromoForm.title.trim() || null,
      subtitle: null,
      description: topPromoForm.description.trim() || null,
      button_link: getPromotionLink(topLinkTargetType, topLinkTargetValue) || null,
      image_url: topPromoForm.image_url.trim() || null,
      sort_order: parseInt(topPromoForm.sort_order || '0', 10),
      is_active: topPromoForm.is_active,
      metadata: {},
    };

    if (editingTopPromo) {
      await api.put(`/api/admin/homepage/items/${editingTopPromo.id}`, payload);
    } else {
      await api.post(`/api/admin/homepage/sections/${section.id}/items`, payload);
    }

    setTopPromoOpen(false);
    await fetchPromotions();
  }

  async function deleteTopPromo(id: string) {
    if (!confirm('Delete this top promo?')) return;
    await api.delete(`/api/admin/homepage/items/${id}`);
    await fetchPromotions();
  }

  function openCountdownModal() {
    const parsedLink = parsePromotionLink(countdownSection?.button_link);
    setCountdownForm(countdownToForm(countdownSection));
    setCountdownLinkTargetType(parsedLink.type);
    setCountdownLinkTargetValue(parsedLink.value);
    setCountdownProductSearch('');
    setCountdownOpen(true);
  }

  async function saveCountdownPromo(event: React.FormEvent) {
    event.preventDefault();
    const endDate = fromDatetimeLocal(countdownForm.end_date);
    const payload = {
      section_key: 'countdown_promo',
      section_type: 'countdown',
      title: countdownForm.title.trim() || null,
      subtitle: countdownForm.eyebrow.trim() || null,
      eyebrow: countdownForm.eyebrow.trim() || null,
      description: countdownForm.description.trim() || null,
      button_text: countdownForm.button_text.trim() || null,
      button_link: getPromotionLink(countdownLinkTargetType, countdownLinkTargetValue) || null,
      image_url: null,
      background_image_url: countdownForm.background_image_url.trim() || null,
      sort_order: parseInt(countdownForm.sort_order || '0', 10),
      is_active: countdownForm.is_active,
      metadata: endDate ? { end_date: endDate } : {},
    };

    if (countdownSection) {
      await api.put(`/api/admin/homepage/sections/${countdownSection.id}`, payload);
    } else {
      await api.post('/api/admin/homepage/sections', payload);
    }

    setCountdownOpen(false);
    await fetchPromotions();
  }

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
  const renderPromotionImage = (promotion: Promotion, size: 'table' | 'grid' = 'table') => {
    const frameClasses = size === 'grid'
      ? 'relative aspect-[16/9] overflow-hidden rounded-lg border border-slate-200 bg-white'
      : 'relative h-14 w-24 overflow-hidden rounded-lg border border-slate-200 bg-white';

    return (
      <div className={frameClasses}>
        {promotion.image_url ? (
          <Image
            src={promotion.image_url}
            alt={promotion.title}
            fill
            sizes={size === 'grid' ? '(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 90vw' : '96px'}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon className={size === 'grid' ? 'h-10 w-10' : 'h-5 w-5'} />
          </div>
        )}
      </div>
    );
  };

  const renderHomepageImage = (
    imageUrl: string | null | undefined,
    alt: string,
    size: 'wide' | 'square' = 'wide'
  ) => (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white ${size === 'wide' ? 'aspect-[16/9]' : 'aspect-square'}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300">
          <ImageIcon className="h-10 w-10" />
        </div>
      )}
    </div>
  );

  const renderPromotionStatus = (promotion: Promotion) => (
    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${promotion.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {promotion.is_active ? 'Active' : 'Inactive'}
    </span>
  );

  const renderPromotionActions = (promotion: Promotion) => (
    <div className="flex gap-1">
      <button
        onClick={() => openModal(promotion)}
        className="rounded-lg p-2 text-slate-400 hover:bg-accent/10 hover:text-accent"
        aria-label={`Edit ${promotion.title}`}
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => void deletePromotion(promotion.id)}
        className="rounded-lg p-2 text-slate-400 hover:bg-red-400/10 hover:text-red-400"
        aria-label={`Delete ${promotion.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const filteredProducts = products
    .filter(product => {
      const term = productSearch.trim().toLowerCase();
      if (!term) return true;
      return [product.name, product.sku, product.brand, product.category_name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    })
    .slice(0, 80);
  const filteredTopProducts = products
    .filter(product => {
      const term = topProductSearch.trim().toLowerCase();
      if (!term) return true;
      return [product.name, product.sku, product.brand, product.category_name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    })
    .slice(0, 80);
  const filteredCountdownProducts = products
    .filter(product => {
      const term = countdownProductSearch.trim().toLowerCase();
      if (!term) return true;
      return [product.name, product.sku, product.brand, product.category_name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    })
    .slice(0, 80);
  const columns = [
    { header: 'Image', cell: (promotion: Promotion) => renderPromotionImage(promotion) },
    { header: 'Title', cell: (promotion: Promotion) => (
      <div>
        <p className="font-medium text-[#0B1B48]">{promotion.title}</p>
        <p className="text-xs text-slate-500">{promotion.link_url || 'No link'}</p>
      </div>
    ) },
    { header: 'Order', accessorKey: 'display_order' as keyof Promotion },
    { header: 'Status', cell: (promotion: Promotion) => renderPromotionStatus(promotion) },
    { header: 'Actions', cell: (promotion: Promotion) => renderPromotionActions(promotion) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Promotions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage top promos, middle promo banners, and the countdown promo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-accent'
              }`}
              aria-pressed={viewMode === 'table'}
            >
              <List className="h-4 w-4" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-accent'
              }`}
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
          </div>
          <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/80">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0B1B48]">Top promo</h2>
            <p className="text-sm text-slate-500">The two promo cards beside the homepage carousel.</p>
          </div>
          <button
            onClick={() => openTopPromoModal()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent"
          >
            <Plus className="h-4 w-4" />
            Add Top Promo
          </button>
        </div>

        {topPromos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {topPromos.map((promo) => (
              <article key={promo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
                {renderHomepageImage(promo.image_url, promo.title || 'Top promo')}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-semibold text-[#0B1B48]">{promo.title || 'Untitled top promo'}</h3>
                      <p className="mt-1 truncate text-xs text-slate-500">{promo.button_link || 'No link'}</p>
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${promo.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {(promo.subtitle || promo.description) && (
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {[promo.subtitle, promo.description].filter(Boolean).join(' ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs text-slate-500">Order {promo.sort_order}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openTopPromoModal(promo)} className="rounded-lg p-2 text-slate-400 hover:bg-accent/10 hover:text-accent" aria-label={`Edit ${promo.title || 'top promo'}`}>
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => void deleteTopPromo(promo.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-400/10 hover:text-red-400" aria-label={`Delete ${promo.title || 'top promo'}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No top promos yet. Add one or two cards to show beside the carousel.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/80">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0B1B48]">Countdown promo</h2>
            <p className="text-sm text-slate-500">The countdown promotion section below best sellers.</p>
          </div>
          <button
            onClick={openCountdownModal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent"
          >
            <Edit2 className="h-4 w-4" />
            {countdownSection ? 'Edit Countdown' : 'Create Countdown'}
          </button>
        </div>

        {countdownSection ? (
          <article className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[280px_1fr]">
            {renderHomepageImage(countdownSection.background_image_url, countdownSection.title || 'Countdown promo')}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#0B1B48]">{countdownSection.title || 'Untitled countdown promo'}</h3>
                  <p className="mt-1 text-sm text-slate-500">{countdownSection.eyebrow || countdownSection.subtitle || 'No eyebrow'}</p>
                </div>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${countdownSection.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {countdownSection.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {countdownSection.description && <p className="text-sm leading-6 text-slate-600">{countdownSection.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-600">
                  Link {countdownSection.button_link || '/store'}
                </span>
                {getMetadataString(countdownSection.metadata, 'end_date') && (
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-600">
                    Ends {new Date(getMetadataString(countdownSection.metadata, 'end_date')).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </article>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No countdown promo saved yet. The homepage is using its fallback countdown section.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0B1B48]">Middle promo</h2>
          <p className="text-sm text-slate-500">The two image banners below the New Arrivals section.</p>
        </div>

      {viewMode === 'table' ? (
        <DataTable data={promotions} columns={columns} keyExtractor={(promotion) => promotion.id} emptyMessage="No promotions found" />
      ) : promotions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promotion) => (
            <article key={promotion.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
              {renderPromotionImage(promotion, 'grid')}
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold text-[#0B1B48]">{promotion.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{promotion.link_url || 'No link'}</p>
                  </div>
                  {renderPromotionStatus(promotion)}
                </div>

                {promotion.description && (
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">{promotion.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-slate-600">
                    Order {promotion.display_order}
                  </span>
                  {promotion.starts_at && (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                      Starts {new Date(promotion.starts_at).toLocaleDateString()}
                    </span>
                  )}
                  {promotion.ends_at && (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                      Ends {new Date(promotion.ends_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end border-t border-slate-200 pt-3">
                  {renderPromotionActions(promotion)}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm shadow-slate-200/80">
          <p className="text-sm font-medium text-slate-500">No promotions found</p>
        </div>
      )}
      </section>

      <Modal isOpen={topPromoOpen} onClose={() => setTopPromoOpen(false)} title={editingTopPromo ? 'Edit Top Promo' : 'Add Top Promo'}>
        <form onSubmit={saveTopPromo} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Promotion title</label>
            <input
              required
              className={inputClasses}
              placeholder="Samsung MicroLED"
              value={topPromoForm.title}
              onChange={event => setTopPromoForm({ ...topPromoForm, title: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Description</label>
            <textarea
              rows={3}
              className={inputClasses}
              placeholder="Short promotion copy"
              value={topPromoForm.description}
              onChange={event => setTopPromoForm({ ...topPromoForm, description: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Image URL</label>
            <input
              className={inputClasses}
              placeholder="Image URL or /uploads path"
              value={topPromoForm.image_url}
              onChange={event => setTopPromoForm({ ...topPromoForm, image_url: event.target.value })}
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-sm font-medium text-[#0B1B48]">Top promo click target</label>
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
                    setTopLinkTargetType(type);
                    setTopLinkTargetValue('');
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    topLinkTargetType === type
                      ? 'border-accent bg-accent text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:text-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {topLinkTargetType === 'product' && (
                <>
                  <input
                    className={inputClasses}
                    placeholder="Search products by name, SKU, brand, or category"
                    value={topProductSearch}
                    onChange={event => setTopProductSearch(event.target.value)}
                  />
                  <select
                    className={inputClasses}
                    value={topLinkTargetValue}
                    onChange={event => setTopLinkTargetValue(event.target.value)}
                  >
                    <option value="">Select product</option>
                    {filteredTopProducts.map(product => (
                      <option key={product.id} value={product.slug}>
                        {product.name}{product.brand ? ` - ${product.brand}` : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {topLinkTargetType === 'category' && (
                <select
                  className={inputClasses}
                  value={topLinkTargetValue}
                  onChange={event => setTopLinkTargetValue(event.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
              )}

              {topLinkTargetType === 'brand' && (
                <select
                  className={inputClasses}
                  value={topLinkTargetValue}
                  onChange={event => setTopLinkTargetValue(event.target.value)}
                >
                  <option value="">Select brand</option>
                  {brands.filter(brand => brand.is_active).map(brand => (
                    <option key={brand.id} value={brand.slug}>{brand.name}</option>
                  ))}
                </select>
              )}

              {topLinkTargetType === 'custom' && (
                <input
                  className={inputClasses}
                  placeholder="/store, /store?sort=rating, or https://example.com"
                  value={topLinkTargetValue}
                  onChange={event => setTopLinkTargetValue(event.target.value)}
                />
              )}

              <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500">
                Link preview: <span className="font-medium text-[#0B1B48]">{getPromotionLink(topLinkTargetType, topLinkTargetValue) || 'No link selected'}</span>
              </p>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Display order</label>
            <input
              type="number"
              className={inputClasses}
              placeholder="0"
              value={topPromoForm.sort_order}
              onChange={event => setTopPromoForm({ ...topPromoForm, sort_order: event.target.value })}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={topPromoForm.is_active}
              onChange={event => setTopPromoForm({ ...topPromoForm, is_active: event.target.checked })}
            />
            Active
          </label>
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white">
            Save Top Promo
          </button>
        </form>
      </Modal>

      <Modal isOpen={countdownOpen} onClose={() => setCountdownOpen(false)} title={countdownSection ? 'Edit Countdown Promo' : 'Create Countdown Promo'}>
        <form onSubmit={saveCountdownPromo} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Title</label>
            <input
              className={inputClasses}
              placeholder="Enhance Your Music Experience"
              value={countdownForm.title}
              onChange={event => setCountdownForm({ ...countdownForm, title: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Eyebrow</label>
            <input
              className={inputClasses}
              placeholder="Don't Miss!!"
              value={countdownForm.eyebrow}
              onChange={event => setCountdownForm({ ...countdownForm, eyebrow: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Description</label>
            <textarea
              rows={3}
              className={inputClasses}
              placeholder="Short countdown promo copy"
              value={countdownForm.description}
              onChange={event => setCountdownForm({ ...countdownForm, description: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Background image URL</label>
              <input
                className={inputClasses}
                placeholder="Optional background image"
                value={countdownForm.background_image_url}
                onChange={event => setCountdownForm({ ...countdownForm, background_image_url: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Button text</label>
              <input
                className={inputClasses}
                placeholder="Check it Out!"
                value={countdownForm.button_text}
                onChange={event => setCountdownForm({ ...countdownForm, button_text: event.target.value })}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-sm font-medium text-[#0B1B48]">Button click target</label>
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
                    setCountdownLinkTargetType(type);
                    setCountdownLinkTargetValue('');
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    countdownLinkTargetType === type
                      ? 'border-accent bg-accent text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:text-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {countdownLinkTargetType === 'product' && (
                <>
                  <input
                    className={inputClasses}
                    placeholder="Search products by name, SKU, brand, or category"
                    value={countdownProductSearch}
                    onChange={event => setCountdownProductSearch(event.target.value)}
                  />
                  <select
                    className={inputClasses}
                    value={countdownLinkTargetValue}
                    onChange={event => setCountdownLinkTargetValue(event.target.value)}
                  >
                    <option value="">Select product</option>
                    {filteredCountdownProducts.map(product => (
                      <option key={product.id} value={product.slug}>
                        {product.name}{product.brand ? ` - ${product.brand}` : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {countdownLinkTargetType === 'category' && (
                <select
                  className={inputClasses}
                  value={countdownLinkTargetValue}
                  onChange={event => setCountdownLinkTargetValue(event.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
              )}

              {countdownLinkTargetType === 'brand' && (
                <select
                  className={inputClasses}
                  value={countdownLinkTargetValue}
                  onChange={event => setCountdownLinkTargetValue(event.target.value)}
                >
                  <option value="">Select brand</option>
                  {brands.filter(brand => brand.is_active).map(brand => (
                    <option key={brand.id} value={brand.slug}>{brand.name}</option>
                  ))}
                </select>
              )}

              {countdownLinkTargetType === 'custom' && (
                <input
                  className={inputClasses}
                  placeholder="/store, /store?sort=rating, or https://example.com"
                  value={countdownLinkTargetValue}
                  onChange={event => setCountdownLinkTargetValue(event.target.value)}
                />
              )}

              <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500">
                Link preview: <span className="font-medium text-[#0B1B48]">{getPromotionLink(countdownLinkTargetType, countdownLinkTargetValue) || 'No link selected'}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Countdown end date</label>
              <input
                type="datetime-local"
                className={inputClasses}
                value={countdownForm.end_date}
                onChange={event => setCountdownForm({ ...countdownForm, end_date: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Sort order</label>
              <input
                type="number"
                className={inputClasses}
                value={countdownForm.sort_order}
                onChange={event => setCountdownForm({ ...countdownForm, sort_order: event.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={countdownForm.is_active}
              onChange={event => setCountdownForm({ ...countdownForm, is_active: event.target.checked })}
            />
            Active
          </label>
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white">
            Save Countdown Promo
          </button>
        </form>
      </Modal>

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
