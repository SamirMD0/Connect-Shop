'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/products/ProductCard';

interface HomepageProductRailProps {
  products: Product[];
  label: string;
}

export function HomepageProductRail({ products, label }: HomepageProductRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  function scrollRail(direction: 'left' | 'right') {
    const rail = railRef.current;
    if (!rail) return;

    const amount = Math.max(rail.clientWidth * 0.85, 280);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="-mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:gap-5 sm:px-0"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[78vw] max-w-[300px] shrink-0 snap-start min-[480px]:w-[300px] sm:w-[280px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between sm:flex">
        <button
          type="button"
          onClick={() => scrollRail('left')}
          className="pointer-events-auto -ml-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-md transition-colors hover:border-accent hover:text-accent"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollRail('right')}
          className="pointer-events-auto -mr-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-md transition-colors hover:border-accent hover:text-accent"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 flex justify-center gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => scrollRail('left')}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-sm transition-colors hover:border-accent hover:text-accent"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollRail('right')}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-sm transition-colors hover:border-accent hover:text-accent"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
