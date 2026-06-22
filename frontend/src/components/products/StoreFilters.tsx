'use client';

import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
  const [advancedSpecsOpen, setAdvancedSpecsOpen] = useState(Boolean(specKey || specValue));
  const [brandDraft, setBrandDraft] = useState(currentBrand);
  const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);
  const [specKeyDraft, setSpecKeyDraft] = useState(specKey);
  const [specValueDraft, setSpecValueDraft] = useState(specValue);

  useEffect(() => setBrandDraft(currentBrand), [currentBrand]);
  useEffect(() => setMinPriceDraft(minPrice), [minPrice]);
  useEffect(() => setMaxPriceDraft(maxPrice), [maxPrice]);
  useEffect(() => setSpecKeyDraft(specKey), [specKey]);
  useEffect(() => setSpecValueDraft(specValue), [specValue]);

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

  const applyBrand = useCallback(() => {
    if (brandDraft !== currentBrand) updateParams({ brand: brandDraft.trim() || null });
  }, [brandDraft, currentBrand, updateParams]);

  const applyPriceRange = useCallback(() => {
    if (minPriceDraft !== minPrice || maxPriceDraft !== maxPrice) {
      updateParams({
        min_price: minPriceDraft.trim() || null,
        max_price: maxPriceDraft.trim() || null,
      });
    }
  }, [maxPrice, maxPriceDraft, minPrice, minPriceDraft, updateParams]);

  const applySpecs = useCallback(() => {
    if (specKeyDraft !== specKey || specValueDraft !== specValue) {
      updateParams({
        spec_key: specKeyDraft.trim() || null,
        spec_value: specValueDraft.trim() || null,
      });
    }
  }, [specKey, specKeyDraft, specValue, specValueDraft, updateParams]);

  const applyOnEnter = (event: KeyboardEvent<HTMLInputElement>, apply: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      apply();
    }
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
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text-primary">Filter products</h2>
          <p className="mt-1 text-xs text-text-muted">
            {activeFilters.length > 0 ? `${activeFilters.length} active` : 'Refine the catalog'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent lg:hidden"
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
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4" aria-label="Active filters">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Applied</span>
          {activeFilters.map(filter => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.clear}
              className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
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
            className="ml-auto inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-elevated hover:text-accent"
          >
            Clear all
          </button>
        </div>
      )}

      <div
        id="store-advanced-filters"
        className={`${filtersOpen ? 'block' : 'hidden'} mt-5 border-t border-border pt-5 lg:block`}
      >
        <div className="grid gap-6">
          <section aria-labelledby="search-sort-filter-label" className="space-y-4">
            <h3 id="search-sort-filter-label" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Search and sort
            </h3>
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">
                Search catalog
              </label>
              <SearchBar
                value={currentSearch}
                onChange={(v) => updateParams({ search: v })}
                placeholder="Search products by name..."
                ariaLabel="Search catalog products"
              />
            </div>

            <div>
              <label htmlFor="store-sort" className="mb-2 block text-sm font-medium text-text-primary">
                Sort results
              </label>
              <div className="relative">
                <select
                  id="store-sort"
                  value={currentSort}
                  onChange={(e) => updateParams({ sort: e.target.value })}
                  className="min-h-11 w-full appearance-none rounded-lg border border-border bg-bg-surface px-4 py-2.5 pr-10 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
          </section>

          <section aria-labelledby="category-filter-label">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id="category-filter-label" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Categories
              </h3>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => updateParams({ category: null })}
                  className="min-h-9 rounded-md px-2 text-xs font-semibold text-accent hover:bg-accent/10"
                >
                  Clear category
                </button>
              )}
            </div>
            <CategoryFilter
              categories={categories}
              selected={currentCategory}
              onSelect={(slug) => updateParams({ category: slug })}
              layout="stack"
            />
          </section>

          <section aria-labelledby="brand-filter-label">
            <h3 id="brand-filter-label" className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Brand
            </h3>
            <div className="space-y-2">
              <label htmlFor="store-brand" className="sr-only">
                Brand
              </label>
              <input
                id="store-brand"
                type="text"
                placeholder="Type a brand, then press Enter"
                value={brandDraft}
                onChange={(e) => setBrandDraft(e.target.value)}
                onBlur={applyBrand}
                onKeyDown={(e) => applyOnEnter(e, applyBrand)}
                className="min-h-11 w-full rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <p className="text-xs leading-5 text-text-muted">Use the brand name or slug. Press Enter or leave the field to apply.</p>
            </div>
          </section>

          <fieldset>
            <legend className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Price
            </legend>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min $"
                  value={minPriceDraft}
                  onChange={(e) => setMinPriceDraft(e.target.value)}
                  onBlur={applyPriceRange}
                  onKeyDown={(e) => applyOnEnter(e, applyPriceRange)}
                  aria-label="Minimum price"
                  className="min-h-11 w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <span className="text-text-muted">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max $"
                  value={maxPriceDraft}
                  onChange={(e) => setMaxPriceDraft(e.target.value)}
                  onBlur={applyPriceRange}
                  onKeyDown={(e) => applyOnEnter(e, applyPriceRange)}
                  aria-label="Maximum price"
                  className="min-h-11 w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <button
                type="button"
                onClick={applyPriceRange}
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                Apply price
              </button>
            </div>
          </fieldset>

          <section aria-labelledby="rating-filter-label">
            <h3 id="rating-filter-label" className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Rating
            </h3>
            <div className="relative">
                <select
                  id="store-rating"
                  value={minRating}
                  onChange={(e) => updateParams({ min_rating: e.target.value })}
                  className="min-h-11 w-full appearance-none rounded-lg border border-border bg-bg-surface px-4 py-2.5 pr-10 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Any rating</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </section>

          <section aria-labelledby="spec-filter-label" className="rounded-lg border border-border bg-bg-elevated p-3">
            <button
              type="button"
              onClick={() => setAdvancedSpecsOpen(open => !open)}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={advancedSpecsOpen}
              aria-controls="advanced-spec-filters"
            >
              <span>
                <span id="spec-filter-label" className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Advanced specs
                </span>
                <span className="mt-1 block text-xs text-text-muted">
                  Filter by a specific product spec, such as color or capacity.
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${advancedSpecsOpen ? 'rotate-180' : ''}`} />
            </button>
            {advancedSpecsOpen && (
              <fieldset id="advanced-spec-filters" className="mt-3">
                <legend className="sr-only">Advanced specification filter</legend>
                <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  placeholder="Spec name, e.g. color"
                  value={specKeyDraft}
                  onChange={(e) => setSpecKeyDraft(e.target.value)}
                  onBlur={applySpecs}
                  onKeyDown={(e) => applyOnEnter(e, applySpecs)}
                  aria-label="Specification name"
                  className="min-h-11 w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <input
                  type="text"
                  placeholder="Value, e.g. inox"
                  value={specValueDraft}
                  onChange={(e) => setSpecValueDraft(e.target.value)}
                  onBlur={applySpecs}
                  onKeyDown={(e) => applyOnEnter(e, applySpecs)}
                  aria-label="Specification value"
                  className="min-h-11 w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={applySpecs}
                  className="min-h-11 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  Apply specs
                </button>
              </div>
              </fieldset>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
