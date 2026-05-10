'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { RatingStars } from '@/components/products/RatingStars';
import { StockBadge } from '@/components/products/StockBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { Minus, Plus, ShoppingCart, ChevronRight, Truck, Shield, RotateCcw } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { addItem } = useCart();
  const { addToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; product: Product }>(`/api/products/${slug}`);
        setProduct(res.product);

        // Fetch related products from same category
        if (res.product.category_slug) {
          const relatedRes = await api.get<{ success: boolean; products: Product[] }>('/api/products', {
            params: { category: res.product.category_slug, limit: 4 },
          });
          setRelated(relatedRes.products.filter(p => p.slug !== slug).slice(0, 4));
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      addToast(`${product.name} added to cart`, 'success');
      setQuantity(1);
    } catch {
      addToast('Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="w-full aspect-square rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="py-20 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Product Not Found</h1>
        <p className="text-text-muted mb-6">The product you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/store">
          <Button variant="primary">Back to Store</Button>
        </Link>
      </Container>
    );
  }

  const price = parseFloat(product.price);
  const rating = parseFloat(product.rating);

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-8">
          <Link href="/store" className="hover:text-accent transition-colors">Store</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/store?category=${product.category_slug}`} className="hover:text-accent transition-colors">
            {product.category_name}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-primary truncate">{product.name}</span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative aspect-square rounded-3xl bg-slate-50 overflow-hidden border border-slate-200/60">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/10 via-slate-50 to-accent-glow/10 flex items-center justify-center">
                <span className="text-8xl font-bold text-accent/30">
                  {product.name.charAt(0)}
                </span>
              </div>
            )}
            {product.is_featured && (
              <span className="absolute top-4 left-4 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg shadow-accent/25">
                Featured
              </span>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <p className="text-sm font-medium text-accent mb-2">{product.category_name}</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-4">
              {product.name}
            </h1>

            <div className="mb-6">
              <RatingStars rating={rating} reviewCount={product.review_count} size="md" />
            </div>

            <p className="text-4xl font-bold text-accent mb-4">
              ${price.toFixed(2)}
            </p>

            <div className="mb-6">
              <StockBadge stock={product.stock} />
            </div>

            {product.description && (
              <p className="text-text-muted leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Specs Table */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Specifications</h3>
                <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60">
                  {Object.entries(product.specs).map(([key, value], index) => (
                    <div 
                      key={key} 
                      className={`flex py-3 px-4 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                    >
                      <span className="text-sm text-text-muted capitalize w-1/3">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-text-primary font-medium w-2/3">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold text-text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-12 h-12 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="flex-1 shadow-lg shadow-accent/25 hover:shadow-accent/40"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                loading={adding}
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: 'Free Shipping' },
                { icon: Shield, label: 'Secure Payment' },
                { icon: RotateCcw, label: '30-Day Returns' },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-col items-center text-center p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <badge.icon className="w-5 h-5 text-accent mb-1" />
                  <span className="text-xs text-text-muted">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-text-primary mb-8">You Might Also Like</h2>
            <ProductGrid products={related} />
          </section>
        )}
      </Container>
    </div>
  );
}
