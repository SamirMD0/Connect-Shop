'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Edit2, ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { Brand } from '../../../lib/types';
import { Modal } from '../../../components/admin/Modal';

const emptyBrandForm = {
  name: '',
  slug: '',
  logo_url: '',
  description: '',
  is_active: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState(emptyBrandForm);
  const [formError, setFormError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const inputClasses = 'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] placeholder-slate-400 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15';

  async function fetchBrands() {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; brands: Brand[] }>('/api/admin/brands');
      if (response.success) setBrands(response.brands || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchBrands();
  }, []);

  function handleBrandNameChange(name: string) {
    setBrandForm(current => ({
      ...current,
      name,
      slug: !editingBrand && (!current.slug || current.slug === slugify(current.name)) ? slugify(name) : current.slug,
    }));
  }

  function openBrandModal(brand?: Brand) {
    setEditingBrand(brand || null);
    setBrandForm(brand ? {
      name: brand.name,
      slug: brand.slug,
      logo_url: brand.logo_url || '',
      description: brand.description || '',
      is_active: brand.is_active,
    } : emptyBrandForm);
    setFormError('');
    setIsBrandModalOpen(true);
  }

  async function saveBrand(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    const payload = {
      name: brandForm.name.trim(),
      slug: brandForm.slug.trim() || slugify(brandForm.name),
      logo_url: brandForm.logo_url.trim() || null,
      description: brandForm.description.trim() || null,
      is_active: brandForm.is_active,
    };

    try {
      if (editingBrand) {
        await api.put(`/api/admin/brands/${editingBrand.id}`, payload);
      } else {
        await api.post('/api/admin/brands', payload);
      }

      setIsBrandModalOpen(false);
      await fetchBrands();
    } catch (error: unknown) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Failed to save brand. Please check your inputs.';
      setFormError(message);
    }
  }

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  async function handleLogoUpload(file: File) {
    setFormError('');
    setUploadingLogo(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await api.post<{ success: boolean; url: string }>('/api/admin/uploads/image', {
        fileName: file.name,
        dataUrl,
      });

      setBrandForm(current => ({ ...current, logo_url: response.url }));
    } catch (error: unknown) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Failed to upload brand logo.';
      setFormError(message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function deleteBrand(brand: Brand) {
    if (!confirm(`Delete ${brand.name}? Existing products will keep their brand text but lose the brand link.`)) return;
    await api.delete(`/api/admin/brands/${brand.id}`);
    await fetchBrands();
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/4 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Brands</h1>
          <p className="mt-1 text-sm text-slate-500">Create brands once, then choose them when adding products.</p>
        </div>
        <button
          onClick={() => openBrandModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add Brand
        </button>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => (
            <article key={brand.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
              <div className="relative flex aspect-[16/9] items-center justify-center bg-white p-8">
                {brand.logo_url ? (
                  <Image
                    src={brand.logo_url}
                    alt={brand.name}
                    fill
                    sizes="(min-width: 1280px) 28vw, (min-width: 768px) 45vw, 90vw"
                    className="object-contain p-8"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-slate-300" />
                )}
              </div>
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[#0B1B48]">{brand.name}</h2>
                    <p className="mt-1 truncate text-xs text-slate-500">/{brand.slug}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${brand.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {brand.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {brand.description && (
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">{brand.description}</p>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xs text-slate-500">{brand.product_count ?? 0} products</span>
                  <div className="flex gap-1">
                    <button onClick={() => openBrandModal(brand)} className="rounded-lg p-2 text-slate-400 hover:bg-accent/10 hover:text-accent" aria-label={`Edit ${brand.name}`}>
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => void deleteBrand(brand)} className="rounded-lg p-2 text-slate-400 hover:bg-red-400/10 hover:text-red-400" aria-label={`Delete ${brand.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No brands yet. Add your first brand before creating products.
        </p>
      )}

      <Modal isOpen={isBrandModalOpen} onClose={() => setIsBrandModalOpen(false)} title={editingBrand ? 'Edit Brand' : 'Add Brand'}>
        <form onSubmit={saveBrand} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Brand Name</label>
            <input
              required
              className={inputClasses}
              placeholder="Samsung"
              value={brandForm.name}
              onChange={event => handleBrandNameChange(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Slug</label>
            <input
              required
              className={inputClasses}
              placeholder="samsung"
              value={brandForm.slug}
              onChange={event => setBrandForm({...brandForm, slug: slugify(event.target.value)})}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Logo URL</label>
            <input
              className={inputClasses}
              placeholder="https://example.com/logo.png"
              value={brandForm.logo_url}
              onChange={event => setBrandForm({...brandForm, logo_url: event.target.value})}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-accent hover:text-accent ${
                  uploadingLogo ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                <Upload className="h-4 w-4" />
                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void handleLogoUpload(file);
                  }}
                />
              </label>
              <span className="text-xs text-slate-500">Uploads to ImageKit when configured.</span>
            </div>
            {brandForm.logo_url && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="relative flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <Image
                    src={brandForm.logo_url}
                    alt="Brand logo preview"
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
                <p className="text-xs text-slate-500">Logo preview</p>
              </div>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Description</label>
            <textarea
              rows={3}
              className={inputClasses}
              value={brandForm.description}
              onChange={event => setBrandForm({...brandForm, description: event.target.value})}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={brandForm.is_active}
              onChange={event => setBrandForm({...brandForm, is_active: event.target.checked})}
            />
            Active
          </label>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsBrandModalOpen(false)}
              className="rounded-lg px-4 py-2.5 text-slate-600 transition-colors hover:text-[#0B1B48]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-accent px-6 py-2.5 font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-glow"
            >
              Save Brand
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
