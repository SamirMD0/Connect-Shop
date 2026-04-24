'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSkeleton } from '@/components/products/ProductSkeleton';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Product, Category } from '@/lib/types';

const categoryIcons: Record<string, string> = {
  smartphone: '📱',
  laptop: '💻',
  headphones: '🎧',
  watch: '⌚',
  gamepad: '🎮',
  cable: '🔌',
};

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [featuredRes, catRes] = await Promise.all([
          api.get<{ success: boolean; products: Product[] }>('/api/products/featured'),
          api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
        ]);
        setFeatured(featuredRes.products || []);
        setCategories(catRes.categories || []);
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-bg-primary to-accent-glow/5" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-glow/8 rounded-full blur-3xl" />
        </div>

        <Container className="relative py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="text-gradient">Premium Electronics</span>
              <br />
              <span className="text-text-primary">At Your Fingertips</span>
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
              Discover the latest smartphones, laptops, audio gear, and more. 
              Curated quality, competitive prices, free shipping on every order.
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <Link href="/store">
                <Button size="lg" variant="primary">
                  Browse Store
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
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
                <span className="text-3xl block mb-3">
                  {categoryIcons[cat.icon || ''] || '📦'}
                </span>
                <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
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
