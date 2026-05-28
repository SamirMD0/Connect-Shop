import { Container } from '@/components/layout/Container';
import { PhantomSkeleton } from '@/components/ui/PhantomSkeleton';
import { ChevronRight, Heart, MessageCircle, Share2, Shield, ShoppingCart, Truck, Zap } from 'lucide-react';

export default function ProductDetailLoading() {
  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        <nav className="mb-8 flex items-center gap-2 text-sm text-text-muted">
          <span>Store</span>
          <ChevronRight className="h-4 w-4" />
          <span>Category</span>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-text-primary">Loading product</span>
        </nav>

        <PhantomSkeleton loading={true} className="block">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200/60 bg-white">
                <div className="flex h-full w-full items-center justify-center bg-white">
                  <span className="text-8xl font-bold text-accent/30">P</span>
                </div>
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/25">
                    Featured
                  </span>
                  <span className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25">
                    New
                  </span>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 w-20 shrink-0 rounded-xl border-2 border-slate-200 bg-white"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-bold text-text-primary">Brand</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-accent">Category</span>
              </div>

              <h1 className="mb-2 text-3xl font-bold tracking-tight text-text-primary lg:text-4xl">
                Loading product details
              </h1>
              <p className="mb-4 text-xs text-text-muted">SKU: LOADING-SKU</p>

              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm font-medium text-amber-500">★★★★★</span>
                <span className="text-xs text-text-muted">(00 reviews)</span>
              </div>

              <div className="mb-4 flex items-end gap-3">
                <p className="text-4xl font-bold text-accent">$000.00</p>
                <p className="mb-1 text-lg text-text-muted line-through">$000.00</p>
                <span className="mb-1 text-sm font-bold text-red-600">00% OFF</span>
              </div>

              <div className="mb-6">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  In stock
                </span>
              </div>

              <p className="mb-6 leading-relaxed text-text-muted">
                Loading product description, feature highlights, warranty details, and compatibility notes.
              </p>

              <div className="mb-8">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">Available Options</h3>
                <div className="flex flex-wrap gap-2">
                  {['Option one', 'Option two', 'Option three'].map((option) => (
                    <span
                      key={option}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text-primary"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-4 text-sm font-semibold text-text-primary">Specifications</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50">
                  {['Display', 'Processor', 'Connectivity'].map((spec, index) => (
                    <div key={spec} className={`flex px-4 py-3 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <span className="w-1/3 text-sm capitalize text-text-muted">{spec}</span>
                      <span className="w-2/3 text-sm font-medium text-text-primary">Loading value</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-text-primary">Estimated Delivery</h4>
                  <p className="text-sm text-text-muted">Loading delivery window</p>
                </div>
              </div>

              <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100">
                  <span className="flex h-12 w-12 items-center justify-center text-text-muted">-</span>
                  <span className="w-12 text-center text-sm font-semibold text-text-primary">1</span>
                  <span className="flex h-12 w-12 items-center justify-center text-text-muted">+</span>
                </div>

                <div className="flex flex-1 gap-3">
                  <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-text-primary">
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </span>
                  <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white shadow-lg shadow-accent/25">
                    <Zap className="h-5 w-5" />
                    Buy Now
                  </span>
                </div>

                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400">
                  <Heart className="h-5 w-5" />
                </span>
              </div>

              <div className="mb-8 flex items-center gap-4 border-t border-slate-100 pt-6">
                <span className="flex items-center gap-2 text-sm font-medium text-text-muted">
                  <Share2 className="h-4 w-4" /> Share:
                </span>
                <div className="flex gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                    f
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    X
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Truck, label: 'Free Shipping' },
                  { icon: Shield, label: 'Secure Payment' },
                  { icon: Truck, label: '30-Day Returns' },
                ].map((badge) => (
                  <div key={badge.label} className="flex flex-col items-center rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center">
                    <badge.icon className="mb-1 h-5 w-5 text-accent" />
                    <span className="text-xs text-text-muted">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PhantomSkeleton>

        <section className="mt-16 border-t border-slate-200/60 pt-16">
          <h2 className="mb-8 text-2xl font-bold text-text-primary">Customer Reviews</h2>
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50 py-8 text-center text-text-muted">
            Loading reviews
          </div>
        </section>
      </Container>
    </div>
  );
}
