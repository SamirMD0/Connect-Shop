'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/types';
import { api } from '@/lib/api';
import { ProductGrid } from './ProductGrid';

export function RecentlyViewedProducts({ currentProductId }: { currentProductId: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;

    try {
      const ids = (JSON.parse(localStorage.getItem('recently_viewed') || '[]') as string[])
        .filter((id) => id !== currentProductId)
        .slice(0, 4);

      if (ids.length === 0) return;

      api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { ids: ids.join(','), limit: 4 },
      })
        .then((res) => {
          if (!cancelled) setProducts(res.products || []);
        })
        .catch(() => {
          if (!cancelled) setProducts([]);
        });
    } catch {
      setProducts([]);
    }

    return () => {
      cancelled = true;
    };
  }, [currentProductId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-20">
      <h2 className="mb-8 text-2xl font-bold text-text-primary">Recently Viewed</h2>
      <ProductGrid products={products} />
    </section>
  );
}
