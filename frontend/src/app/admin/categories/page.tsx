'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Grid } from 'lucide-react';
import Image from 'next/image';
import { api } from '../../../lib/api';
import { Category } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
      const res = await api.get<{ success: boolean; categories: Category[] }>('/api/categories');
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        image_url: formData.image_url.trim() || null,
        parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
      };
      if (editingCategory) {
        await api.put(`/api/admin/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/api/admin/categories', payload);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      alert(error.message || 'Failed to save category. Please check your inputs.');
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

  const inputClasses = "w-full bg-[#0a0a14] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all";

  const columns = [
    { header: 'Image', cell: (c: Category) => (
      <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center overflow-hidden">
        {c.image_url ? (
          <Image src={c.image_url} alt={c.name} width={24} height={24} className="object-contain" />
        ) : (
          <Grid className="w-5 h-5 text-slate-500" />
        )}
      </div>
    )},
    { header: 'Name', accessorKey: 'name' as keyof Category },
    { header: 'Slug', cell: (c: Category) => <span className="text-slate-400">/{c.slug}</span> },
    { header: 'Depth', cell: (c: Category) => <span className="text-slate-400">{c.depth}</span> },
    { header: 'Products', cell: (c: Category) => (
      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1e293b] text-slate-300">
        {c.product_count || 0}
      </span>
    )},
    { header: 'Actions', cell: (c: Category) => (
      <div className="flex gap-1">
        <button 
          onClick={() => handleOpenModal(c)} 
          className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleDelete(c.id)} 
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[#1e293b] rounded-xl w-1/4"></div>
        <div className="h-64 bg-[#12121a] rounded-xl border border-[#1e293b]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-slate-400 text-sm mt-1">{categories.length} categories in your store</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl font-medium hover:bg-accent-glow shadow-lg shadow-accent/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <DataTable data={categories} columns={columns} keyExtractor={(c) => c.id} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input 
              required 
              type="text" 
              className={inputClasses}
              placeholder="Category name"
              value={formData.name} 
              onChange={handleNameChange} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Slug</label>
            <input 
              required 
              type="text" 
              className={inputClasses}
              placeholder="category-slug"
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Image URL (optional)</label>
            <input 
              type="text" 
              placeholder="/images/categories/example.png" 
              className={inputClasses}
              value={formData.image_url} 
              onChange={e => setFormData({...formData, image_url: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Parent Category</label>
            <select
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
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#1e293b]">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors rounded-xl"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-accent text-white px-6 py-2.5 rounded-xl font-medium hover:bg-accent-glow shadow-lg shadow-accent/25 transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
