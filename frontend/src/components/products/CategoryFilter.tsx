'use client';

import { Category } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
  layout?: 'rail' | 'stack';
}

export function CategoryFilter({ categories, selected, onSelect, layout = 'rail' }: CategoryFilterProps) {
  const isStack = layout === 'stack';
  const containerClasses = isStack
    ? 'grid gap-2'
    : 'flex gap-2 overflow-x-auto pb-2 scrollbar-hide';
  const buttonClasses = isStack
    ? 'flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all duration-200'
    : 'flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200';

  return (
    <div className={containerClasses}>
      {/* All */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`${buttonClasses} ${
          selected === null
            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
            : 'bg-bg-surface text-text-muted border-slate-200 hover:border-slate-300 hover:text-text-primary'
        }`}
      >
        All
      </button>

      {categories.map(cat => (
        <button
          type="button"
          key={cat.id}
          onClick={() => onSelect(cat.slug === selected ? null : cat.slug)}
          aria-pressed={selected === cat.slug}
          className={`${buttonClasses} ${
            selected === cat.slug
              ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
              : 'bg-bg-surface text-text-muted border-slate-200 hover:border-slate-300 hover:text-text-primary'
          }`}
        >
          {cat.image_url && (
            <div className="relative w-5 h-5">
              <SafeImage
                src={cat.image_url}
                alt={cat.name}
                fill
                className="object-contain"
                fallback={null}
              />
            </div>
          )}
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
