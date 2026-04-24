'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { RatingStars } from './RatingStars';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { addToast } = useToast();

  const price = parseFloat(product.price);
  const rating = parseFloat(product.rating);

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

  return (
    <Link href={`/store/${product.slug}`} className="group block">
      <div className="glass-card overflow-hidden h-full flex flex-col transition-transform duration-200 group-hover:scale-[1.02]">
        {/* Image */}
        <div className="relative w-full h-52 bg-bg-elevated overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/20 via-accent/5 to-accent-glow/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-accent/40">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
          {product.is_featured && (
            <span className="absolute top-3 left-3 bg-accent text-white text-xs font-bold px-2.5 py-1 rounded-full">
              Featured
            </span>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-sm font-medium text-white/80">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <p className="text-xs text-text-muted mb-1">{product.category_name}</p>
          <h3 className="text-sm font-semibold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
            {product.name}
          </h3>

          <div className="mt-1.5">
            <RatingStars rating={rating} reviewCount={product.review_count} />
          </div>

          <div className="flex items-center justify-between mt-auto pt-3">
            <span className="text-lg font-bold text-text-primary">
              ${price.toFixed(2)}
            </span>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
              aria-label={`Add ${product.name} to cart`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
