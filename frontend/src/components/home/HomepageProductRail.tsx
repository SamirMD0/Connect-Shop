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
    rail.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="-mx-4 flex snap-x gap-5 overflow-x-auto scroll-smooth px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[78vw] shrink-0 snap-start min-[480px]:w-[320px] sm:w-[270px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between sm:flex">
        <button
          type="button"
          onClick={() => scrollRail('left')}
          className="pointer-events-auto -ml-5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0B1B48] shadow-md shadow-slate-200/80 transition-colors hover:border-[#0B1B48] hover:bg-[#0B1B48] hover:text-white"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollRail('right')}
          className="pointer-events-auto -mr-5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0B1B48] shadow-md shadow-slate-200/80 transition-colors hover:border-[#0B1B48] hover:bg-[#0B1B48] hover:text-white"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 flex justify-center gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => scrollRail('left')}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0B1B48] shadow-sm transition-colors hover:border-[#0B1B48] hover:bg-[#0B1B48] hover:text-white"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollRail('right')}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0B1B48] shadow-sm transition-colors hover:border-[#0B1B48] hover:bg-[#0B1B48] hover:text-white"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
