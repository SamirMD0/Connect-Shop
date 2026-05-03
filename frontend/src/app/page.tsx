'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { api } from '@/lib/api';
import { Product, Category, CarouselSlide } from '@/lib/types';

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [featuredRes, catRes, slidesRes] = await Promise.all([
          api.get<{ success: boolean; products: Product[] }>('/api/products/featured'),
          api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
          api.get<{ success: boolean; slides: CarouselSlide[] }>('/api/carousel')
        ]);
        setFeatured(featuredRes.products || []);
        setCategories(catRes.categories || []);
        setSlides(slidesRes.slides || []);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="py-8">
        <Container>
          <HeroCarousel slides={slides} />
        </Container>
      </section>

      {/* Categories */}
      <section className="py-16">
        <Container>
          <h2 className="text-2xl font-bold text-text-primary mb-8 text-center">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/store?category=${cat.slug}`}
                className="glass-card p-6 text-center group"
              >
                <span className="block mb-4 mx-auto w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 relative transition-transform duration-300 group-hover:scale-110">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-3xl flex items-center justify-center w-full h-full">📦</span>
                  )}
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {cat.name}
                </h3>
                {cat.product_count !== undefined && (
                  <p className="text-xs text-text-muted mt-1">
                    {cat.product_count} products
                  </p>
                )}
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-bg-surface/20">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-text-primary">Featured Products</h2>
            <Link href="/store" className="text-sm text-accent hover:text-accent-glow transition-colors">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : (
            <ProductGrid products={featured} />
          )}
        </Container>
      </section>

      {/* Value Props */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: '🚀',
                title: 'Free Shipping',
                description: 'Free delivery on all orders. No minimum purchase required.',
              },
              {
                icon: '🔒',
                title: 'Secure Checkout',
                description: 'Your data is protected with industry-standard encryption.',
              },
              {
                icon: '💬',
                title: '24/7 Support',
                description: 'Get help anytime from our dedicated support team.',
              },
            ].map(prop => (
              <div key={prop.title} className="glass-card p-6 text-center">
                <span className="text-3xl block mb-3">{prop.icon}</span>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{prop.title}</h3>
                <p className="text-xs text-text-muted">{prop.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
