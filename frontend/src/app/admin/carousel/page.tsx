'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/admin/Modal';
import { api, ApiError } from '@/lib/api';
import { Brand, CarouselSlide, Category, Product } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

type LinkTargetType = 'product' | 'category' | 'brand' | 'custom';

function getCarouselLink(type: LinkTargetType, value: string): string {
  if (!value) return '';
  if (type === 'product') return `/store/${value}`;
  if (type === 'category') return `/store?category=${encodeURIComponent(value)}`;
  if (type === 'brand') return `/store?brand=${encodeURIComponent(value)}`;
  return value;
}

function parseCarouselLink(link: string | null | undefined): { type: LinkTargetType; value: string } {
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

export default function CarouselManagementPage() {
  const { addToast } = useToast();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [linkTargetType, setLinkTargetType] = useState<LinkTargetType>('product');
  const [linkTargetValue, setLinkTargetValue] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    button_text: '',
    display_order: 0,
    is_active: true,
  });

  // Note: Route guarding is handled by the admin layout

  useEffect(() => {
    loadSlides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSlides = async () => {
    try {
      const [slidesRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
        api.get<{ success: boolean; slides: CarouselSlide[] }>('/api/carousel/admin'),
        api.get<{ success: boolean; products: Product[] }>('/api/products', {
          params: { limit: 1000, sort: 'newest' },
        }).catch(() => ({ success: false, products: [] })),
        api.get<{ success: boolean; categories: Category[] }>('/api/categories').catch(() => ({ success: false, categories: [] })),
        api.get<{ success: boolean; brands: Brand[] }>('/api/admin/brands').catch(() => ({ success: false, brands: [] })),
      ]);

      setSlides(slidesRes.slides);
      if (productsRes.success) setProducts(productsRes.products || []);
      if (categoriesRes.success) setCategories(categoriesRes.categories || []);
      if (brandsRes.success) setBrands(brandsRes.brands || []);
    } catch {
      addToast('Failed to load slides', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this slide?')) return;
    try {
      await api.delete(`/api/carousel/admin/${id}`);
      addToast('Slide deleted', 'success');
      loadSlides();
    } catch {
      addToast('Failed to delete slide', 'error');
    }
  };

  const handleOpenModal = (slide?: CarouselSlide) => {
    const parsedLink = parseCarouselLink(slide?.link_url);
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        title: slide.title,
        subtitle: slide.subtitle || '',
        image_url: slide.image_url,
        link_url: slide.link_url || '',
        button_text: slide.button_text || '',
        display_order: slide.display_order,
        is_active: slide.is_active,
      });
    } else {
      setEditingSlide(null);
      setFormData({
        title: '',
        subtitle: '',
        image_url: '',
        link_url: '',
        button_text: '',
        display_order: slides.length > 0 ? Math.max(...slides.map(s => s.display_order)) + 1 : 1,
        is_active: true,
      });
    }
    setLinkTargetType(parsedLink.type);
    setLinkTargetValue(parsedLink.value);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      link_url: getCarouselLink(linkTargetType, linkTargetValue) || null,
    };

    try {
      if (editingSlide) {
        await api.patch(`/api/carousel/admin/${editingSlide.id}`, payload);
        addToast('Slide updated successfully', 'success');
      } else {
        await api.post('/api/carousel/admin', payload);
        addToast('Slide created successfully', 'success');
      }
      setIsModalOpen(false);
      loadSlides();
    } catch {
      addToast('Failed to save slide', 'error');
    }
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
      addToast('Image uploaded', 'success');
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Failed to upload image.';
      addToast(message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const inputClasses = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15';
  const filteredProducts = products
    .filter(product => {
      const term = productSearch.trim().toLowerCase();
      if (!term) return true;
      return [product.name, product.sku, product.brand, product.category_name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    })
    .slice(0, 80);

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      await api.patch(`/api/carousel/admin/${id}`, { is_active: !isActive });
      addToast('Slide updated', 'success');
      loadSlides();
    } catch {
      addToast('Failed to update slide', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Carousel Management</h1>
          <p className="text-muted mt-2">Manage the homepage hero carousel slides.</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          Add New Slide
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"></div>
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm shadow-slate-200/80">
          <p className="text-muted">No slides found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide) => (
            <div key={slide.id} className="flex flex-col items-start gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/80 sm:flex-row sm:items-center">
              <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg border border-slate-200/60 bg-white sm:w-48">
                {slide.image_url && (
                  <Image src={slide.image_url} alt={slide.title} fill className="object-cover" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-primary truncate">{slide.title}</h3>
                <p className="text-sm text-muted truncate">{slide.subtitle}</p>
                <div className="flex gap-2 mt-3 items-center">
                  <Badge variant={slide.is_active ? 'success' : 'default'}>
                    {slide.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted">Order: {slide.display_order}</span>
                </div>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button size="sm" variant="secondary" onClick={() => toggleActive(slide.id, slide.is_active)}>
                  {slide.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(slide)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(slide.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSlide ? 'Edit Slide' : 'Add Slide'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Title *</label>
            <input required type="text" className={inputClasses} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Subtitle</label>
            <input type="text" className={inputClasses} value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Image URL *</label>
            <input required type="text" placeholder="/images/carousel/example.jpg" className={inputClasses} value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-accent hover:text-accent ${
                  uploadingImage ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                <Upload className="h-4 w-4" />
                {uploadingImage ? 'Uploading...' : 'Upload image'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void handleImageUpload(file);
                  }}
                />
              </label>
              <span className="text-xs text-slate-500">Uploads to ImageKit when configured.</span>
            </div>
            {formData.image_url && (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <div className="relative h-32 w-full bg-white">
                  <Image src={formData.image_url} alt="Carousel image preview" fill className="object-cover" />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-sm font-medium text-[#0B1B48]">Slide click target</label>
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
                Link preview: <span className="font-medium text-[#0B1B48]">{getCarouselLink(linkTargetType, linkTargetValue) || 'No link selected'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Button Text</label>
              <input type="text" placeholder="Shop Now" className={inputClasses} value={formData.button_text} onChange={e => setFormData({...formData, button_text: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Display Order</label>
              <input required type="number" min="0" className={inputClasses} value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 rounded border-slate-300 bg-white text-accent focus:ring-accent" />
                <span className="text-sm font-medium text-muted">Is Active</span>
              </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted transition-colors hover:text-[#0B1B48]">Cancel</button>
            <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-glow transition-colors">Save Slide</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
