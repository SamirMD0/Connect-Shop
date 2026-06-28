'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Home, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  Brand,
  Category,
  HomepageBrandProductLayout,
  HomepageBrandProductLimit,
  HomepageBrandProductSection,
  HomepageBrandProductSortKey,
  HomepageBlock,
  HomepageBlockType,
  HomepageCategoryProductSection,
  HomepagePromotion,
} from '@/lib/types';
import { Modal } from '@/components/admin/Modal';
import { DataTable } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type ManagedHomepageSection = HomepageBrandProductSection | HomepageCategoryProductSection;
type SectionKind = 'brand' | 'category';
type PromotionOption = Pick<HomepagePromotion, 'id' | 'title' | 'is_active'>;

type BlockForm = {
  block_type: HomepageBlockType | '';
  brand_product_section_id: string;
  category_product_section_id: string;
  promotion_id: string;
  is_active: boolean;
};

type BlockFormErrors = Partial<Record<keyof BlockForm | 'api', string>>;

type SectionForm = {
  title: string;
  subtitle: string;
  target_id: string;
  product_limit: `${HomepageBrandProductLimit}`;
  sort_key: HomepageBrandProductSortKey;
  layout: HomepageBrandProductLayout;
  is_active: boolean;
};

type FormErrors = Partial<Record<keyof SectionForm | 'api', string>>;

type EntityOption = {
  id: number;
  name: string;
  slug?: string | null;
  isAvailable?: boolean;
};

type SectionPayload = {
  title: string;
  subtitle: string | null;
  product_limit: number;
  sort_key: HomepageBrandProductSortKey;
  layout: HomepageBrandProductLayout;
  is_active: boolean;
  brand_id?: number;
  category_id?: number;
};

type BlockPayload = {
  block_type: HomepageBlockType;
  brand_product_section_id?: string;
  category_product_section_id?: string;
  promotion_id?: number;
  is_active: boolean;
};

const fixedBlockTypes: HomepageBlockType[] = [
  'hero_carousel',
  'new_arrivals',
  'best_sellers',
  'featured_products',
  'testimonials',
  'newsletter',
  'category_showcase',
  'brand_showcase',
];

const lockedHomepageBlockTypes: HomepageBlockType[] = [
  'hero_carousel',
  'brand_showcase',
  'category_showcase',
  'promotion_banner',
];

const referencedBlockTypes: HomepageBlockType[] = [
  'brand_product_section',
  'category_product_section',
  'promotion_banner',
];

const blockTypeOptions: Array<{ value: HomepageBlockType; label: string; description: string }> = [
  { value: 'hero_carousel', label: 'Hero carousel', description: 'Homepage hero slides and supporting hero content.' },
  { value: 'brand_showcase', label: 'Brand showcase', description: 'Existing brand showcase section.' },
  { value: 'category_showcase', label: 'Category showcase', description: 'Existing category showcase section.' },
  { value: 'new_arrivals', label: 'New arrivals', description: 'Newest products from the catalog.' },
  { value: 'brand_product_section', label: 'Brand product section', description: 'A controlled product section linked to a brand section.' },
  { value: 'category_product_section', label: 'Category product section', description: 'A controlled product section linked to a category section.' },
  { value: 'promotion_banner', label: 'Promotion banner', description: 'A banner from existing promotions.' },
  { value: 'best_sellers', label: 'Best sellers', description: 'Top rated products from the catalog.' },
  { value: 'featured_products', label: 'Featured products', description: 'Products marked as featured.' },
  { value: 'testimonials', label: 'Testimonials', description: 'Existing testimonial homepage content.' },
  { value: 'newsletter', label: 'Newsletter', description: 'Existing newsletter signup section.' },
];

const emptyBlockForm: BlockForm = {
  block_type: '',
  brand_product_section_id: '',
  category_product_section_id: '',
  promotion_id: '',
  is_active: true,
};

const productLimitOptions = [
  { value: '4', label: '4 products' },
  { value: '8', label: '8 products' },
  { value: '12', label: '12 products' },
] as const;

const sortOptions: Array<{ value: HomepageBrandProductSortKey; label: string }> = [
  { value: 'newest', label: 'Newest products' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const layoutOptions: Array<{ value: HomepageBrandProductLayout; label: string; previewLabel: string }> = [
  { value: 'grid', label: 'Grid', previewLabel: 'Product grid' },
  { value: 'rail', label: 'Horizontal rail', previewLabel: 'Product rail' },
];

const emptyForm: SectionForm = {
  title: '',
  subtitle: '',
  target_id: '',
  product_limit: '8',
  sort_key: 'newest',
  layout: 'grid',
  is_active: true,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function getBlockLabel(value: HomepageBlockType | ''): string {
  if (!value) return 'Select block type';
  return blockTypeOptions.find(option => option.value === value)?.label || value;
}

function isFixedBlockType(value: HomepageBlockType | ''): value is HomepageBlockType {
  return Boolean(value && fixedBlockTypes.includes(value));
}

function isReferencedBlockType(value: HomepageBlockType | ''): value is HomepageBlockType {
  return Boolean(value && referencedBlockTypes.includes(value));
}

function isLockedHomepageBlockType(value: HomepageBlockType | ''): value is HomepageBlockType {
  return Boolean(value && lockedHomepageBlockTypes.includes(value));
}

function getBlockReferenceLabel(
  block: HomepageBlock,
  brandSections: HomepageBrandProductSection[],
  categorySections: HomepageCategoryProductSection[],
  promotions: PromotionOption[]
): string {
  if (block.block_type === 'brand_product_section') {
    const section = brandSections.find(item => item.id === block.brand_product_section_id);
    return section?.title || 'Missing brand section';
  }

  if (block.block_type === 'category_product_section') {
    const section = categorySections.find(item => item.id === block.category_product_section_id);
    return section?.title || 'Missing category section';
  }

  if (block.block_type === 'promotion_banner') {
    const promotion = promotions.find(item => item.id === block.promotion_id);
    return promotion?.title || 'Missing promotion';
  }

  return 'Fixed homepage block';
}

function getBlockReferenceDetail(
  block: HomepageBlock,
  brandSections: HomepageBrandProductSection[],
  categorySections: HomepageCategoryProductSection[],
  promotions: PromotionOption[]
): string {
  if (block.block_type === 'brand_product_section') {
    const section = brandSections.find(item => item.id === block.brand_product_section_id);
    return section?.brand?.name || 'Brand section reference';
  }

  if (block.block_type === 'category_product_section') {
    const section = categorySections.find(item => item.id === block.category_product_section_id);
    return section?.category?.name || 'Category section reference';
  }

  if (block.block_type === 'promotion_banner') {
    const promotion = promotions.find(item => item.id === block.promotion_id);
    return promotion?.is_active === false ? 'Inactive promotion' : 'Promotion banner';
  }

  return blockTypeOptions.find(option => option.value === block.block_type)?.description || 'Homepage block';
}

function validateBlockForm(form: BlockForm): BlockFormErrors {
  const errors: BlockFormErrors = {};

  if (!form.block_type) {
    errors.block_type = 'Choose a block type.';
    return errors;
  }

  if (form.block_type === 'brand_product_section' && !form.brand_product_section_id) {
    errors.brand_product_section_id = 'Choose a brand product section.';
  }

  if (form.block_type === 'category_product_section' && !form.category_product_section_id) {
    errors.category_product_section_id = 'Choose a category product section.';
  }

  if (form.block_type === 'promotion_banner' && !form.promotion_id) {
    errors.promotion_id = 'Choose a promotion banner.';
  }

  return errors;
}

function buildBlockPayload(form: BlockForm): BlockPayload | null {
  if (!form.block_type) return null;

  const payload: BlockPayload = {
    block_type: form.block_type,
    is_active: form.is_active,
  };

  if (form.block_type === 'brand_product_section') {
    payload.brand_product_section_id = form.brand_product_section_id;
  }

  if (form.block_type === 'category_product_section') {
    payload.category_product_section_id = form.category_product_section_id;
  }

  if (form.block_type === 'promotion_banner') {
    payload.promotion_id = Number(form.promotion_id);
  }

  return payload;
}

function reorderById<T extends { id: string; display_order: number }>(
  items: T[],
  id: string,
  direction: 'up' | 'down'
): T[] {
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return items;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const nextItems = [...items];
  [nextItems[index], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[index]];

  return nextItems.map((item, nextIndex) => ({
    ...item,
    display_order: nextIndex,
  }));
}

function normalizeDisplayOrder<T extends { display_order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({
    ...item,
    display_order: index,
  }));
}

function getSortLabel(value: HomepageBrandProductSortKey): string {
  return sortOptions.find(option => option.value === value)?.label || value;
}

function getLayoutLabel(value: HomepageBrandProductLayout): string {
  return layoutOptions.find(option => option.value === value)?.label || value;
}

function getLayoutPreviewLabel(value: HomepageBrandProductLayout): string {
  return layoutOptions.find(option => option.value === value)?.previewLabel || value;
}

function buildForm(section?: ManagedHomepageSection | null, targetId?: number): SectionForm {
  if (!section) return emptyForm;

  return {
    title: section.title,
    subtitle: section.subtitle || '',
    target_id: String(targetId || ''),
    product_limit: String(section.product_limit) as SectionForm['product_limit'],
    sort_key: section.sort_key,
    layout: section.layout,
    is_active: section.is_active,
  };
}

function validateForm(form: SectionForm, targetLabel: string): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required.';
  } else if (form.title.trim().length > 255) {
    errors.title = 'Title must be under 255 characters.';
  }

  if (form.subtitle.trim().length > 1000) {
    errors.subtitle = 'Subtitle must be under 1000 characters.';
  }

  if (!form.target_id) {
    errors.target_id = `${targetLabel} is required.`;
  }

  if (!productLimitOptions.some(option => option.value === form.product_limit)) {
    errors.product_limit = 'Choose a valid product limit.';
  }

  if (!sortOptions.some(option => option.value === form.sort_key)) {
    errors.sort_key = 'Choose a valid sort option.';
  }

  if (!layoutOptions.some(option => option.value === form.layout)) {
    errors.layout = 'Choose a valid layout.';
  }

  return errors;
}

function getSectionTargetId(section: ManagedHomepageSection, kind: SectionKind): number {
  return kind === 'brand'
    ? (section as HomepageBrandProductSection).brand_id
    : (section as HomepageCategoryProductSection).category_id;
}

function getSectionEntity(section: ManagedHomepageSection, kind: SectionKind): EntityOption | null {
  if (kind === 'brand') {
    const brand = (section as HomepageBrandProductSection).brand;
    return brand ? { id: brand.id, name: brand.name, slug: brand.slug, isAvailable: brand.is_active } : null;
  }

  const category = (section as HomepageCategoryProductSection).category;
  return category ? { id: category.id, name: category.name, slug: category.slug, isAvailable: true } : null;
}

interface SectionManagerProps<T extends ManagedHomepageSection> {
  kind: SectionKind;
  title: string;
  description: string;
  addLabel: string;
  targetLabel: string;
  emptyMessage: string;
  endpoint: string;
  targetPayloadKey: 'brand_id' | 'category_id';
  targetOptions: EntityOption[];
  sections: T[];
  setSections: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean;
  pageError: string;
  onReload: () => Promise<void>;
}

function SectionManager<T extends ManagedHomepageSection>({
  kind,
  title,
  description,
  addLabel,
  targetLabel,
  emptyMessage,
  endpoint,
  targetPayloadKey,
  targetOptions,
  sections,
  setSections,
  loading,
  pageError,
  onReload,
}: SectionManagerProps<T>) {
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<T | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<T | null>(null);
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const selectedTarget = targetOptions.find(option => String(option.id) === form.target_id);
  const previewSummary = `${getLayoutPreviewLabel(form.layout)} · ${selectedTarget?.name || `Select ${targetLabel.toLowerCase()}`} · ${getSortLabel(form.sort_key)} · ${form.product_limit} products`;

  function openModal(section?: T) {
    const targetId = section ? getSectionTargetId(section, kind) : undefined;
    setEditingSection(section || null);
    setForm(buildForm(section, targetId));
    setFormErrors({});
    setModalOpen(true);
  }

  async function saveSection(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateForm(form, targetLabel);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: SectionPayload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      product_limit: Number(form.product_limit),
      sort_key: form.sort_key,
      layout: form.layout,
      is_active: form.is_active,
    };

    const nextTargetId = Number(form.target_id);
    if (!editingSection || nextTargetId !== getSectionTargetId(editingSection, kind)) {
      payload[targetPayloadKey] = nextTargetId;
    }

    setSaving(true);

    try {
      if (editingSection) {
        await api.put(`${endpoint}/${editingSection.id}`, payload);
        addToast(`${targetLabel} section updated.`, 'success');
      } else {
        await api.post(endpoint, payload);
        addToast(`${targetLabel} section created.`, 'success');
      }

      setModalOpen(false);
      await onReload();
    } catch (error) {
      setFormErrors({ api: getErrorMessage(error, `Failed to save ${targetLabel.toLowerCase()} section.`) });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection() {
    if (!sectionToDelete) return;

    setDeleting(true);

    try {
      await api.delete(`${endpoint}/${sectionToDelete.id}`);
      addToast(`${targetLabel} section deleted.`, 'success');
      setSections(current => normalizeDisplayOrder(current.filter(section => section.id !== sectionToDelete.id)));
      setSectionToDelete(null);
    } catch (error) {
      addToast(getErrorMessage(error, `Failed to delete ${targetLabel.toLowerCase()} section.`), 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function moveSection(section: T, direction: 'up' | 'down') {
    setMovingId(section.id);

    try {
      await api.post(`${endpoint}/${section.id}/move-${direction}`);
      setSections(current => reorderById(current, section.id, direction));
    } catch (error) {
      addToast(getErrorMessage(error, `Failed to reorder ${targetLabel.toLowerCase()} sections.`), 'error');
    } finally {
      setMovingId(null);
    }
  }

  const inputClasses = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15';
  const errorClasses = 'mt-1 text-xs font-medium text-danger';

  const columns = [
    {
      header: 'Section',
      cell: (section: T) => (
        <div className="min-w-64">
          <p className="font-semibold text-[#0B1B48]">{section.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {section.subtitle || 'No subtitle'}
          </p>
        </div>
      ),
    },
    {
      header: targetLabel,
      cell: (section: T) => {
        const entity = getSectionEntity(section, kind);

        return (
          <div>
            <p className="font-medium text-[#0B1B48]">{entity?.name || `Missing ${targetLabel.toLowerCase()}`}</p>
            <p className="mt-1 text-xs text-slate-500">{entity?.slug ? `/${entity.slug}` : 'Check section setup'}</p>
          </div>
        );
      },
    },
    {
      header: 'Rules',
      cell: (section: T) => (
        <div className="space-y-1 text-sm text-slate-600">
          <p>{section.product_limit} products</p>
          <p>{getSortLabel(section.sort_key)}</p>
          <p>{getLayoutLabel(section.layout)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (section: T) => (
        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${section.is_active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
          {section.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Position',
      cell: (section: T) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          #{section.display_order + 1}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (section: T) => {
        const index = sections.findIndex(item => item.id === section.id);
        const isFirst = index <= 0;
        const isLast = index === sections.length - 1;
        const isMoving = movingId === section.id;

        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void moveSection(section, 'up')}
              disabled={isFirst || isMoving}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-35"
              aria-label={`Move ${section.title} up`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void moveSection(section, 'down')}
              disabled={isLast || isMoving}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-35"
              aria-label={`Move ${section.title} down`}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openModal(section)}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-accent/10 hover:text-accent"
              aria-label={`Edit ${section.title}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSectionToDelete(section)}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label={`Delete ${section.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0B1B48]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-glow"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      </div>

      {pageError && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {pageError}
        </div>
      )}

      <DataTable
        data={sections}
        columns={columns}
        keyExtractor={(section) => section.id}
        emptyMessage={emptyMessage}
        loading={loading}
        renderMobileCard={(section) => {
          const entity = getSectionEntity(section, kind);
          const index = sections.findIndex(item => item.id === section.id);
          const isFirst = index <= 0;
          const isLast = index === sections.length - 1;
          const isMoving = movingId === section.id;
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0B1B48]">{section.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{section.subtitle || 'No subtitle'}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${section.is_active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                  {section.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{entity?.name || `Missing ${targetLabel.toLowerCase()}`}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">#{section.display_order + 1}</span>
              </div>
              <p className="text-xs text-slate-500">{section.product_limit} products · {getSortLabel(section.sort_key)} · {getLayoutLabel(section.layout)}</p>
              <div className="flex items-center gap-1 pt-1">
                <button type="button" onClick={() => void moveSection(section, 'up')} disabled={isFirst || isMoving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-35" aria-label={`Move ${section.title} up`}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => void moveSection(section, 'down')} disabled={isLast || isMoving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-35" aria-label={`Move ${section.title} down`}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => openModal(section)} className="rounded-lg p-2 text-slate-500 hover:bg-accent/10 hover:text-accent" aria-label={`Edit ${section.title}`}>
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setSectionToDelete(section)} className="rounded-lg p-2 text-slate-500 hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${section.title}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSection ? `Edit ${targetLabel} Product Section` : `Add ${targetLabel} Product Section`}
      >
        <form onSubmit={saveSection} className="space-y-5">
          {formErrors.api && (
            <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {formErrors.api}
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Title *</span>
            <input
              required
              maxLength={255}
              className={inputClasses}
              placeholder={kind === 'brand' ? 'Samsung picks' : 'Latest smartphones'}
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
            />
            {formErrors.title && <p className={errorClasses}>{formErrors.title}</p>}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Subtitle</span>
            <textarea
              rows={3}
              maxLength={1000}
              className={inputClasses}
              placeholder="Optional short supporting line"
              value={form.subtitle}
              onChange={event => setForm({ ...form, subtitle: event.target.value })}
            />
            {formErrors.subtitle && <p className={errorClasses}>{formErrors.subtitle}</p>}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">{targetLabel} *</span>
            <select
              required
              className={inputClasses}
              value={form.target_id}
              onChange={event => setForm({ ...form, target_id: event.target.value })}
            >
              <option value="">Choose a {targetLabel.toLowerCase()}</option>
              {targetOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}{option.isAvailable === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
            {formErrors.target_id && <p className={errorClasses}>{formErrors.target_id}</p>}
            {targetOptions.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">Create a {targetLabel.toLowerCase()} before adding this section.</p>
            )}
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Product limit</span>
              <select
                className={inputClasses}
                value={form.product_limit}
                onChange={event => setForm({ ...form, product_limit: event.target.value as SectionForm['product_limit'] })}
              >
                {productLimitOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {formErrors.product_limit && <p className={errorClasses}>{formErrors.product_limit}</p>}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Sort</span>
              <select
                className={inputClasses}
                value={form.sort_key}
                onChange={event => setForm({ ...form, sort_key: event.target.value as HomepageBrandProductSortKey })}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {formErrors.sort_key && <p className={errorClasses}>{formErrors.sort_key}</p>}
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-semibold text-[#0B1B48]">Layout</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {layoutOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    form.layout === option.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-accent/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`${kind}-layout`}
                    value={option.value}
                    checked={form.layout === option.value}
                    onChange={() => setForm({ ...form, layout: option.value })}
                    className="h-4 w-4 accent-accent"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {formErrors.layout && <p className={errorClasses}>{formErrors.layout}</p>}
          </fieldset>

          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={event => setForm({ ...form, is_active: event.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Active on homepage
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Preview summary</p>
            <p className="mt-2 text-sm font-semibold text-[#0B1B48]">{previewSummary}</p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || targetOptions.length === 0}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-glow disabled:pointer-events-none disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Section'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(sectionToDelete)}
        title={`Delete ${targetLabel.toLowerCase()} section`}
        description={`Delete "${sectionToDelete?.title || 'this section'}"? This removes the controlled homepage section only. Products are not deleted.`}
        confirmLabel="Delete section"
        loading={deleting}
        onCancel={() => setSectionToDelete(null)}
        onConfirm={() => void deleteSection()}
      />
    </section>
  );
}

interface HomepageBlocksManagerProps {
  blocks: HomepageBlock[];
  brandSections: HomepageBrandProductSection[];
  categorySections: HomepageCategoryProductSection[];
  promotions: PromotionOption[];
  setBlocks: React.Dispatch<React.SetStateAction<HomepageBlock[]>>;
  loading: boolean;
  pageError: string;
  onReload: () => Promise<void>;
}

function HomepageBlocksManager({
  blocks,
  brandSections,
  categorySections,
  promotions,
  setBlocks,
  loading,
  pageError,
  onReload,
}: HomepageBlocksManagerProps) {
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BlockForm>(emptyBlockForm);
  const [formErrors, setFormErrors] = useState<BlockFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<HomepageBlock | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const existingFixedTypes = useMemo(() => (
    new Set(blocks.filter(block => isFixedBlockType(block.block_type)).map(block => block.block_type))
  ), [blocks]);

  const selectedType = form.block_type;
  const selectedBlockOption = blockTypeOptions.find(option => option.value === selectedType);
  const availableTypeOptions = blockTypeOptions.map(option => ({
    ...option,
    disabled: isLockedHomepageBlockType(option.value) || (fixedBlockTypes.includes(option.value) && existingFixedTypes.has(option.value)),
    disabledReason: isLockedHomepageBlockType(option.value)
      ? 'fixed'
      : fixedBlockTypes.includes(option.value) && existingFixedTypes.has(option.value)
        ? 'already added'
        : '',
  }));

  const inputClasses = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15';
  const errorClasses = 'mt-1 text-xs font-medium text-danger';

  function openAddModal() {
    setForm(emptyBlockForm);
    setFormErrors({});
    setModalOpen(true);
  }

  async function saveBlock(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateBlockForm(form);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    const payload = buildBlockPayload(form);
    if (!payload) return;

    setSaving(true);
    try {
      await api.post('/api/admin/homepage/blocks', payload);
      addToast('Homepage block added.', 'success');
      setModalOpen(false);
      await onReload();
    } catch (error) {
      setFormErrors({ api: getErrorMessage(error, 'Failed to add homepage block.') });
    } finally {
      setSaving(false);
    }
  }

  async function toggleBlock(block: HomepageBlock) {
    if (isLockedHomepageBlockType(block.block_type)) return;

    setUpdatingId(block.id);
    try {
      await api.put(`/api/admin/homepage/blocks/${block.id}`, {
        is_active: !block.is_active,
      });
      addToast(block.is_active ? 'Homepage block hidden.' : 'Homepage block activated.', 'success');
      setBlocks(current => current.map(item => (
        item.id === block.id ? { ...item, is_active: !block.is_active } : item
      )));
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to update homepage block.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function moveBlock(block: HomepageBlock, direction: 'up' | 'down') {
    if (isLockedHomepageBlockType(block.block_type)) return;

    setMovingId(block.id);
    try {
      await api.post(`/api/admin/homepage/blocks/${block.id}/move-${direction}`);
      setBlocks(current => reorderById(current, block.id, direction));
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to reorder homepage blocks.'), 'error');
    } finally {
      setMovingId(null);
    }
  }

  async function deleteBlock() {
    if (!blockToDelete) return;
    if (isLockedHomepageBlockType(blockToDelete.block_type)) {
      setBlockToDelete(null);
      return;
    }

    setConfirming(true);
    try {
      await api.delete(`/api/admin/homepage/blocks/${blockToDelete.id}`);
      addToast('Homepage block removed.', 'success');
      setBlocks(current => normalizeDisplayOrder(current.filter(block => block.id !== blockToDelete.id)));
      setBlockToDelete(null);
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to remove homepage block.'), 'error');
    } finally {
      setConfirming(false);
    }
  }

  async function resetDefaults() {
    setConfirming(true);
    try {
      await api.post('/api/admin/homepage/blocks/reset-defaults');
      addToast('Default homepage block order restored.', 'success');
      setResetOpen(false);
      await onReload();
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to reset homepage blocks.'), 'error');
    } finally {
      setConfirming(false);
    }
  }

  const columns = [
    {
      header: 'Block',
      cell: (block: HomepageBlock) => (
        <div className="min-w-64">
          <p className="font-semibold text-[#0B1B48]">{getBlockLabel(block.block_type)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {getBlockReferenceDetail(block, brandSections, categorySections, promotions)}
          </p>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (block: HomepageBlock) => (
        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
          isLockedHomepageBlockType(block.block_type)
            ? 'bg-slate-100 text-slate-600'
            : 'bg-blue-50 text-accent'
        }`}>
          {isLockedHomepageBlockType(block.block_type)
            ? 'Locked'
            : isReferencedBlockType(block.block_type) ? 'Referenced' : 'Fixed'}
        </span>
      ),
    },
    {
      header: 'Reference',
      cell: (block: HomepageBlock) => (
        <div>
          <p className="font-medium text-[#0B1B48]">
            {getBlockReferenceLabel(block, brandSections, categorySections, promotions)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Order #{block.display_order + 1}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (block: HomepageBlock) => {
        if (isLockedHomepageBlockType(block.block_type)) {
          return (
            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Fixed
            </span>
          );
        }

        return (
          <button
            type="button"
            onClick={() => void toggleBlock(block)}
            disabled={updatingId === block.id}
            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60 ${
              block.is_active ? 'bg-success/10 text-success hover:bg-success/15' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            aria-label={`${block.is_active ? 'Deactivate' : 'Activate'} ${getBlockLabel(block.block_type)}`}
          >
            {block.is_active ? 'Active' : 'Inactive'}
          </button>
        );
      },
    },
    {
      header: 'Actions',
      cell: (block: HomepageBlock) => {
        if (isLockedHomepageBlockType(block.block_type)) {
          return (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              Fixed position
            </span>
          );
        }

        const index = blocks.findIndex(item => item.id === block.id);
        const isFirst = index <= 0;
        const isLast = index === blocks.length - 1;
        const isMoving = movingId === block.id;

        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void moveBlock(block, 'up')}
              disabled={isFirst || isMoving}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-35"
              aria-label={`Move ${getBlockLabel(block.block_type)} up`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void moveBlock(block, 'down')}
              disabled={isLast || isMoving}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-35"
              aria-label={`Move ${getBlockLabel(block.block_type)} down`}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setBlockToDelete(block)}
              className="rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label={`Remove ${getBlockLabel(block.block_type)}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0B1B48]">Homepage Blocks</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Control the order of major homepage sections with safe block types and move buttons. Display order is not manually editable.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-glow"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </button>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
          >
            <RotateCcw className="h-4 w-4" />
            Reset default order
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {pageError}
        </div>
      )}

      <DataTable
        data={blocks}
        columns={columns}
        keyExtractor={(block) => block.id}
        emptyMessage="No homepage blocks yet."
        loading={loading}
        renderMobileCard={(block) => {
          const index = blocks.findIndex(item => item.id === block.id);
          const isFirst = index <= 0;
          const isLast = index === blocks.length - 1;
          const isMoving = movingId === block.id;
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0B1B48]">{getBlockLabel(block.block_type)}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{getBlockReferenceDetail(block, brandSections, categorySections, promotions)}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                  isLockedHomepageBlockType(block.block_type) ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-accent'
                }`}>
                  {isLockedHomepageBlockType(block.block_type) ? 'Locked' : isReferencedBlockType(block.block_type) ? 'Referenced' : 'Fixed'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{getBlockReferenceLabel(block, brandSections, categorySections, promotions)}</span>
                <span>Order #{block.display_order + 1}</span>
              </div>
              {isLockedHomepageBlockType(block.block_type) ? (
                <p className="text-xs text-slate-400">Fixed position</p>
              ) : (
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => void toggleBlock(block)} disabled={updatingId === block.id}
                    className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      block.is_active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                    }`} aria-label={`${block.is_active ? 'Deactivate' : 'Activate'} ${getBlockLabel(block.block_type)}`}>
                    {block.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <div className="flex items-center gap-1">
                    {!isLockedHomepageBlockType(block.block_type) && (
                      <>
                        <button type="button" onClick={() => void moveBlock(block, 'up')} disabled={isFirst || isMoving} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-35" aria-label={`Move ${getBlockLabel(block.block_type)} up`}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => void moveBlock(block, 'down')} disabled={isLast || isMoving} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-35" aria-label={`Move ${getBlockLabel(block.block_type)} down`}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setBlockToDelete(block)} className="rounded-lg p-1.5 text-slate-500 hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${getBlockLabel(block.block_type)}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Homepage Block">
        <form onSubmit={saveBlock} className="space-y-5">
          {formErrors.api && (
            <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {formErrors.api}
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Block type *</span>
            <select
              required
              className={inputClasses}
              value={form.block_type}
              onChange={event => setForm({
                ...emptyBlockForm,
                block_type: event.target.value as HomepageBlockType | '',
              })}
            >
              <option value="">Choose block type</option>
              {availableTypeOptions.map(option => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}{option.disabledReason ? ` (${option.disabledReason})` : ''}
                </option>
              ))}
            </select>
            {formErrors.block_type && <p className={errorClasses}>{formErrors.block_type}</p>}
            {selectedBlockOption && (
              <p className="mt-1 text-xs text-slate-500">{selectedBlockOption.description}</p>
            )}
          </label>

          {selectedType === 'brand_product_section' && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Brand product section *</span>
              <select
                required
                className={inputClasses}
                value={form.brand_product_section_id}
                onChange={event => setForm({ ...form, brand_product_section_id: event.target.value })}
              >
                <option value="">Choose brand product section</option>
                {brandSections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.title}{section.brand?.name ? ` · ${section.brand.name}` : ''}
                  </option>
                ))}
              </select>
              {formErrors.brand_product_section_id && <p className={errorClasses}>{formErrors.brand_product_section_id}</p>}
            </label>
          )}

          {selectedType === 'category_product_section' && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Category product section *</span>
              <select
                required
                className={inputClasses}
                value={form.category_product_section_id}
                onChange={event => setForm({ ...form, category_product_section_id: event.target.value })}
              >
                <option value="">Choose category product section</option>
                {categorySections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.title}{section.category?.name ? ` · ${section.category.name}` : ''}
                  </option>
                ))}
              </select>
              {formErrors.category_product_section_id && <p className={errorClasses}>{formErrors.category_product_section_id}</p>}
            </label>
          )}

          {selectedType === 'promotion_banner' && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0B1B48]">Promotion banner *</span>
              <select
                required
                className={inputClasses}
                value={form.promotion_id}
                onChange={event => setForm({ ...form, promotion_id: event.target.value })}
              >
                <option value="">Choose promotion</option>
                {promotions.map(promotion => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.title}{promotion.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
              {formErrors.promotion_id && <p className={errorClasses}>{formErrors.promotion_id}</p>}
            </label>
          )}

          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={event => setForm({ ...form, is_active: event.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Active on homepage
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Summary</p>
            <p className="mt-2 text-sm font-semibold text-[#0B1B48]">
              {getBlockLabel(form.block_type)}
              {isFixedBlockType(form.block_type) ? ' · fixed block' : ''}
              {form.is_active ? ' · active' : ' · inactive'}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.block_type}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-glow disabled:pointer-events-none disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add Block'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(blockToDelete)}
        title="Remove homepage block"
        description={`Remove "${blockToDelete ? getBlockLabel(blockToDelete.block_type) : 'this block'}" from homepage ordering? Referenced sections, products, and promotions are not deleted.`}
        confirmLabel="Remove block"
        loading={confirming}
        onCancel={() => setBlockToDelete(null)}
        onConfirm={() => void deleteBlock()}
      />

      <ConfirmDialog
        isOpen={resetOpen}
        title="Reset homepage block order"
        description="This restores the safe fixed homepage blocks and removes custom block ordering. Brand, category, and promotion sections are not deleted."
        confirmLabel="Reset defaults"
        loading={confirming}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => void resetDefaults()}
      />
    </section>
  );
}

export default function AdminHomepagePage() {
  const [homepageBlocks, setHomepageBlocks] = useState<HomepageBlock[]>([]);
  const [brandSections, setBrandSections] = useState<HomepageBrandProductSection[]>([]);
  const [categorySections, setCategorySections] = useState<HomepageCategoryProductSection[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<PromotionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const brandOptions = useMemo<EntityOption[]>(() => (
    brands
      .filter(brand => brand.is_active || brandSections.some(section => section.brand_id === brand.id))
      .map(brand => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        isAvailable: brand.is_active,
      }))
  ), [brands, brandSections]);

  const categoryOptions = useMemo<EntityOption[]>(() => (
    categories.map(category => ({
      id: category.id,
      name: category.depth > 0 ? `${'— '.repeat(category.depth)}${category.name}` : category.name,
      slug: category.slug,
      isAvailable: true,
    }))
  ), [categories]);

  async function fetchData() {
    setLoading(true);
    setPageError('');

    try {
      const [blockResponse, brandSectionResponse, categorySectionResponse, promotionResponse, brandResponse, categoryResponse] = await Promise.all([
        api.get<{ success: boolean; blocks: HomepageBlock[] }>('/api/admin/homepage/blocks'),
        api.get<{ success: boolean; sections: HomepageBrandProductSection[] }>('/api/admin/homepage/brand-product-sections'),
        api.get<{ success: boolean; sections: HomepageCategoryProductSection[] }>('/api/admin/homepage/category-product-sections'),
        api.get<{ success: boolean; promotions: PromotionOption[] }>('/api/admin/promotions'),
        api.get<{ success: boolean; brands: Brand[] }>('/api/admin/brands'),
        api.get<{ success: boolean; categories: Category[] }>('/api/admin/categories'),
      ]);

      if (blockResponse.success) {
        setHomepageBlocks(blockResponse.blocks || []);
      }

      if (brandSectionResponse.success) {
        setBrandSections(brandSectionResponse.sections || []);
      }

      if (categorySectionResponse.success) {
        setCategorySections(categorySectionResponse.sections || []);
      }

      if (promotionResponse.success) {
        setPromotions(promotionResponse.promotions || []);
      }

      if (brandResponse.success) {
        setBrands(brandResponse.brands || []);
      }

      if (categoryResponse.success) {
        setCategories(categoryResponse.categories || []);
      }
    } catch (error) {
      setPageError(getErrorMessage(error, 'Failed to load homepage sections.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-accent">
          <Home className="h-3.5 w-3.5" />
          Homepage content
        </div>
        <h1 className="text-2xl font-bold text-[#0B1B48]">Controlled Product Sections</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Manage homepage ordering and controlled product sections. Ordering is managed with move buttons only.
        </p>
      </div>

      <HomepageBlocksManager
        blocks={homepageBlocks}
        brandSections={brandSections}
        categorySections={categorySections}
        promotions={promotions}
        setBlocks={setHomepageBlocks}
        loading={loading}
        pageError={pageError}
        onReload={fetchData}
      />

      <SectionManager
        kind="brand"
        title="Brand Product Sections"
        description="Create homepage blocks such as Samsung picks or Apple deals from existing brand data."
        addLabel="Add Brand Section"
        targetLabel="Brand"
        emptyMessage="No brand product sections yet."
        endpoint="/api/admin/homepage/brand-product-sections"
        targetPayloadKey="brand_id"
        targetOptions={brandOptions}
        sections={brandSections}
        setSections={setBrandSections}
        loading={loading}
        pageError={pageError}
        onReload={fetchData}
      />

      <SectionManager
        kind="category"
        title="Category Product Sections"
        description="Create homepage blocks such as Latest Smartphones, Gaming Accessories, or Popular Headphones from existing categories."
        addLabel="Add Category Section"
        targetLabel="Category"
        emptyMessage="No category product sections yet."
        endpoint="/api/admin/homepage/category-product-sections"
        targetPayloadKey="category_id"
        targetOptions={categoryOptions}
        sections={categorySections}
        setSections={setCategorySections}
        loading={loading}
        pageError={pageError}
        onReload={fetchData}
      />
    </div>
  );
}
