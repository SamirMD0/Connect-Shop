'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { RatingStars } from './RatingStars';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/hooks/useToast';
import { SafeImage } from '@/components/ui/SafeImage';
import { Heart, Scale } from 'lucide-react';

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
    <article className="group flex h-full flex-col">
      <Link href={`/store/${product.slug}`} className="block" aria-label={`View ${product.name}`}>
        <div className="relative mb-4 flex min-h-[220px] items-center justify-center overflow-hidden rounded-lg border border-slate-200/60 bg-white sm:min-h-[270px]">
          <SafeImage
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-5xl font-bold text-accent/30">
                  {product.name.charAt(0)}
                </span>
              </div>
            }
          />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {isOutOfStock ? (
              <span className="rounded-full bg-[#0B1B48] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Out of stock
              </span>
            ) : hasSale && discountPercent ? (
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                {discountPercent}% off
              </span>
            ) : product.is_featured ? (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Featured
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex min-h-5 items-center gap-2.5">
          {hasRating && (
            <RatingStars
              rating={rating}
              reviewCount={product.review_count}
            />
          )}
        </div>

        <Link href={`/store/${product.slug}`} className="block">
          <h3 className="mb-1.5 line-clamp-2 min-h-10 font-medium leading-5 text-[#0B1B48] transition-colors duration-200 group-hover:text-accent">
            {product.name}
          </h3>
        </Link>

        <div className="mb-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold text-[#0B1B48]">
              {Number.isFinite(price) ? formatPrice(price) : product.price}
            </span>
            {hasSale && compareAtPrice && (
              <span className="text-base text-text-muted line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
          <p className={`mt-1 text-xs ${isOutOfStock ? 'font-medium text-danger' : 'text-text-muted'}`}>
            {isOutOfStock ? 'Currently unavailable' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCompare}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-white text-[#0B1B48] shadow-md ring-1 ring-slate-200/70 transition-colors duration-200 hover:text-accent"
            aria-label={isCompared ? `Remove ${product.name} from comparison` : `Compare ${product.name}`}
            aria-pressed={isCompared}
          >
            <Scale className={`h-4 w-4 ${isCompared ? 'fill-accent text-accent' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="inline-flex min-h-9 flex-1 items-center justify-center rounded-[5px] bg-accent px-4 py-[7px] text-sm font-medium text-white transition-colors duration-200 hover:bg-[#0B1B48] disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-500"
            aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
          >
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </button>

          <button
            type="button"
            onClick={handleWishlist}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-white text-[#0B1B48] shadow-md ring-1 ring-slate-200/70 transition-colors duration-200 hover:text-red-500"
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={wishlisted}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
}
