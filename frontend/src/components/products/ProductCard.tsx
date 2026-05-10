'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { RatingStars } from './RatingStars';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { Plus, ShoppingCart } from 'lucide-react';

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
      <div className="bg-bg-surface border border-slate-200/60 rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative w-full h-52 bg-slate-50 overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/10 via-slate-50 to-accent-glow/10 flex items-center justify-center">
              <span className="text-5xl font-bold text-accent/30">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Featured Badge */}
          {product.is_featured && (
            <span className="absolute top-3 left-3 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-accent/25">
              Featured
            </span>
          )}
          
          {/* Out of Stock Overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm font-semibold text-white bg-black/40 px-4 py-2 rounded-full">
                Out of Stock
              </span>
            </div>
          )}

          {/* Quick Add Button - appears on hover */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-accent opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent hover:text-white disabled:opacity-0"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <p className="text-xs font-medium text-accent mb-1.5">{product.category_name}</p>
          <h3 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors leading-snug">
            {product.name}
          </h3>

          <div className="mt-2">
            <RatingStars rating={rating} reviewCount={product.review_count} />
          </div>

          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="text-lg font-bold text-text-primary">
              ${price.toFixed(2)}
            </span>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
