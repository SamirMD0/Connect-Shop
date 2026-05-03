'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Category, ApiResponse } from '../../../lib/types';
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
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => {
      // Auto-generate slug when creating a new category
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
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', image_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/api/admin/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/api/admin/categories', formData);
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

  const columns = [
    { header: 'ID', accessorKey: 'id' as keyof Category },
    { header: 'Name', accessorKey: 'name' as keyof Category },
    { header: 'Slug', accessorKey: 'slug' as keyof Category },
    { header: 'Products Count', accessorKey: 'product_count' as keyof Category },
    { header: 'Actions', cell: (c: Category) => (
      <div className="flex gap-2">
        <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => handleDelete(c.id)} className="p-2 text-danger hover:bg-danger/10 rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  if (loading) return <div className="text-white">Loading categories...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Categories</h1>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-glow transition-colors">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <DataTable data={categories} columns={columns} keyExtractor={(c) => c.id} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name</label>
            <input required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.name} onChange={handleNameChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Slug</label>
            <input required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Image URL (optional)</label>
            <input type="text" placeholder="/images/categories/example.png" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-glow transition-colors">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
