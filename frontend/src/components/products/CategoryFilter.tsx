'use client';

import Image from 'next/image';
import { Category } from '@/lib/types';

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
          selected === null
            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
            : 'bg-bg-surface text-text-muted border-slate-200 hover:border-slate-300 hover:text-text-primary'
        }`}
      >
        All
      </button>

      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.slug === selected ? null : cat.slug)}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
            selected === cat.slug
              ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
              : 'bg-bg-surface text-text-muted border-slate-200 hover:border-slate-300 hover:text-text-primary'
          }`}
        >
          {cat.image_url && (
            <div className="relative w-5 h-5">
              <Image src={cat.image_url} alt={cat.name} fill className="object-contain" />
            </div>
          )}
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
