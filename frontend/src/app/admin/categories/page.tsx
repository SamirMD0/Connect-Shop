'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Grid } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { Category } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';
import { SafeImage } from '@/components/ui/SafeImage';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image_url: '',
    parent_id: '',
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => {
      if (!editingCategory) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        return { ...prev, name, slug };
      }
      return { ...prev, name };
    });
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; categories: Category[] }>('/api/admin/categories', {
        cache: 'no-store',
      });
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        image_url: category.image_url || '',
        parent_id: category.parent_id?.toString() || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', image_url: '', parent_id: '' });
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (!formData.name.trim()) throw new Error('Category name is required.');
      if (!formData.slug.trim()) throw new Error('Category slug is required.');
      if (editingCategory && formData.parent_id && parseInt(formData.parent_id, 10) === editingCategory.id) {
        throw new Error('A category cannot be its own parent.');
      }

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        image_url: formData.image_url.trim() || null,
        parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
      };
      if (editingCategory) {
        await api.put(`/api/admin/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/api/admin/categories', payload);
      }
      setIsModalOpen(false);
      await fetchCategories();
    } catch (error: any) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Failed to save category. Please check your inputs.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/api/admin/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      alert(error.message || 'Failed to delete category.');
    }
  };

  const inputClasses = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] placeholder-slate-400 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

  const columns = [
    { header: 'Image', cell: (c: Category) => (
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden ring-1 ring-slate-200">
        {c.image_url ? (
          <SafeImage
            src={c.image_url}
            alt={c.name}
            width={24}
            height={24}
            className="object-contain"
            fallback={<Grid className="w-5 h-5 text-slate-500" />}
          />
        ) : (
          <Grid className="w-5 h-5 text-slate-500" />
        )}
      </div>
    )},
    { header: 'Name', accessorKey: 'name' as keyof Category },
    { header: 'Slug', cell: (c: Category) => <span className="text-slate-500">/{c.slug}</span> },
    { header: 'Depth', cell: (c: Category) => <span className="text-slate-500">{c.depth}</span> },
    { header: 'Products', cell: (c: Category) => (
      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
        {c.product_count || 0}
      </span>
    )},
    { header: 'Actions', cell: (c: Category) => (
      <div className="flex gap-1">
        <button 
          onClick={() => handleOpenModal(c)} 
          title="Edit category"
          aria-label="Edit category"
          className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleDelete(c.id)} 
          title="Delete category"
          aria-label="Delete category"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} categories in your store</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl font-medium hover:bg-accent-glow shadow-lg shadow-accent/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <DataTable data={categories} columns={columns} keyExtractor={(c) => c.id} loading={loading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-[#0B1B48] mb-2">Name</label>
            <input 
              id="category-name"
              required 
              type="text" 
              className={inputClasses}
              placeholder="Category name"
              value={formData.name} 
              onChange={handleNameChange} 
            />
          </div>
          <div>
            <label htmlFor="category-slug" className="block text-sm font-medium text-[#0B1B48] mb-2">Slug</label>
            <input 
              id="category-slug"
              required 
              type="text" 
              className={inputClasses}
              placeholder="category-slug"
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: e.target.value})} 
            />
          </div>
          <div>
            <label htmlFor="category-image-url" className="block text-sm font-medium text-[#0B1B48] mb-2">Image URL (optional)</label>
            <input 
              id="category-image-url"
              type="text" 
              placeholder="/images/categories/example.png" 
              className={inputClasses}
              value={formData.image_url} 
              onChange={e => setFormData({...formData, image_url: e.target.value})} 
            />
            {formData.image_url && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <SafeImage
                    src={formData.image_url}
                    alt="Category preview"
                    width={32}
                    height={32}
                    className="object-contain"
                    fallback={<Grid className="h-5 w-5 text-slate-400" />}
                  />
                </div>
                <p className="text-xs text-slate-500">Image preview</p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="category-parent" className="block text-sm font-medium text-[#0B1B48] mb-2">Parent Category</label>
            <select
              id="category-parent"
              className={inputClasses}
              value={formData.parent_id}
              onChange={e => setFormData({...formData, parent_id: e.target.value})}
            >
              <option value="">None</option>
              {categories
                .filter(c => c.id !== editingCategory?.id)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-4 py-2.5 text-slate-600 hover:text-[#0B1B48] transition-colors rounded-xl"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="bg-accent text-white px-6 py-2.5 rounded-xl font-medium hover:bg-accent-glow shadow-lg shadow-accent/25 transition-all disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
