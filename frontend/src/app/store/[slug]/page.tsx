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
      params: { limit: 1000 },
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
    return { title: 'Product Not Found | ELECTRO SHOP' };
  }
  
  return {
    title: product.meta_title || `${product.name} | ELECTRO SHOP`,
    description: product.meta_description || product.description?.slice(0, 160) || `Buy ${product.name} at ELECTRO SHOP`,
    openGraph: {
      title: product.meta_title || product.name,
      description: product.meta_description || product.description || undefined,
      images: product.image_url ? [product.image_url] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.meta_title || product.name,
      description: product.meta_description || product.description?.slice(0, 160) || undefined,
      images: product.image_url ? [product.image_url] : undefined,
    },
    alternates: {
      canonical: `/store/${product.slug}`,
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

  const imageUrls = [
    product.image_url,
    ...(product.gallery_images || []).map((image) => image.image_url),
  ].filter(Boolean) as string[];
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
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
      url: `${baseUrl}/store/${product.slug}`,
    },
  };

  return (
    <div className="animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
        <ProductDisplay product={product} />

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />

        {/* Product Q&A */}
        <ProductQuestions slug={product.slug} />

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-text-primary mb-8">You Might Also Like</h2>
            <ProductGrid products={related} />
          </section>
        )}

        <RecentlyViewedProducts currentProductId={product.id} />
      </Container>
    </div>
  );
}
