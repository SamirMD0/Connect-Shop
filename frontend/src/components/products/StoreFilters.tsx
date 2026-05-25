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
  currentBrand: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  specKey: string;
  specValue: string;
}

export function StoreFilters({
  categories,
  currentCategory,
  currentSearch,
  currentSort,
  currentBrand,
  minPrice,
  maxPrice,
  minRating,
  specKey,
  specValue,
}: Props) {
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
      if (
        'category' in updates ||
        'search' in updates ||
        'sort' in updates ||
        'brand' in updates ||
        'min_price' in updates ||
        'max_price' in updates ||
        'min_rating' in updates ||
        'spec_key' in updates ||
        'spec_value' in updates
      ) {
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

      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CategoryFilter
            categories={categories}
            selected={currentCategory}
            onSelect={(slug) => updateParams({ category: slug })}
          />
        </div>

        <div className="flex gap-4 flex-wrap lg:flex-nowrap">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Brand"
              value={currentBrand}
              onChange={(e) => updateParams({ brand: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => updateParams({ min_price: e.target.value })}
              className="w-24 px-3 py-2 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
            <span className="text-text-muted">-</span>
            <input
              type="number"
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => updateParams({ max_price: e.target.value })}
              className="w-24 px-3 py-2 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={minRating}
              onChange={(e) => updateParams({ min_rating: e.target.value })}
              className="appearance-none w-full lg:w-40 px-4 py-2 pr-10 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer transition-all"
            >
              <option value="">Any rating</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
              <option value="2">2+ stars</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Spec"
              value={specKey}
              onChange={(e) => updateParams({ spec_key: e.target.value })}
              className="w-24 px-3 py-2 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
            <input
              type="text"
              placeholder="Value"
              value={specValue}
              onChange={(e) => updateParams({ spec_value: e.target.value })}
              className="w-28 px-3 py-2 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
