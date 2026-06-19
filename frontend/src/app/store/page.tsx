import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { StoreFilters } from '@/components/products/StoreFilters';
import { StorePagination } from '@/components/products/StorePagination';
import { ProductComparison } from '@/components/products/ProductComparison';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { api } from '@/lib/api';
import { APP_NAME } from '@/lib/constants';
import { logServerRenderTiming } from '@/lib/perf';
import { Product, Category, PaginatedProducts } from '@/lib/types';
import { Search } from 'lucide-react';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = params.category as string | undefined;
  const search = params.search as string | undefined;
  const titleParts = [
    search ? `Search results for "${search}"` : null,
    categorySlug ? `${categorySlug.replace(/-/g, ' ')} products` : null,
  ].filter(Boolean);
  const title = titleParts.length > 0
    ? `${titleParts.join(' - ')} | ${APP_NAME}`
    : `Store | ${APP_NAME}`;
  const description = search
    ? `Shop ${APP_NAME} products matching ${search}.`
    : `Browse electronics, laptops, smartphones, accessories, and appliances at ${APP_NAME}.`;

  return {
    title,
    description,
    alternates: {
      canonical: '/store',
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function StorePage({ searchParams }: Props) {
  const renderStart = performance.now();
  const params = await searchParams;
  const currentCategory = (params.category as string) || null;
  const currentSearch = (params.search as string) || '';
  const currentPage = parseInt((params.page as string) || '1', 10);
  const currentSort = (params.sort as string) || '';
  const currentBrand = (params.brand as string) || '';
  const minPrice = (params.min_price as string) || '';
  const maxPrice = (params.max_price as string) || '';
  const minRating = (params.min_rating as string) || '';
  const specKey = (params.spec_key as string) || '';
  const specValue = (params.spec_value as string) || '';

  // Fetch data
  let products: Product[] = [];
  let categories: Category[] = [];
  let totalPages = 1;
  let total = 0;

  try {
    const [productsRes, catRes] = await Promise.all([
      api.get<{ success: boolean } & PaginatedProducts>('/api/products', {
        params: {
          page: currentPage,
          limit: 12,
          category: currentCategory || undefined,
          search: currentSearch || undefined,
          sort: currentSort || undefined,
          brand: currentBrand || undefined,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          min_rating: minRating || undefined,
          specs: specKey && specValue ? `${specKey}:${specValue}` : undefined,
        },
      }),
      api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
    ]);
    products = productsRes.products || [];
    totalPages = productsRes.totalPages || 1;
    total = productsRes.total || 0;
    categories = catRes.categories || [];
  } catch (error) {
    console.error('Error fetching store data:', error);
  }

  logServerRenderTiming({
    pageType: currentCategory ? 'category_store' : 'store',
    phase: 'render_prep',
    durationMs: performance.now() - renderStart,
  });

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:self-start">
            <StoreFilters
              categories={categories}
              currentCategory={currentCategory}
              currentSearch={currentSearch}
              currentSort={currentSort}
              currentBrand={currentBrand}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={minRating}
              specKey={specKey}
              specValue={specValue}
            />
          </aside>

          <section className="min-w-0">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionTitle
                eyebrow="Catalog"
                title={currentSearch ? `Results for "${currentSearch}"` : 'All products'}
                description={`${total} ${total === 1 ? 'product' : 'products'} available`}
              />
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm">
                {total} {total === 1 ? 'result' : 'results'}
              </div>
            </div>

            {products.length === 0 ? (
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

            <StorePagination currentPage={currentPage} totalPages={totalPages} />
          </section>
        </div>
        <ProductComparison />
      </Container>
    </div>
  );
}
