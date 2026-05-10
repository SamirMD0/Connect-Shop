import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ValueProps } from '@/components/home/ValueProps';
import { Newsletter } from '@/components/home/Newsletter';
import { api } from '@/lib/api';
import { Product, Category, CarouselSlide } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ElecSHOP | Premium Electronics & Gadgets',
  description: 'Shop the latest electronics, laptops, smartphones, and accessories at ElecSHOP.',
};

export default async function HomePage() {
  let featured: Product[] = [];
  let categories: Category[] = [];
  let slides: CarouselSlide[] = [];

  try {
    const [featuredRes, catRes, slidesRes] = await Promise.all([
      api.get<{ success: boolean; products: Product[] }>('/api/products/featured'),
      api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
      api.get<{ success: boolean; slides: CarouselSlide[] }>('/api/carousel').catch(() => ({ success: false, slides: [] }))
    ]);
    featured = featuredRes.products || [];
    categories = catRes.categories || [];
    slides = slidesRes.slides || [];
  } catch (error) {
    console.error('Error fetching homepage data:', error);
  }

  // Provide fallback slides if API fails or is not implemented yet
  if (slides.length === 0) {
    slides = [
      {
        id: 1,
        image_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=2000',
        title: 'Next-Gen Electronics',
        subtitle: 'Discover the latest in tech innovation with our premium selection of devices.',
        link_url: '/store',
        button_text: 'Shop Now',
        display_order: 1,
        is_active: true
      }
    ];
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Carousel - Full Width */}
      <section className="pb-8">
        <HeroCarousel slides={slides} />
      </section>

      {/* Shop by Category */}
      <section className="py-16">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-text-primary mb-3">
              Shop by Category
            </h2>
            <p className="text-text-muted">
              Browse our curated collection of premium electronics
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/store?category=${cat.slug}`}
                className="group"
              >
                <div className="bg-bg-surface border border-slate-200/60 rounded-2xl p-5 text-center transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 h-full">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                    {cat.image_url ? (
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/10 to-accent-glow/10 rounded-2xl flex items-center justify-center">
                        <span className="text-3xl font-bold text-accent/40">
                          {cat.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {cat.name}
                  </h3>
                  {cat.product_count !== undefined && (
                    <span className="inline-block mt-2 text-xs text-text-muted bg-slate-100 px-2.5 py-1 rounded-full">
                      {cat.product_count} products
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-slate-50">
        <Container>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-text-primary mb-2">Featured Products</h2>
              <p className="text-text-muted">Handpicked favorites from our collection</p>
            </div>
            <Link 
              href="/store" 
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-glow transition-colors group"
            >
              View all 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <ProductGrid products={featured} />

          <div className="mt-8 text-center sm:hidden">
            <Link 
              href="/store" 
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-glow transition-colors"
            >
              View all products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Value Props */}
      <section className="py-16">
        <Container>
          <ValueProps />
        </Container>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-slate-50">
        <Container>
          <Newsletter />
        </Container>
      </section>
    </div>
  );
}
