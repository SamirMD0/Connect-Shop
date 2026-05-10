'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Product, Category } from '../../../lib/types';
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

  const inputClasses = "w-full bg-[#0a0a14] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all";

  const columns = [
    { header: 'Name', accessorKey: 'name' as keyof Product },
    { header: 'Price', cell: (p: Product) => <span className="text-accent font-medium">${p.price}</span> },
    { header: 'Category', accessorKey: 'category_name' as keyof Product },
    { header: 'Stock', cell: (p: Product) => (
      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
        p.stock > 10 ? 'bg-emerald-500/10 text-emerald-400' : 
        p.stock > 0 ? 'bg-amber-500/10 text-amber-400' : 
        'bg-red-500/10 text-red-400'
      }`}>
        {p.stock}
      </span>
    )},
    { header: 'Actions', cell: (p: Product) => (
      <div className="flex gap-1">
        <button 
          onClick={() => handleOpenModal(p)} 
          className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleDelete(p.id)} 
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
        <div className="h-96 bg-[#12121a] rounded-xl border border-[#1e293b]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 text-sm mt-1">{products.length} products in your store</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl font-medium hover:bg-accent-glow shadow-lg shadow-accent/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <DataTable data={products} columns={columns} keyExtractor={(p) => p.id} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input 
              required 
              type="text" 
              className={inputClasses}
              placeholder="Product name"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Slug</label>
            <input 
              required 
              type="text" 
              className={inputClasses}
              placeholder="product-slug"
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                className={inputClasses}
                placeholder="0.00"
                value={formData.price} 
                onChange={e => setFormData({...formData, price: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stock</label>
              <input 
                required 
                type="number" 
                className={inputClasses}
                placeholder="0"
                value={formData.stock} 
                onChange={e => setFormData({...formData, stock: e.target.value})} 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
            <select 
              required 
              className={inputClasses}
              value={formData.category_id} 
              onChange={e => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">Select a category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Image URL</label>
            <input 
              type="url" 
              className={inputClasses}
              placeholder="https://example.com/image.jpg"
              value={formData.image_url} 
              onChange={e => setFormData({...formData, image_url: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea 
              className={inputClasses}
              rows={3} 
              placeholder="Product description..."
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="featured" 
              className="w-4 h-4 rounded border-[#1e293b] bg-[#0a0a14] text-accent focus:ring-accent/30"
              checked={formData.is_featured} 
              onChange={e => setFormData({...formData, is_featured: e.target.checked})} 
            />
            <label htmlFor="featured" className="text-sm font-medium text-white">Featured Product</label>
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
