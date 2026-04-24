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
          <p className="text-text-muted text-sm">
            {loading ? 'Loading...' : `${total} products found`}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={currentSearch}
                onChange={(v) => updateParams({ search: v })}
              />
            </div>
            <select
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-bg-surface/50 border border-white/10 text-sm text-text-primary focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
            >
              <option value="">Sort: Default</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          <CategoryFilter
            categories={categories}
            selected={currentCategory}
            onSelect={(slug) => updateParams({ category: slug })}
          />
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            }
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
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => updateParams({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 bg-bg-surface/50 text-text-muted hover:text-text-primary hover:border-white/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => updateParams({ page: String(page) })}
                className={`w-10 h-10 rounded-xl text-sm font-medium border transition-all ${
                  page === currentPage
                    ? 'bg-accent text-white border-accent'
                    : 'border-white/10 bg-bg-surface/50 text-text-muted hover:text-text-primary hover:border-white/20'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => updateParams({ page: String(currentPage + 1) })}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 bg-bg-surface/50 text-text-muted hover:text-text-primary hover:border-white/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
