'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Download, Upload, LayoutGrid, List, Package } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { Product, Category, Brand } from '../../../lib/types';
import { DataTable } from '../../../components/admin/DataTable';
import { Modal } from '../../../components/admin/Modal';
import { SafeImage } from '@/components/ui/SafeImage';

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
  brand_id: string;
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
    brand_id: '',
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function skuify(value: string): string {
  return value
    .toUpperCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/&/g, ' AND ')
    .replace(/\+/g, ' ')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function buildSkuSource(name: string, brand: string): string {
  const normalizedName = name.trim();
  const normalizedBrand = brand.trim();

  if (!normalizedBrand) return normalizedName;
  if (normalizedName.toLowerCase().startsWith(normalizedBrand.toLowerCase())) {
    return normalizedName;
  }

  return `${normalizedBrand} ${normalizedName}`;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [totalPages, setTotalPages] = useState(1);
  const [importCsv, setImportCsv] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ProductFormData>(() => createEmptyForm());

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, brandRes] = await Promise.all([
        api.get<{ success: boolean; products: Product[]; total: number; page: number; limit: number; totalPages: number }>('/api/products', {
          params: { page, limit: 10, search: searchQuery || undefined }
        }),
        api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
        api.get<{ success: boolean; brands: Brand[] }>('/api/admin/brands').catch(() => ({ success: false, brands: [] }))
      ]);
      if (prodRes.success && prodRes.products) {
        setProducts(prodRes.products);
        setTotalPages(prodRes.totalPages || 1);
      }
      if (catRes.success && catRes.categories) {
        setCategories(catRes.categories);
      }
      if (brandRes.success && brandRes.brands) {
        setBrands(brandRes.brands);
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
        brand_id: fullProduct.brand_id?.toString() || '',
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
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const price = parseFloat(formData.price);
      const stock = parseInt(formData.stock, 10);
      const categoryId = parseInt(formData.category_id, 10);

      if (!formData.name.trim()) throw new Error('Product name is required.');
      if (!formData.slug.trim()) throw new Error('Product slug is required.');
      if (!Number.isFinite(price) || price <= 0) throw new Error('Price must be greater than 0.');
      if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock must be 0 or greater.');
      if (!Number.isInteger(categoryId)) throw new Error('Please select a category.');
      if (formData.compare_at_price && Number(formData.compare_at_price) <= 0) {
        throw new Error('Compare-at price must be greater than 0.');
      }

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
        price,
        category_id: categoryId,
        stock,
        is_featured: formData.is_featured,
        brand_id: formData.brand_id ? parseInt(formData.brand_id, 10) : null,
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
      await fetchProducts();
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Failed to save product. Please check your inputs and variant attributes JSON.';
      setFormError(message);
    } finally {
      setSubmitting(false);
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
    setFormError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.post<{ success: boolean; url: string }>('/api/admin/uploads/image', {
        fileName: file.name,
        dataUrl,
      });
      setFormData(current => ({ ...current, image_url: res.url }));
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Failed to upload image.';
      setFormError(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const generateProductSku = (name: string, brand: string) => {
    const baseSku = skuify(buildSkuSource(name, brand));
    if (!baseSku) return '';

    const existingSkus = new Set(
      products
        .filter(product => product.id !== editingProduct?.id)
        .map(product => product.sku?.toUpperCase())
        .filter(Boolean)
    );

    let candidate = baseSku;
    let suffix = 2;
    while (existingSkus.has(candidate)) {
      const suffixText = `-${suffix}`;
      candidate = `${baseSku.slice(0, 100 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    return candidate;
  };

  const handleProductNameChange = (name: string) => {
    setFormData(current => ({
      ...current,
      name,
      slug: !editingProduct && (!current.slug || current.slug === slugify(current.name)) ? slugify(name) : current.slug,
      sku: !editingProduct && (!current.sku || current.sku === generateProductSku(current.name, current.brand))
        ? generateProductSku(name, current.brand)
        : current.sku,
    }));
  };

  const handleProductBrandChange = (brandId: string) => {
    const brand = brands.find(item => item.id.toString() === brandId);
    const brandName = brand?.name || '';

    setFormData(current => ({
      ...current,
      brand_id: brandId,
      brand: brandName,
      sku: !editingProduct && (!current.sku || current.sku === generateProductSku(current.name, current.brand))
        ? generateProductSku(current.name, brandName)
        : current.sku,
    }));
  };

  const handleCustomBrandChange = (brand: string) => {
    setFormData(current => ({
      ...current,
      brand_id: '',
      brand,
      sku: !editingProduct && (!current.sku || current.sku === generateProductSku(current.name, current.brand))
        ? generateProductSku(current.name, brand)
        : current.sku,
    }));
  };

  const inputClasses = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] placeholder-slate-400 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

  const renderProductImage = (product: Product, size: 'table' | 'grid' = 'table') => {
    const frameClasses = size === 'grid'
      ? 'relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-white'
      : 'relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-white';

    return (
      <div className={frameClasses}>
        {product.image_url ? (
          <SafeImage
            src={product.image_url}
            alt={product.name}
            fill
            sizes={size === 'grid' ? '(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 90vw' : '56px'}
            className={size === 'grid' ? 'object-contain p-4' : 'object-contain p-1.5'}
            fallback={
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Package className={size === 'grid' ? 'h-10 w-10' : 'h-5 w-5'} />
              </div>
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className={size === 'grid' ? 'h-10 w-10' : 'h-5 w-5'} />
          </div>
        )}
      </div>
    );
  };

  const renderProductActions = (product: Product) => (
    <div className="flex gap-1">
      <button
        onClick={() => void handleOpenModal(product)}
        className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
        aria-label={`Edit ${product.name}`}
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => void handleDelete(product.id)}
        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        aria-label={`Delete ${product.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const getStockBadgeClass = (stock: number) => {
    if (stock > 10) return 'bg-emerald-500/10 text-emerald-600';
    if (stock > 0) return 'bg-amber-500/10 text-amber-600';
    return 'bg-red-500/10 text-red-600';
  };

  const columns = [
    { header: 'Image', cell: (p: Product) => renderProductImage(p) },
    { header: 'Name', accessorKey: 'name' as keyof Product },
    { header: 'Price', cell: (p: Product) => <span className="text-accent font-medium">${p.price}</span> },
    { header: 'Category', accessorKey: 'category_name' as keyof Product },
    { header: 'Brand', cell: (p: Product) => <span className="text-slate-600">{p.brand || '-'}</span> },
    { header: 'Stock', cell: (p: Product) => (
      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getStockBadgeClass(p.stock)}`}>
        {p.stock}
      </span>
    )},
    { header: 'Actions', cell: (p: Product) => renderProductActions(p) },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/4 rounded-lg bg-slate-200"></div>
        <div className="h-96 rounded-lg border border-slate-200 bg-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your store's inventory</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-[#0B1B48] outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-accent">
              <Search className="w-4 h-4" />
            </button>
          </form>
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
          <button
            onClick={() => void handleExportCsv()}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition-all hover:border-accent hover:text-accent"
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

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <textarea
            rows={3}
            value={importCsv}
            onChange={(event) => setImportCsv(event.target.value)}
            placeholder="Paste product CSV to import. Required columns: name, slug, price, category_id, stock."
            className="min-h-24 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15"
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
      {importMessage && <p className="mt-2 text-sm text-slate-500">{importMessage}</p>}
      </div>

      {viewMode === 'table' ? (
        <DataTable data={products} columns={columns} keyExtractor={(p) => p.id} emptyMessage="No products found" />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
              {renderProductImage(product, 'grid')}
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold text-[#0B1B48]">{product.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">/{product.slug}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-accent">${product.price}</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-slate-600">
                    {product.category_name || 'No category'}
                  </span>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                    {product.brand || 'No brand'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 font-medium ${getStockBadgeClass(product.stock)}`}>
                    Stock {product.stock}
                  </span>
                </div>

                {product.sku && (
                  <p className="truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                    SKU: {product.sku}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xs text-slate-500">{product.is_featured ? 'Featured' : 'Standard'}</span>
                  {renderProductActions(product)}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm shadow-slate-200/80">
          <p className="text-sm font-medium text-slate-500">No products found</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-accent disabled:pointer-events-none disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Name</label>
            <input 
              required 
              type="text" 
              className={inputClasses}
              placeholder="Product name"
              value={formData.name} 
              onChange={e => handleProductNameChange(e.target.value)} 
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Slug</label>
            <input 
              required 
              type="text" 
              className={inputClasses}
              placeholder="product-slug"
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: slugify(e.target.value)})} 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Price</label>
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
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Stock</label>
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
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Brand</label>
              <select
                className={inputClasses}
                value={formData.brand_id}
                onChange={e => handleProductBrandChange(e.target.value)}
              >
                <option value="">No brand</option>
                {brands.filter(brand => brand.is_active).map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">SKU</label>
              <input
                type="text"
                className={inputClasses}
                placeholder="SAM-AC-SPLIT-12000-R32-WIFI"
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: skuify(e.target.value)})}
              />
              <p className="mt-1 text-xs text-slate-500">
                Auto-generated from brand and title. You can edit it before saving.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Compare-at Price</label>
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
              <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Weight (grams)</label>
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
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Category</label>
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
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Image URL</label>
            <input 
              type="text" 
              className={inputClasses}
              placeholder="https://example.com/image.jpg"
              value={formData.image_url} 
              onChange={e => setFormData({...formData, image_url: e.target.value})} 
            />
            {formData.image_url && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <SafeImage
                    src={formData.image_url}
                    alt="Product preview"
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Package className="h-5 w-5" />
                      </div>
                    }
                  />
                </div>
                <p className="text-xs text-slate-500">Image preview</p>
              </div>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent">
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
            <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Description</label>
            <textarea 
              className={inputClasses}
              rows={3} 
              placeholder="Product description..."
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-[#0B1B48]">Advanced product details</summary>
            <div className="mt-4 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Custom Brand Name</label>
                <input
                  type="text"
                  className={inputClasses}
                  placeholder="Only use this if no brand exists"
                  value={formData.brand}
                  onChange={e => handleCustomBrandChange(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Gallery Images</label>
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
                  <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Meta Title</label>
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.meta_title}
                    onChange={e => setFormData({...formData, meta_title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#0B1B48]">Meta Description</label>
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
                  <label className="block text-sm font-medium text-[#0B1B48]">Variants</label>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, variants: [...formData.variants, { ...emptyVariant }]})}
                    className="text-sm text-accent hover:text-accent-glow"
                  >
                    Add Variant
                  </button>
                </div>
                {formData.variants.map((variant, index) => (
                  <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
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
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove Variant
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="featured" 
              className="h-4 w-4 rounded border-slate-300 bg-white text-accent focus:ring-accent/30"
              checked={formData.is_featured} 
              onChange={e => setFormData({...formData, is_featured: e.target.checked})} 
            />
            <label htmlFor="featured" className="text-sm font-medium text-[#0B1B48]">Featured Product</label>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="rounded-lg px-4 py-2.5 text-slate-600 transition-colors hover:text-[#0B1B48]"
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
