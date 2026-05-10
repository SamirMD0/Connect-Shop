'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { SearchBar } from '@/components/products/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { Product, Category, PaginatedProducts } from '@/lib/types';
import { ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

function StoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentCategory = searchParams.get('category') || null;
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSort = searchParams.get('sort') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
      // Reset page when filters change
      if ('category' in updates || 'search' in updates || 'sort' in updates) {
        params.delete('page');
      }
      router.push(`/store?${params.toString()}`);
    },
    [searchParams, router]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [productsRes, catRes] = await Promise.all([
          api.get<{ success: boolean } & PaginatedProducts>('/api/products', {
            params: {
              page: currentPage,
              limit: 12,
              category: currentCategory || undefined,
              search: currentSearch || undefined,
            },
          }),
          api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
        ]);
        setProducts(productsRes.products || []);
        setTotalPages(productsRes.totalPages || 1);
        setTotal(productsRes.total || 0);
        setCategories(catRes.categories || []);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentCategory, currentSearch, currentPage, currentSort]);

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Store</h1>
          <p className="text-text-muted">
            {loading ? 'Loading products...' : `${total} products available`}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-4 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <SearchBar
                value={currentSearch}
                onChange={(v) => updateParams({ search: v })}
              />
            </div>
            
            {/* Sort Dropdown */}
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
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Category Chips */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <CategoryFilter
              categories={categories}
              selected={currentCategory}
              onSelect={(slug) => updateParams({ category: slug })}
            />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Search className="w-12 h-12" />}
            title="No products found"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear Filters"
            actionHref="/store"
          />
        ) : (
          <ProductGrid products={products} />
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => updateParams({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-bg-surface text-text-muted hover:text-text-primary hover:border-slate-300 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => updateParams({ page: String(page) })}
                  className={`w-10 h-10 rounded-xl text-sm font-medium border transition-all ${
                    page === currentPage
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                      : 'border-slate-200 bg-bg-surface text-text-muted hover:text-text-primary hover:border-slate-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => updateParams({ page: String(currentPage + 1) })}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-bg-surface text-text-muted hover:text-text-primary hover:border-slate-300 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Container>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={
      <Container className="py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      </Container>
    }>
      <StoreContent />
    </Suspense>
  );
}
