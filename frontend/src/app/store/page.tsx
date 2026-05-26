import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { StoreFilters } from '@/components/products/StoreFilters';
import { StorePagination } from '@/components/products/StorePagination';
import { ProductComparison } from '@/components/products/ProductComparison';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { api } from '@/lib/api';
import { Product, Category, PaginatedProducts } from '@/lib/types';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

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
    ? `${titleParts.join(' - ')} | ELECTRO SHOP`
    : 'Store | ELECTRO SHOP';

  return {
    title,
    description: search
      ? `Shop ELECTRO SHOP products matching ${search}.`
      : 'Browse electronics, laptops, smartphones, accessories, and appliances at ELECTRO SHOP.',
    alternates: {
      canonical: '/store',
    },
    openGraph: {
      title,
      description: 'Browse electronics, laptops, smartphones, accessories, and appliances at ELECTRO SHOP.',
      type: 'website',
    },
  };
}

export default async function StorePage({ searchParams }: Props) {
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

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/70">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Live catalog
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Shop electronics with clean filters
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted sm:text-base">
                Browse real products from your backend with category, price, brand, rating, and specs filters preserved.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="rounded-xl bg-white p-4">
                <p className="text-2xl font-bold text-text-primary">{total}</p>
                <p className="text-xs text-text-muted">Products</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-2xl font-bold text-text-primary">{categories.length}</p>
                <p className="text-xs text-text-muted">Categories</p>
              </div>
            </div>
          </div>
        </div>

        <SectionTitle
          eyebrow="Catalog"
          title={currentSearch ? `Results for "${currentSearch}"` : 'All products'}
          description={`${total} ${total === 1 ? 'product' : 'products'} available`}
        />

        {/* Filters */}
        <div className="mb-8 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            Refine products
          </div>
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
        </div>

        {/* Product Grid */}
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

        {/* Pagination */}
        <StorePagination currentPage={currentPage} totalPages={totalPages} />
        <ProductComparison />
      </Container>
    </div>
  );
}
