'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/hooks/useToast';
import { SafeImage } from '@/components/ui/SafeImage';
import { Heart, Scale, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

function formatPrice(value: number) {
  return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}`;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();

  const price = parseFloat(product.price);
  const rating = parseFloat(product.rating);
  const compareAtPrice = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const hasSale = Boolean(compareAtPrice && Number.isFinite(compareAtPrice) && compareAtPrice > price);
  const discountPercent = hasSale && compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;
  const isOutOfStock = product.stock <= 0;
  const hasRating = Number.isFinite(rating) && product.review_count > 0;
  const wishlisted = isInWishlist(product.id);
  const [isCompared, setIsCompared] = useState(false);

  useEffect(() => {
    const syncCompareState = () => {
      try {
        const ids = JSON.parse(localStorage.getItem('compare_products') || '[]') as string[];
        setIsCompared(ids.includes(product.id));
      } catch {
        setIsCompared(false);
      }
    };

    syncCompareState();
    window.addEventListener('compare-products-updated', syncCompareState);
    return () => window.removeEventListener('compare-products-updated', syncCompareState);
  }, [product.id]);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      addToast('This product is out of stock', 'error');
      return;
    }

    try {
      await addItem(product.id);
      addToast(`${product.name} added to cart`, 'success');
    } catch {
      addToast('Failed to add to cart', 'error');
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const ids = JSON.parse(localStorage.getItem('compare_products') || '[]') as string[];
      const next = ids.includes(product.id)
        ? ids.filter(id => id !== product.id)
        : [product.id, ...ids].slice(0, 4);
      localStorage.setItem('compare_products', JSON.stringify(next));
      setIsCompared(next.includes(product.id));
      window.dispatchEvent(new Event('compare-products-updated'));
      addToast(next.includes(product.id) ? 'Added to comparison' : 'Removed from comparison', 'success');
    } catch {
      addToast('Could not update comparison', 'error');
    }
  };

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-lg border border-border bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md sm:p-4">
      <div className="relative">
        <Link href={`/store/${product.slug}`} className="block rounded-lg" aria-label={`View ${product.name}`}>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
            <SafeImage
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03] sm:p-7"
              sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw"
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-5xl font-bold text-accent/30">
                    {product.name.charAt(0)}
                  </span>
                </div>
              }
            />

            <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-4rem)] flex-wrap gap-2">
              {isOutOfStock ? (
                <span className="rounded-full bg-text-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                  Out of stock
                </span>
              ) : hasSale && discountPercent ? (
                <span className="rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                  {discountPercent}% off
                </span>
              ) : product.is_featured ? (
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                  Featured
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleWishlist}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white/95 text-text-secondary shadow-sm transition-colors hover:border-red-200 hover:text-red-600"
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={wishlisted}
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleCompare}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white/95 text-text-secondary shadow-sm transition-colors hover:border-accent/40 hover:text-accent"
            aria-label={isCompared ? `Remove ${product.name} from comparison` : `Compare ${product.name}`}
            aria-pressed={isCompared}
            title={isCompared ? 'Remove from comparison' : 'Compare product'}
          >
            <Scale className={`h-4 w-4 ${isCompared ? 'text-accent' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <div className="mb-2 flex min-h-5 items-center">
          {hasRating ? (
            <RatingStars rating={rating} reviewCount={product.review_count} />
          ) : (
            <span className="text-xs text-text-muted">No reviews yet</span>
          )}
        </div>

        <Link href={`/store/${product.slug}`} className="rounded-sm">
          <h3 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 text-text-primary transition-colors duration-200 group-hover:text-accent sm:text-base">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-bold text-text-primary">
              {Number.isFinite(price) ? formatPrice(price) : product.price}
            </span>
            {hasSale && compareAtPrice && (
              <span className="text-sm text-text-muted line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
          <p className={`mt-1.5 text-xs font-medium ${isOutOfStock ? 'text-danger' : product.stock <= 5 ? 'text-warning' : 'text-success'}`}>
            {isOutOfStock ? 'Currently unavailable' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="mt-4 w-full min-w-0 px-3"
          aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{isOutOfStock ? 'Out of stock' : 'Add to cart'}</span>
        </Button>
      </div>
    </article>
  );
}
