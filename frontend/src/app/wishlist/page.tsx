'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWishlist } from '@/hooks/useWishlist';
import { api } from '@/lib/api';
import { Product, PaginatedProducts } from '@/lib/types';

export default function WishlistPage() {
  const { wishlist, isMounted } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlistProducts() {
      if (!isMounted) return;
      if (wishlist.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get<{ success: boolean } & PaginatedProducts>('/api/products', {
          params: {
            limit: 100, // fetch all
            ids: wishlist.join(',')
          }
        });
        if (res.success && res.products) {
          setProducts(res.products);
        }
      } catch (error) {
        console.error('Failed to load wishlist products', error);
      } finally {
        setLoading(false);
      }
    }

    loadWishlistProducts();
  }, [wishlist, isMounted]);

  if (!isMounted) return null;

  return (
    <div className="animate-fade-in">
      <Container className="py-8 min-h-[60vh]">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Your Wishlist</h1>
            <p className="text-text-muted">
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: Math.min(wishlist.length || 4, 8) }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-12 h-12" />}
            title="Your wishlist is empty"
            description="Save items you like to your wishlist to easily find them later."
            actionLabel="Browse Store"
            actionHref="/store"
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </Container>
    </div>
  );
}
