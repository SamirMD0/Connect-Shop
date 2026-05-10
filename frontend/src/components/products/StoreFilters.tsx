'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CategoryFilter } from './CategoryFilter';
import { SearchBar } from './SearchBar';
import { Category } from '@/lib/types';
import { ChevronDown } from 'lucide-react';

interface Props {
  categories: Category[];
  currentCategory: string | null;
  currentSearch: string;
  currentSort: string;
}

export function StoreFilters({ categories, currentCategory, currentSearch, currentSort }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if ('category' in updates || 'search' in updates || 'sort' in updates) {
        params.delete('page');
      }
      router.push(`/store?${params.toString()}`);
    },
    [searchParams, router]
  );

  return (
    <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-4 mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            value={currentSearch}
            onChange={(v) => updateParams({ search: v })}
          />
        </div>
        
        <div className="relative">
          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="appearance-none w-full lg:w-48 px-4 py-3 pr-10 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer transition-all"
          >
            <option value="">Sort: Default</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="rating">Highest Rated</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <CategoryFilter
          categories={categories}
          selected={currentCategory}
          onSelect={(slug) => updateParams({ category: slug })}
        />
      </div>
    </div>
  );
}
