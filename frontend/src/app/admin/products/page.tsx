'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { api } from '../../../lib/api';
import { Product, Category } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';

interface VariantForm {
  sku: string;
  name: string;
  price: string;
  stock: string;
  attributes: string;
  image_url: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  image_url: string;
  category_id: string;
  stock: string;
  is_featured: boolean;
  brand: string;
  sku: string;
  compare_at_price: string;
  weight_grams: string;
  meta_title: string;
  meta_description: string;
  gallery_images_text: string;
  variants: VariantForm[];
}

const emptyVariant: VariantForm = {
  sku: '',
  name: '',
  price: '',
  stock: '0',
  attributes: '{}',
  image_url: '',
};

function createEmptyForm(categoryId = ''): ProductFormData {
  return {
    name: '',
    slug: '',
    description: '',
    price: '',
    image_url: '',
    category_id: categoryId,
    stock: '0',
    is_featured: false,
    brand: '',
    sku: '',
    compare_at_price: '',
    weight_grams: '',
    meta_title: '',
    meta_description: '',
    gallery_images_text: '',
    variants: [],
  };
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [importCsv, setImportCsv] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ProductFormData>(() => createEmptyForm());

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get<{ success: boolean; products: Product[]; total: number; page: number; limit: number; totalPages: number }>('/api/products', {
          params: { page, limit: 10, search: searchQuery || undefined }
        }),
        api.get<{ success: boolean; categories: Category[] }>('/api/categories')
      ]);
      if (prodRes.success && prodRes.products) {
        setProducts(prodRes.products);
        setTotalPages(prodRes.totalPages || 1);
      }
      if (catRes.success && catRes.categories) {
        setCategories(catRes.categories);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleOpenModal = async (product?: Product) => {
    if (product) {
      let fullProduct = product;
      try {
        const detail = await api.get<{ success: boolean; product: Product }>(`/api/products/${product.slug}`);
        fullProduct = detail.product;
      } catch {
        // The list payload is enough for basic edits if detail fetch fails.
      }

      setEditingProduct(product);
      setFormData({
        name: fullProduct.name,
        slug: fullProduct.slug,
        description: fullProduct.description || '',
        price: fullProduct.price.toString(),
        image_url: fullProduct.image_url || '',
        category_id: fullProduct.category_id.toString(),
        stock: fullProduct.stock.toString(),
        is_featured: fullProduct.is_featured,
        brand: fullProduct.brand || '',
        sku: fullProduct.sku || '',
        compare_at_price: fullProduct.compare_at_price || '',
        weight_grams: fullProduct.weight_grams?.toString() || '',
        meta_title: fullProduct.meta_title || '',
        meta_description: fullProduct.meta_description || '',
        gallery_images_text: fullProduct.gallery_images?.map(img => img.image_url).join('\n') || '',
        variants: fullProduct.variants?.map(variant => ({
          sku: variant.sku,
          name: variant.name,
          price: variant.price.toString(),
          stock: variant.stock.toString(),
          attributes: JSON.stringify(variant.attributes || {}),
          image_url: variant.image_url || '',
        })) || [],
      });
    } else {
      setEditingProduct(null);
      setFormData(createEmptyForm(categories[0]?.id.toString() || ''));
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const galleryImages = formData.gallery_images_text
        .split('\n')
        .map(url => url.trim())
        .filter(Boolean)
        .map((image_url, index) => ({ image_url, sort_order: index, is_primary: false }));

      const variants = formData.variants
        .filter(variant => variant.sku.trim() && variant.name.trim() && variant.price)
        .map(variant => ({
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          price: parseFloat(variant.price),
          stock: parseInt(variant.stock || '0', 10),
          attributes: JSON.parse(variant.attributes || '{}'),
          image_url: variant.image_url.trim() || null,
        }));

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        image_url: formData.image_url.trim() || null,
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id, 10),
        stock: parseInt(formData.stock, 10),
        is_featured: formData.is_featured,
        brand: formData.brand.trim() || null,
        sku: formData.sku.trim() || null,
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        weight_grams: formData.weight_grams ? parseInt(formData.weight_grams, 10) : null,
        meta_title: formData.meta_title.trim() || null,
        meta_description: formData.meta_description.trim() || null,
        gallery_images: galleryImages,
        variants,
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
      alert('Failed to save product. Please check your inputs and variant attributes JSON.');
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

  const handleExportCsv = async () => {
    const csv = await api.get<string>('/api/admin/products/export');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async () => {
    if (!importCsv.trim()) return;
    const res = await api.post<{ success: boolean; created: Product[]; errors: { row: number; message: string }[] }>('/api/admin/products/import', { csv: importCsv });
    setImportMessage(`Imported ${res.created?.length || 0} product(s)${res.errors?.length ? `, ${res.errors.length} row(s) failed` : ''}.`);
    if (!res.errors?.length) setImportCsv('');
    await fetchProducts();
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.post<{ success: boolean; url: string }>('/api/admin/uploads/image', {
        fileName: file.name,
        dataUrl,
      });
      setFormData(current => ({ ...current, image_url: res.url }));
    } finally {
      setUploadingImage(false);
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
          onClick={() => void handleOpenModal(p)}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your store's inventory</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-[#0a0a14] border border-[#1e293b] rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-accent">
              <Search className="w-4 h-4" />
            </button>
          </form>
          <button
            onClick={() => void handleExportCsv()}
            className="flex items-center gap-2 rounded-xl border border-[#1e293b] px-4 py-2.5 font-medium text-slate-300 transition-all hover:border-accent hover:text-accent"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => void handleOpenModal()}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl font-medium hover:bg-accent-glow shadow-lg shadow-accent/25 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#12121a] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <textarea
            rows={3}
            value={importCsv}
            onChange={(event) => setImportCsv(event.target.value)}
            placeholder="Paste product CSV to import. Required columns: name, slug, price, category_id, stock."
            className="min-h-24 flex-1 rounded-xl border border-[#1e293b] bg-[#0a0a14] px-4 py-3 text-sm text-white outline-none focus:border-accent"
          />
          <button
            onClick={() => void handleImportCsv()}
            disabled={!importCsv.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        </div>
        {importMessage && <p className="mt-2 text-sm text-slate-400">{importMessage}</p>}
      </div>

      <DataTable data={products} columns={columns} keyExtractor={(p) => p.id} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#1e293b] pt-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1e293b] disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1e293b] disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
              <input
                type="text"
                className={inputClasses}
                placeholder="Apple"
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">SKU</label>
              <input
                type="text"
                className={inputClasses}
                placeholder="IPHONE-15-128"
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Compare-at Price</label>
              <input
                type="number"
                step="0.01"
                className={inputClasses}
                placeholder="0.00"
                value={formData.compare_at_price}
                onChange={e => setFormData({...formData, compare_at_price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Weight (grams)</label>
              <input
                type="number"
                className={inputClasses}
                placeholder="0"
                value={formData.weight_grams}
                onChange={e => setFormData({...formData, weight_grams: e.target.value})}
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
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1e293b] px-4 py-2 text-sm font-medium text-slate-300 hover:border-accent hover:text-accent">
              <Upload className="h-4 w-4" />
              {uploadingImage ? 'Uploading...' : 'Upload image'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void handleImageUpload(file);
                }}
              />
            </label>
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gallery Images</label>
            <textarea
              className={inputClasses}
              rows={3}
              placeholder="One image URL or /images path per line"
              value={formData.gallery_images_text}
              onChange={e => setFormData({...formData, gallery_images_text: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Meta Title</label>
              <input
                type="text"
                className={inputClasses}
                value={formData.meta_title}
                onChange={e => setFormData({...formData, meta_title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Meta Description</label>
              <input
                type="text"
                className={inputClasses}
                value={formData.meta_description}
                onChange={e => setFormData({...formData, meta_description: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Variants</label>
              <button
                type="button"
                onClick={() => setFormData({...formData, variants: [...formData.variants, { ...emptyVariant }]})}
                className="text-sm text-accent hover:text-accent-glow"
              >
                Add Variant
              </button>
            </div>
            {formData.variants.map((variant, index) => (
              <div key={index} className="rounded-xl border border-[#1e293b] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="Variant SKU"
                    value={variant.sku}
                    onChange={e => {
                      const variants = [...formData.variants];
                      variants[index] = { ...variant, sku: e.target.value };
                      setFormData({...formData, variants});
                    }}
                  />
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="Name, e.g. 128GB Space Gray"
                    value={variant.name}
                    onChange={e => {
                      const variants = [...formData.variants];
                      variants[index] = { ...variant, name: e.target.value };
                      setFormData({...formData, variants});
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className={inputClasses}
                    placeholder="Price"
                    value={variant.price}
                    onChange={e => {
                      const variants = [...formData.variants];
                      variants[index] = { ...variant, price: e.target.value };
                      setFormData({...formData, variants});
                    }}
                  />
                  <input
                    type="number"
                    className={inputClasses}
                    placeholder="Stock"
                    value={variant.stock}
                    onChange={e => {
                      const variants = [...formData.variants];
                      variants[index] = { ...variant, stock: e.target.value };
                      setFormData({...formData, variants});
                    }}
                  />
                </div>
                <input
                  type="text"
                  className={inputClasses}
                  placeholder="Variant image URL or /images path"
                  value={variant.image_url}
                  onChange={e => {
                    const variants = [...formData.variants];
                    variants[index] = { ...variant, image_url: e.target.value };
                    setFormData({...formData, variants});
                  }}
                />
                <textarea
                  className={inputClasses}
                  rows={2}
                  placeholder='Attributes JSON, e.g. {"storage":"128GB","color":"Space Gray"}'
                  value={variant.attributes}
                  onChange={e => {
                    const variants = [...formData.variants];
                    variants[index] = { ...variant, attributes: e.target.value };
                    setFormData({...formData, variants});
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, variants: formData.variants.filter((_, i) => i !== index)})}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove Variant
                </button>
              </div>
            ))}
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
