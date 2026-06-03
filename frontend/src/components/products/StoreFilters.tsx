'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CategoryFilter } from './CategoryFilter';
import { SearchBar } from './SearchBar';
import { Category } from '@/lib/types';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoryNameBySlug = useMemo(() => {
    return new Map(categories.map(category => [category.slug, category.name]));
  }, [categories]);

  const sortLabels: Record<string, string> = {
    price_asc: 'Price: Low to High',
    price_desc: 'Price: High to Low',
    newest: 'Newest First',
    rating: 'Highest Rated',
    popular: 'Most Popular',
  };

  const ratingLabels: Record<string, string> = {
    '4': '4+ stars',
    '3': '3+ stars',
    '2': '2+ stars',
  };

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
      const nextQuery = params.toString();
      router.push(nextQuery ? `/store?${nextQuery}` : '/store');
    },
    [searchParams, router]
  );

  const clearAllFilters = () => {
    router.push('/store');
  };

  const activeFilters = [
    currentSearch
      ? { key: 'search', label: 'Search', value: currentSearch, clear: () => updateParams({ search: null }) }
      : null,
    currentSort
      ? { key: 'sort', label: 'Sort', value: sortLabels[currentSort] || currentSort, clear: () => updateParams({ sort: null }) }
      : null,
    currentCategory
      ? {
          key: 'category',
          label: 'Category',
          value: categoryNameBySlug.get(currentCategory) || currentCategory.replace(/-/g, ' '),
          clear: () => updateParams({ category: null }),
        }
      : null,
    currentBrand
      ? { key: 'brand', label: 'Brand', value: currentBrand, clear: () => updateParams({ brand: null }) }
      : null,
    minPrice || maxPrice
      ? {
          key: 'price',
          label: 'Price',
          value: `${minPrice ? `$${minPrice}` : 'Any'} - ${maxPrice ? `$${maxPrice}` : 'Any'}`,
          clear: () => updateParams({ min_price: null, max_price: null }),
        }
      : null,
    minRating
      ? {
          key: 'rating',
          label: 'Rating',
          value: ratingLabels[minRating] || `${minRating}+ stars`,
          clear: () => updateParams({ min_rating: null }),
        }
      : null,
    specKey || specValue
      ? {
          key: 'spec',
          label: 'Spec',
          value: [specKey || 'Any spec', specValue || 'Any value'].join(': '),
          clear: () => updateParams({ spec_key: null, spec_value: null }),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; clear: () => void }>;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Search catalog
          </label>
          <SearchBar
            value={currentSearch}
            onChange={(v) => updateParams({ search: v })}
            ariaLabel="Search catalog products"
          />
        </div>

        <div>
          <label htmlFor="store-sort" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Sort
          </label>
          <div className="relative">
            <select
              id="store-sort"
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-bg-surface px-4 py-3 pr-10 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Default</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-bg-surface px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="store-advanced-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilters.length > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-white">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Active</span>
          {activeFilters.map(filter => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.clear}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-white"
              aria-label={`Remove ${filter.label} filter`}
            >
              <span className="truncate">
                {filter.label}: {filter.value}
              </span>
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto inline-flex min-h-8 items-center rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent"
          >
            Clear all
          </button>
        </div>
      )}

      <div
        id="store-advanced-filters"
        className={`${filtersOpen ? 'block' : 'hidden'} mt-5 border-t border-slate-100 pt-5 lg:block`}
      >
        <div className="grid gap-5">
          <section aria-labelledby="category-filter-label">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id="category-filter-label" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Categories
              </h3>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => updateParams({ category: null })}
                  className="text-xs font-semibold text-accent hover:text-[#0B1B48]"
                >
                  Clear category
                </button>
              )}
            </div>
            <CategoryFilter
              categories={categories}
              selected={currentCategory}
              onSelect={(slug) => updateParams({ category: slug })}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(150px,1fr)_minmax(220px,1.2fr)_180px_minmax(220px,1.2fr)]">
            <div>
              <label htmlFor="store-brand" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Brand
              </label>
              <input
                id="store-brand"
                type="text"
                placeholder="Apple, Samsung..."
                value={currentBrand}
                onChange={(e) => updateParams({ brand: e.target.value })}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-bg-surface px-4 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Price range
              </legend>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => updateParams({ min_price: e.target.value })}
                  aria-label="Minimum price"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <span className="text-text-muted">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => updateParams({ max_price: e.target.value })}
                  aria-label="Maximum price"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </fieldset>

            <div>
              <label htmlFor="store-rating" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Rating
              </label>
              <div className="relative">
                <select
                  id="store-rating"
                  value={minRating}
                  onChange={(e) => updateParams({ min_rating: e.target.value })}
                  className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-bg-surface px-4 py-2.5 pr-10 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Any rating</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Specification
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Spec"
                  value={specKey}
                  onChange={(e) => updateParams({ spec_key: e.target.value })}
                  aria-label="Specification name"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={specValue}
                  onChange={(e) => updateParams({ spec_value: e.target.value })}
                  aria-label="Specification value"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}
