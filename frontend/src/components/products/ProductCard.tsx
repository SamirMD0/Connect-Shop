'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { RatingStars } from './RatingStars';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/hooks/useToast';
import { Heart, Scale } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();

  const price = parseFloat(product.price);
  const rating = parseFloat(product.rating);
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

    if (product.stock === 0) {
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
    <Link href={`/store/${product.slug}`} className="group block">
      <div className="h-full">
        <div className="relative mb-4 flex min-h-[270px] items-center justify-center overflow-hidden rounded-lg border border-slate-200/60 bg-white">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-5xl font-bold text-accent/30">
                {product.name.charAt(0)}
              </span>
            </div>
          )}

          {product.stock === 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <span className="rounded-full bg-black/40 px-4 py-2 text-sm font-semibold text-white">
                Out of Stock
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 z-30 flex w-full translate-y-full items-center justify-center gap-2.5 pb-5 transition-transform duration-200 ease-linear group-hover:translate-y-0">
            <button
              onClick={handleCompare}
              className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-white text-[#0B1B48] shadow-md transition-colors duration-200 hover:text-accent"
              aria-label={`Compare ${product.name}`}
            >
              <Scale className={`h-4 w-4 ${isCompared ? 'fill-accent text-accent' : ''}`} />
            </button>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="inline-flex rounded-[5px] bg-accent px-5 py-[7px] text-sm font-medium text-white transition-colors duration-200 hover:bg-[#0B1B48] disabled:pointer-events-none disabled:opacity-50"
              aria-label={`Add ${product.name} to cart`}
            >
              Add to cart
            </button>

            <button
              onClick={handleWishlist}
              className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-white text-[#0B1B48] shadow-md transition-colors duration-200 hover:text-red-500"
              aria-label={`Add ${product.name} to wishlist`}
            >
              <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2.5">
          <RatingStars
            rating={Number.isFinite(rating) ? rating : 0}
            reviewCount={product.review_count}
          />
        </div>

        <div>
          <h3 className="mb-1.5 line-clamp-1 font-medium text-[#0B1B48] transition-colors duration-200 group-hover:text-accent">
            {product.name}
          </h3>

          <span className="flex items-center gap-2 text-lg font-medium">
            <span className="text-[#0B1B48]">
              ${Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2)}
            </span>
            {product.compare_at_price && parseFloat(product.compare_at_price) > price && (
              <span className="text-base text-text-muted line-through">
                ${Number.isInteger(parseFloat(product.compare_at_price))
                  ? parseFloat(product.compare_at_price).toFixed(0)
                  : parseFloat(product.compare_at_price).toFixed(2)}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
