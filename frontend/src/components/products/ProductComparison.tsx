'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Product } from '@/lib/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { SafeImage } from '@/components/ui/SafeImage';

export function ProductComparison() {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expanded, setExpanded] = useState(false);

  const loadIds = () => {
    try {
      setIds(JSON.parse(localStorage.getItem('compare_products') || '[]'));
    } catch {
      setIds([]);
    }
  };

  useEffect(() => {
    loadIds();
    window.addEventListener('compare-products-updated', loadIds);
    return () => window.removeEventListener('compare-products-updated', loadIds);
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setExpanded(false);
      return;
    }

    api.get<{ success: boolean; products: Product[] }>('/api/products', {
      params: { ids: ids.join(','), limit: 4 },
    })
      .then((res) => setProducts(res.products || []))
      .catch(() => setProducts([]));
  }, [ids]);

  const specKeys = useMemo(() => {
    const keys = new Set<string>();
    products.forEach((product) => {
      Object.keys(product.specs || {}).forEach((key) => keys.add(key));
    });
    return Array.from(keys).slice(0, 6);
  }, [products]);

  const remove = (id: string) => {
    const next = ids.filter((item) => item !== id);
    localStorage.setItem('compare_products', JSON.stringify(next));
    setIds(next);
    window.dispatchEvent(new Event('compare-products-updated'));
  };

  const clear = () => {
    localStorage.removeItem('compare_products');
    setIds([]);
    window.dispatchEvent(new Event('compare-products-updated'));
  };

  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">{ids.length} products selected for comparison</p>
          <p className="text-xs text-text-muted">Compare price, rating, stock, and specs.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Hide comparison' : 'Compare'}
          </Button>
          <Button type="button" variant="ghost" onClick={clear}>Clear</Button>
        </div>
      </div>

      {expanded && (
        <div className="max-h-[70vh] overflow-auto border-t border-slate-100 p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `140px repeat(${products.length}, minmax(180px, 1fr))` }}>
            <div className="text-xs font-semibold uppercase text-text-muted">Product</div>
            {products.map((product) => (
              <div key={product.id} className="relative rounded-xl border border-slate-200 p-3">
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow hover:text-red-500"
                  aria-label={`Remove ${product.name} from comparison`}
                >
                  <X className="h-4 w-4" />
                </button>
                <Link href={`/store/${product.slug}`} className="block pr-8">
                  <div className="relative mb-3 h-24 overflow-hidden rounded-lg border border-slate-200/60 bg-white">
                    <SafeImage
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="180px"
                      fallback={<div className="h-full w-full bg-slate-50" />}
                    />
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-text-primary">{product.name}</p>
                </Link>
              </div>
            ))}

            {[
              ['Price', (product: Product) => `$${parseFloat(product.price).toFixed(2)}`],
              ['Rating', (product: Product) => `${parseFloat(product.rating).toFixed(1)} / 5`],
              ['Stock', (product: Product) => `${product.stock}`],
              ['Brand', (product: Product) => product.brand || '—'],
            ].map(([label, getValue]) => (
              <Fragment key={label as string}>
                <div key={`${label}-label`} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-text-primary">{label as string}</div>
                {products.map((product) => (
                  <div key={`${product.id}-${label}`} className="rounded-lg bg-slate-50 p-3 text-sm text-text-muted">
                    {(getValue as (product: Product) => string)(product)}
                  </div>
                ))}
              </Fragment>
            ))}

            {specKeys.map((key) => (
              <Fragment key={key}>
                <div key={`${key}-label`} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold capitalize text-text-primary">
                  {key.replace(/_/g, ' ')}
                </div>
                {products.map((product) => (
                  <div key={`${product.id}-${key}`} className="rounded-lg bg-slate-50 p-3 text-sm text-text-muted">
                    {product.specs?.[key] || '—'}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
