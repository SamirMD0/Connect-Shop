import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { StoreFilters } from '@/components/products/StoreFilters';
import { StorePagination } from '@/components/products/StorePagination';
import { ProductComparison } from '@/components/products/ProductComparison';
import { api } from '@/lib/api';
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
    ? `${titleParts.join(' - ')} | ElecSHOP`
    : 'Store | ElecSHOP';

  return {
    title,
    description: search
      ? `Shop ElecSHOP products matching ${search}.`
      : 'Browse electronics, laptops, smartphones, accessories, and appliances at ElecSHOP.',
    alternates: {
      canonical: '/store',
    },
    openGraph: {
      title,
      description: 'Browse electronics, laptops, smartphones, accessories, and appliances at ElecSHOP.',
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Store</h1>
          <p className="text-text-muted">
            {total} {total === 1 ? 'product' : 'products'} available
          </p>
        </div>

        {/* Filters */}
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
