'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Skeleton className="w-full h-96 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-32" />
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
        <p className="text-text-muted">The product you&apos;re looking for doesn&apos;t exist.</p>
      </Container>
    );
  }

  const price = parseFloat(product.price);
  const rating = parseFloat(product.rating);

  return (
    <div className="animate-fade-in">
      <Container className="py-8">
        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Image */}
          <div className="relative w-full aspect-square rounded-2xl bg-bg-elevated overflow-hidden border border-white/5">
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
              <div className="w-full h-full bg-gradient-to-br from-accent/20 via-accent/5 to-accent-glow/20 flex items-center justify-center">
                <span className="text-7xl font-bold text-accent/30">
                  {product.name.charAt(0)}
                </span>
              </div>
            )}
            {product.is_featured && (
              <span className="absolute top-4 left-4 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Featured
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <p className="text-sm text-accent font-medium mb-1">{product.category_name}</p>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">{product.name}</h1>

            <div className="mt-3">
              <RatingStars rating={rating} reviewCount={product.review_count} size="md" />
            </div>

            <p className="text-4xl font-bold text-text-primary mt-6">${price.toFixed(2)}</p>

            <div className="mt-4">
              <StockBadge stock={product.stock} />
            </div>

            {product.description && (
              <p className="mt-6 text-sm text-text-muted leading-relaxed">{product.description}</p>
            )}

            {/* Specs */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Specifications</h3>
                <div className="space-y-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex text-sm border-b border-white/5 pb-2">
                      <span className="text-text-muted capitalize w-32 shrink-0">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-text-primary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <div className="flex items-center gap-4 mt-8">
              <div className="flex items-center bg-bg-elevated rounded-xl border border-white/10">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-medium text-text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                >
                  +
                </button>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                loading={adding}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Related Products</h2>
            <ProductGrid products={related} />
          </section>
        )}
      </Container>
    </div>
  );
}
