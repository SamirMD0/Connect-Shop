'use client';

import { Heart } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, itemCount, loading } = useWishlist();

  if (authLoading) {
    return (
      <Container className="min-h-[60vh] py-8" aria-busy="true" aria-label="Loading wishlist">
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={index} />)}
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <div className="animate-fade-in">
        <Container className="py-8 min-h-[60vh]">
          <EmptyState
            icon={<Heart className="w-12 h-12" />}
            title="Sign in to view wishlist"
            description="Sign in to save products and access them across devices."
            actionLabel="Sign In"
            actionHref="/auth/login"
          />
        </Container>
      </div>
    );
  }

  // Map wishlist items to Product interface
  const products: Product[] = items.map(item => ({
    id: item.product_id,
    name: item.product_name,
    slug: item.product_slug,
    price: item.product_price.toString(),
    image_url: item.product_image,
    stock: item.product_stock,
    rating: '0',
    review_count: 0,
    category_id: 0,
    category_name: '',
    category_slug: '',
    is_featured: false,
    specs: null,
    brand: null,
    sku: null,
    compare_at_price: null,
    weight_grams: null,
    meta_title: null,
    meta_description: null,
    description: '',
    created_at: item.created_at,
    updated_at: item.created_at,
  }));

  return (
    <div className="animate-fade-in">
      <Container className="py-8 min-h-[60vh]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Heart className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Your wishlist</h1>
            <p className="text-text-muted">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading wishlist products">
            {Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={index} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-12 h-12" />}
            title="Your wishlist is empty"
            description="Save items you like to your wishlist to easily find them later."
            actionLabel="Browse products"
            actionHref="/store"
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </Container>
    </div>
  );
}
