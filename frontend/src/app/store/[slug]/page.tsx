import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { RatingStars } from '@/components/products/RatingStars';
import { StockBadge } from '@/components/products/StockBadge';
import { AddToCartClient } from '@/components/products/AddToCartClient';
import { ProductReviews } from '@/components/products/ProductReviews';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { ChevronRight, Truck, Shield, RotateCcw, Share2, MessageCircle } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  try {
    const res = await api.get<{ success: boolean; product: Product }>(`/api/products/${slug}`);
    return res.product;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const product = await getProduct(p.slug);
  
  if (!product) {
    return { title: 'Product Not Found | ElecSHOP' };
  }
  
  return {
    title: `${product.name} | ElecSHOP`,
    description: product.description?.slice(0, 160) || `Buy ${product.name} at ElecSHOP`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.image_url ? [product.image_url] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const p = await params;
  const product = await getProduct(p.slug);

  if (!product) {
    notFound();
  }

  // Fetch related
  let related: Product[] = [];
  if (product.category_slug) {
    try {
      const relatedRes = await api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { category: product.category_slug, limit: 5 },
      });
      related = relatedRes.products.filter(p => p.slug !== product.slug).slice(0, 4);
    } catch {
      // ignore
    }
  }

  const price = parseFloat(product.price);
  const rating = parseFloat(product.rating);

  const today = new Date();
  const deliveryStart = new Date(today);
  deliveryStart.setDate(today.getDate() + 2);
  const deliveryEnd = new Date(today);
  deliveryEnd.setDate(today.getDate() + 4);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const deliveryText = `Order now and get it between ${formatDate(deliveryStart)} and ${formatDate(deliveryEnd)}`;

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

            {/* Delivery Estimation */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Truck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-1">Estimated Delivery</h4>
                <p className="text-sm text-text-muted">{deliveryText}</p>
              </div>
            </div>

            {/* Quantity & Add to Cart Client Component */}
            <AddToCartClient 
              productId={product.id}
              stock={product.stock}
              name={product.name}
            />

            {/* Share */}
            <div className="flex items-center gap-4 mb-8 pt-6 border-t border-slate-100">
              <span className="text-sm font-medium text-text-muted flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Share:
              </span>
              <div className="flex gap-2">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=https://elecshop.com/store/${product.slug}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors" aria-label="Share on Facebook">
                  <span className="text-sm font-bold" aria-hidden="true">f</span>
                </a>
                <a href={`https://twitter.com/intent/tweet?url=https://elecshop.com/store/${product.slug}&text=Check out this ${product.name}!`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-colors" aria-label="Share on Twitter">
                  <span className="text-xs font-bold" aria-hidden="true">X</span>
                </a>
                <a href={`https://wa.me/?text=Check out this ${product.name}! https://elecshop.com/store/${product.slug}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors" aria-label="Share on WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
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

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />

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
