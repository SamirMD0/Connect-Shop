import { Container } from '@/components/layout/Container';
import { PhantomSkeleton } from '@/components/ui/PhantomSkeleton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { SlidersHorizontal, Sparkles } from 'lucide-react';

export default function StoreLoading() {
  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/70">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Live catalog
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Shop electronics with clean filters
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted sm:text-base">
                Browse real products from your backend with category, price, brand, rating, and specs filters preserved.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="rounded-xl bg-white p-4">
                <p className="text-2xl font-bold text-text-primary">000</p>
                <p className="text-xs text-text-muted">Products</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-2xl font-bold text-text-primary">000</p>
                <p className="text-xs text-text-muted">Categories</p>
              </div>
            </div>
          </div>
        </div>

        <SectionTitle eyebrow="Catalog" title="All products" description="Loading products" />

        <div className="mb-8 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            Refine products
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {['Search products', 'Category', 'Brand', 'Min price', 'Max price', 'Sort'].map((label) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-text-muted">
                {label}
              </div>
            ))}
          </div>
        </div>

        <PhantomSkeleton loading={true} className="block">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="block">
                <div className="h-full">
                  <div className="relative mb-4 flex min-h-[270px] items-center justify-center overflow-hidden rounded-lg border border-slate-200/60 bg-white">
                    <span className="text-5xl font-bold text-accent/30">P</span>
                    <div className="absolute bottom-0 left-0 z-30 flex w-full items-center justify-center gap-2.5 pb-5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-white text-[#0B1B48] shadow-md">
                        Compare
                      </span>
                      <span className="inline-flex rounded-[5px] bg-accent px-5 py-[7px] text-sm font-medium text-white">
                        Add to cart
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-white text-[#0B1B48] shadow-md">
                        Wish
                      </span>
                    </div>
                  </div>

                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="text-sm font-medium text-amber-500">★★★★★</span>
                    <span className="text-xs text-text-muted">(00)</span>
                  </div>

                  <div>
                    <h3 className="mb-1.5 line-clamp-1 font-medium text-[#0B1B48]">
                      Loading product
                    </h3>
                    <span className="flex items-center gap-2 text-lg font-medium">
                      <span className="text-[#0B1B48]">$000</span>
                      <span className="text-base text-text-muted line-through">$000</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PhantomSkeleton>
      </Container>
    </div>
  );
}
