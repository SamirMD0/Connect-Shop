import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductDisplay } from '@/components/products/ProductDisplay';
import { ProductReviews } from '@/components/products/ProductReviews';
import { ProductQuestions } from '@/components/products/ProductQuestions';
import { RecentlyViewedProducts } from '@/components/products/RecentlyViewedProducts';
import { api } from '@/lib/api';
import { APP_NAME, SITE_URL } from '@/lib/constants';
import { logServerRenderTiming } from '@/lib/perf';
import { Product } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

export const revalidate = 300;

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

export async function generateStaticParams() {
  try {
    const res = await api.get<{ success: boolean; products: Product[] }>('/api/products', {
      params: { limit: 100 },
    });
    return (res.products || []).map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const product = await getProduct(p.slug);
  
  if (!product) {
    return { title: `Product Not Found | ${APP_NAME}` };
  }

  const description = product.meta_description || product.description?.slice(0, 160) || `Buy ${product.name} at ${APP_NAME}.`;
  const title = product.meta_title || `${product.name} | ${APP_NAME}`;
  const productUrl = `${SITE_URL}/store/${product.slug}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: productUrl,
      images: product.image_url ? [product.image_url] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.image_url ? [product.image_url] : undefined,
    },
    alternates: {
      canonical: `/store/${product.slug}`,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const renderStart = performance.now();
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

  logServerRenderTiming({
    pageType: 'product_detail',
    phase: 'render_prep',
    durationMs: performance.now() - renderStart,
  });

  const imageUrls = [
    product.image_url,
    ...(product.gallery_images || []).map((image) => image.image_url),
  ].filter(Boolean) as string[];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: imageUrls,
    description: product.description || product.meta_description || undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    aggregateRating: product.review_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.review_count,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/store/${product.slug}`,
    },
  };
  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <div className="animate-fade-in">
      <script type="application/ld+json">{safeJsonLd}</script>
      <Container className="py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex min-w-0 items-center gap-2 overflow-hidden text-sm text-text-muted" aria-label="Breadcrumb">
          <Link href="/store" className="shrink-0 transition-colors hover:text-accent">Store</Link>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          {product.category_slug ? (
            <Link href={`/store?category=${product.category_slug}`} className="shrink-0 transition-colors hover:text-accent">
              {product.category_name}
            </Link>
          ) : (
            <span>{product.category_name || 'Product'}</span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-text-primary truncate">{product.name}</span>
        </nav>

        {/* Main Content */}
        <ProductDisplay product={product} />

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />

        {/* Product Q&A */}
        <ProductQuestions slug={product.slug} />

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="mb-7 text-2xl font-bold text-text-primary">You might also like</h2>
            <ProductGrid products={related} />
          </section>
        )}

        <RecentlyViewedProducts currentProductId={product.id} />
      </Container>
    </div>
  );
}
