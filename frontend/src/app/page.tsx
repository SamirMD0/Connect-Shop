import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ServiceFeatures } from '@/components/home/ServiceFeatures';
import { BrowseCategories } from '@/components/home/BrowseCategories';
import { NextmercePromoBanners } from '@/components/home/NextmercePromoBanners';
import { BestSellers } from '@/components/home/BestSellers';
import { CountdownPromo } from '@/components/home/CountdownPromo';
import { Testimonials } from '@/components/home/Testimonials';
import { Newsletter } from '@/components/home/Newsletter';
import { api } from '@/lib/api';
import { Product, Category, CarouselSlide, HomepageContent, HomepageContentResponse, HomepageSectionItem } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ELECTRO SHOP | Premium Electronics & Gadgets',
  description: 'Shop the latest electronics, laptops, smartphones, and accessories at ELECTRO SHOP.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const emptyHomepageContent: HomepageContent = {
  hero_carousel: [],
  hero_side_promo: [],
  service_features: [],
  browse_categories: [],
  promo_banners: [],
  countdown_promo: null,
  testimonials: [],
  newsletter: null,
};

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function getSafeLink(link: string | null | undefined, fallback = '/store'): string {
  if (!link) return fallback;
  if (link.startsWith('/') && !link.startsWith('//')) return link;

  try {
    const url = new URL(link);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? link : fallback;
  } catch {
    return fallback;
  }
}

function mapCmsHeroSlides(items: HomepageSectionItem[]): CarouselSlide[] {
  return items
    .filter((item) => Boolean(item.image_url))
    .map((item, index) => ({
      id: index + 1,
      image_url: item.image_url as string,
      title: item.title || 'Next-Gen Electronics',
      subtitle: item.subtitle || item.description,
      link_url: getSafeLink(item.button_link),
      button_text: item.button_text || 'Shop Now',
      display_order: item.sort_order ?? index,
      is_active: item.is_active,
      eyebrow: getMetadataString(item.metadata, 'eyebrow') || null,
      metadata: item.metadata,
    }));
}

export default async function HomePage() {
  let featured: Product[] = [];
  let trending: Product[] = [];
  let categories: Category[] = [];
  let slides: CarouselSlide[] = [];
  let homepage: HomepageContent = emptyHomepageContent;

  try {
    const [featuredRes, trendingRes, catRes, slidesRes, homepageRes] = await Promise.all([
      api.get<{ success: boolean; products: Product[] }>('/api/products/featured'),
      api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { sort: 'rating', limit: 8 },
      }),
      api.get<{ success: boolean; categories: Category[] }>('/api/categories'),
      api.get<{ success: boolean; slides: CarouselSlide[] }>('/api/carousel').catch(() => ({ success: false, slides: [] })),
      api.get<HomepageContentResponse>('/api/homepage', { cache: 'no-store' }).catch(() => ({ success: false, homepage: emptyHomepageContent })),
    ]);
    featured = featuredRes.products || [];
    trending = trendingRes.products || [];
    categories = catRes.categories || [];
    slides = slidesRes.slides || [];
    homepage = homepageRes.homepage || emptyHomepageContent;
  } catch (error) {
    console.error('Error fetching homepage data:', error);
  }

  const cmsHeroSlides = mapCmsHeroSlides(homepage.hero_carousel || []);
  if (cmsHeroSlides.length > 0) {
    slides = cmsHeroSlides;
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

  const parentCategories = categories.filter(category => !category.parent_id);
  const displayCategories = (parentCategories.length > 0 ? parentCategories : categories).slice(0, 8);
  const categoryImages = [
    '/nextmerce/categories/categories-01.png',
    '/nextmerce/categories/categories-02.png',
    '/nextmerce/categories/categories-03.png',
    '/nextmerce/categories/categories-04.png',
    '/nextmerce/categories/categories-05.png',
    '/nextmerce/categories/categories-06.png',
    '/nextmerce/categories/categories-07.png',
  ];
  const bestSellerProducts = trending.length > 0 ? trending : featured;
  const heroSidePromos = (homepage.hero_side_promo || [])
    .filter((promo) => promo.title || promo.image_url || promo.description || promo.subtitle)
    .map((promo, index) => ({
        id: promo.id,
        title: promo.title || '',
        eyebrow: getMetadataString(promo.metadata, 'eyebrow') || promo.subtitle || '',
        savings: getMetadataString(promo.metadata, 'savings') || promo.description || '',
        image: promo.image_url,
        className: index % 2 === 0 ? 'bg-[#DDEFF6]' : 'bg-[#ECE8DE]',
        href: getSafeLink(promo.button_link, '/store'),
      }));
  const hasHeroSidePromos = heroSidePromos.length > 0;

  return (
    <div className="animate-fade-in bg-white">
      <section className="overflow-hidden bg-white pb-8 pt-3 sm:pt-4">
        <Container className="max-w-[1440px]">
          <div className={`grid gap-5 ${hasHeroSidePromos ? 'xl:grid-cols-[minmax(0,1fr)_459px]' : ''}`}>
            <div className="w-full">
              <HeroCarousel slides={slides} />
            </div>

            {hasHeroSidePromos && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                {heroSidePromos.map((promo) => (
                  <Link
                    key={promo.id}
                    href={promo.href}
                    className={`group relative min-h-[250px] overflow-hidden rounded-[10px] p-7 transition-shadow hover:shadow-xl hover:shadow-slate-200/80 lg:min-h-[290px] ${promo.className}`}
                  >
                    <div className="relative z-10 max-w-[205px]">
                      {promo.title && (
                        <h2 className="text-2xl font-semibold leading-snug text-[#0B1B48] transition-colors group-hover:text-accent sm:text-[28px]">
                          {promo.title}
                        </h2>
                      )}
                      {(promo.eyebrow || promo.savings) && (
                        <p className="mt-28 text-sm font-medium text-[#0B1B48] sm:mt-36">
                          {promo.eyebrow} {promo.savings && <span className="text-lg text-accent">{promo.savings}</span>}
                        </p>
                      )}
                    </div>

                    {promo.image && (
                      <Image
                        src={promo.image}
                        alt={promo.title || 'Promotion'}
                        width={220}
                        height={220}
                        className="absolute bottom-8 right-6 h-[150px] w-[150px] object-contain transition-transform duration-500 group-hover:scale-105 sm:h-[190px] sm:w-[190px]"
                      />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ServiceFeatures features={homepage.service_features} />
        </Container>
      </section>

      <BrowseCategories categories={displayCategories} fallbackImages={categoryImages} />

      <section className="py-14 sm:py-16">
        <Container className="max-w-[1170px]">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <span className="mb-1.5 flex items-center gap-2.5 font-medium text-[#0B1B48]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3.11826 15.4622C4.11794 16.6668 5.97853 16.6668 9.69971 16.6668H10.3007C14.0219 16.6668 15.8825 16.6668 16.8821 15.4622M3.11826 15.4622C2.11857 14.2577 2.46146 12.429 3.14723 8.77153C3.63491 6.17055 3.87875 4.87006 4.8045 4.10175M16.8821 15.4622C17.8818 14.2577 17.5389 12.429 16.8532 8.77153C16.3655 6.17055 16.1216 4.87006 15.1959 4.10175M15.1959 4.10175C14.2701 3.33345 12.947 3.33345 10.3007 3.33345H9.69971C7.0534 3.33345 5.73025 3.33345 4.8045 4.10175"
                    stroke="#3C50E0"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7.64258 6.66678C7.98578 7.63778 8.91181 8.33345 10.0003 8.33345C11.0888 8.33345 12.0149 7.63778 12.3581 6.66678"
                    stroke="#3C50E0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                This Week’s
              </span>
              <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
                New Arrivals
              </h2>
            </div>
            <Link
              href="/store"
              className="inline-flex rounded-md border border-slate-200 bg-[#F6F7FB] px-7 py-2.5 text-sm font-medium text-[#0B1B48] transition-colors hover:border-transparent hover:bg-[#0B1B48] hover:text-white"
            >
              View All
            </Link>
          </div>

          {featured.length > 0 ? (
            <ProductGrid products={featured} />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-[#F6F7FB] px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-[#0B1B48]">No new arrivals yet</h3>
              <p className="mt-2 text-sm text-text-muted">
                Featured products from your existing backend will appear here.
              </p>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link 
              href="/store" 
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
            >
              View all products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      <NextmercePromoBanners banners={homepage.promo_banners} />

      <BestSellers products={bestSellerProducts} />

      <CountdownPromo promo={homepage.countdown_promo} />

      <Testimonials testimonials={homepage.testimonials} />

      <section className="bg-white py-14 sm:py-16">
        <Container>
          <Newsletter content={homepage.newsletter} />
        </Container>
      </section>
    </div>
  );
}
