import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { StoreFilters } from '@/components/products/StoreFilters';
import { StorePagination } from '@/components/products/StorePagination';
import { api } from '@/lib/api';
import { Product, Category, PaginatedProducts } from '@/lib/types';
import { Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Store | ElecSHOP',
  description: 'Browse our collection of electronics, laptops, and appliances.',
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StorePage({ searchParams }: Props) {
  const params = await searchParams;
  const currentCategory = (params.category as string) || null;
  const currentSearch = (params.search as string) || '';
  const currentPage = parseInt((params.page as string) || '1', 10);
  const currentSort = (params.sort as string) || '';

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
      </Container>
    </div>
  );
}
