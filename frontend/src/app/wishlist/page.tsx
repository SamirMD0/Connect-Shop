'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/auth/LoginButton';

export default function WishlistPage() {
  const { user } = useAuth();
  const { items, itemCount, loading } = useWishlist();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (!user) {
    return (
      <div className="animate-fade-in">
        <Container className="py-8 min-h-[60vh]">
          <EmptyState
            icon={<Heart className="w-12 h-12" />}
            title="Sign in to view wishlist"
            description="You must be logged in to save and view your wishlist."
            actionLabel="Sign In"
            actionHref="/login"
            // Wait, we don't have actionHref prop working with a component, so let's use a button or LoginButton
            // The EmptyState takes an action component if needed, let's just use actionHref="/login" if it redirects to Google OAuth, wait, the app uses a LoginButton component.
            // Let's just render the EmptyState without actionHref and put LoginButton under it.
          />
          <div className="flex justify-center -mt-6">
            <LoginButton />
          </div>
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
    description: '',
    created_at: item.created_at,
    updated_at: item.created_at,
  }));

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
              {itemCount} {itemCount === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
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
