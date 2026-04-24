'use client';

import { Category } from '@/lib/types';

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

const categoryIcons: Record<string, string> = {
  smartphone: '📱',
  laptop: '💻',
  headphones: '🎧',
  watch: '⌚',
  gamepad: '🎮',
  cable: '🔌',
};

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
          selected === null
            ? 'bg-accent text-white border-accent shadow-[0_0_15px_rgba(99,102,241,0.3)]'
            : 'bg-bg-surface/50 text-text-muted border-white/10 hover:border-white/20 hover:text-text-primary'
        }`}
      >
        All
      </button>

      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.slug === selected ? null : cat.slug)}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
            selected === cat.slug
              ? 'bg-accent text-white border-accent shadow-[0_0_15px_rgba(99,102,241,0.3)]'
              : 'bg-bg-surface/50 text-text-muted border-white/10 hover:border-white/20 hover:text-text-primary'
          }`}
        >
          <span>{categoryIcons[cat.icon || ''] || '📦'}</span>
          <span>{cat.name}</span>
          {cat.product_count !== undefined && (
            <span className="text-xs opacity-60">({cat.product_count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
