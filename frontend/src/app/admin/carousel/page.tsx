'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/admin/Modal';
import { api } from '@/lib/api';
import { CarouselSlide } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

export default function CarouselManagementPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);

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
  }, []);

  const loadSlides = async () => {
    try {
      const res = await api.get<{ success: boolean; slides: CarouselSlide[] }>('/api/carousel/admin');
      setSlides(res.slides);
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSlide) {
        await api.patch(`/api/carousel/admin/${editingSlide.id}`, formData);
        addToast('Slide updated successfully', 'success');
      } else {
        await api.post('/api/carousel/admin', formData);
        addToast('Slide created successfully', 'success');
      }
      setIsModalOpen(false);
      loadSlides();
    } catch {
      addToast('Failed to save slide', 'error');
    }
  };

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
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-surface border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-muted">No slides found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide) => (
            <div key={slide.id} className="bg-surface border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-full sm:w-48 h-24 relative rounded-lg overflow-hidden shrink-0 bg-slate-900">
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
            <input required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Subtitle</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Image URL *</label>
            <input required type="text" placeholder="/images/carousel/example.jpg" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Link URL</label>
              <input type="text" placeholder="/store" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.link_url} onChange={e => setFormData({...formData, link_url: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Button Text</label>
              <input type="text" placeholder="Shop Now" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.button_text} onChange={e => setFormData({...formData, button_text: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Display Order</label>
              <input required type="number" min="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})} />
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-accent focus:ring-accent" />
                <span className="text-sm font-medium text-muted">Is Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-glow transition-colors">Save Slide</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
