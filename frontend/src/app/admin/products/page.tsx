'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Product, PaginatedProducts, ApiResponse, Category } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
    stock: '0',
    is_featured: false,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get<{ success: boolean; products: Product[]; total: number; page: number; limit: number; totalPages: number }>('/api/products?limit=1000'),
        api.get<{ success: boolean; categories: Category[] }>('/api/categories')
      ]);
      if (prodRes.success && prodRes.products) setProducts(prodRes.products);
      if (catRes.success && catRes.categories) setCategories(catRes.categories);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        price: product.price.toString(),
        image_url: product.image_url || '',
        category_id: product.category_id.toString(),
        stock: product.stock.toString(),
        is_featured: product.is_featured,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', slug: '', description: '', price: '', image_url: '', category_id: categories[0]?.id.toString() || '', stock: '0', is_featured: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id, 10),
        stock: parseInt(formData.stock, 10),
      };

      if (editingProduct) {
        await api.put(`/api/admin/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/api/admin/products', payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please check your inputs.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      fetchProducts();
    } catch (error: any) {
      alert(error.message || 'Failed to delete product.');
    }
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' as keyof Product },
    { header: 'Price', cell: (p: Product) => `$${p.price}` },
    { header: 'Category', accessorKey: 'category_name' as keyof Product },
    { header: 'Stock', cell: (p: Product) => (
      <span className={p.stock > 10 ? 'text-success' : p.stock > 0 ? 'text-warning' : 'text-danger'}>
        {p.stock}
      </span>
    )},
    { header: 'Actions', cell: (p: Product) => (
      <div className="flex gap-2">
        <button onClick={() => handleOpenModal(p)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => handleDelete(p.id)} className="p-2 text-danger hover:bg-danger/10 rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  if (loading) return <div className="text-white">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Products</h1>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-glow transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <DataTable data={products} columns={columns} keyExtractor={(p) => p.id} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name</label>
            <input required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Slug</label>
            <input required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Price</label>
              <input required type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Stock</label>
              <input required type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Category</label>
            <select required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
              <option value="">Select a category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Image URL</label>
            <input type="url" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Description</label>
            <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
            <label htmlFor="featured" className="text-sm font-medium text-white">Featured Product</label>
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
