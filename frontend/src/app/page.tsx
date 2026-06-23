import { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { ServiceFeatures } from '@/components/home/ServiceFeatures';
import { BrowseCategories } from '@/components/home/BrowseCategories';
import { AllCategoriesSection } from '@/components/home/AllCategoriesSection';
import { BrandShowcase } from '@/components/home/BrandShowcase';
import { HomepageBrandProductSections } from '@/components/home/HomepageBrandProductSections';
import { HomepageCategoryProductSections } from '@/components/home/HomepageCategoryProductSections';
import { HomepageProductRail } from '@/components/home/HomepageProductRail';
import { NextmercePromoBanners } from '@/components/home/NextmercePromoBanners';
import { BestSellers } from '@/components/home/BestSellers';
import { CountdownPromo } from '@/components/home/CountdownPromo';
import { Testimonials } from '@/components/home/Testimonials';
import { Newsletter } from '@/components/home/Newsletter';
import { api } from '@/lib/api';
import { APP_NAME } from '@/lib/constants';
import { logServerRenderTiming } from '@/lib/perf';
import {
  Product,
  Category,
  Brand,
  CarouselSlide,
  HomepageBlock,
  HomepageBrandProductSection,
  HomepageCategoryProductSection,
  HomepageContent,
  HomepageFullResponse,
  HomepagePromotion,
  HomepageSection,
  HomepageSectionItem,
} from '@/lib/types';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: `${APP_NAME} | Premium Electronics & Gadgets`,
  description: `Shop electronics, laptops, smartphones, appliances, and accessories at ${APP_NAME} with cash-on-delivery support.`,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${APP_NAME} | Premium Electronics & Gadgets`,
    description: `Browse products, categories, and cash-on-delivery deals from ${APP_NAME}.`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} | Premium Electronics & Gadgets`,
    description: `Browse products, categories, and cash-on-delivery deals from ${APP_NAME}.`,
  },
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
  brand_product_sections: [],
  category_product_sections: [],
  homepage_blocks: [],
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProductList(value: unknown): value is Product[] {
  return Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function isHomepageSectionItem(value: unknown): value is HomepageSectionItem {
  return isRecord(value)
    && typeof value.id === 'string'
    && isNullableString(value.section_id)
    && isNullableString(value.title)
    && isNullableString(value.subtitle)
    && isNullableString(value.description)
    && isNullableString(value.button_text)
    && isNullableString(value.button_link)
    && isNullableString(value.image_url)
    && (value.metadata === undefined || isRecord(value.metadata));
}

function isHomepageSectionContent(value: unknown): value is HomepageSection | HomepageSectionItem {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return false;
  }

  return isNullableString(value.title)
    && isNullableString(value.subtitle)
    && isNullableString(value.description)
    && isNullableString(value.button_text)
    && isNullableString(value.button_link)
    && isNullableString(value.image_url)
    && (value.metadata === undefined || isRecord(value.metadata));
}

function isBrandProductSection(value: unknown): value is HomepageBrandProductSection {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.products);
}

function isCategoryProductSection(value: unknown): value is HomepageCategoryProductSection {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.products);
}

function isPromotion(value: unknown): value is HomepagePromotion {
  return isRecord(value)
    && typeof value.id === 'number'
    && typeof value.title === 'string'
    && value.is_active === true;
}

function getBlockSectionData(block: HomepageBlock): Record<string, unknown> | null {
  return isRecord(block.data) ? block.data : null;
}

function promotionToHomepageItem(promotion: HomepagePromotion): HomepageSectionItem {
  return {
    id: `promotion-${promotion.id}`,
    section_id: 'homepage-block-promotion',
    title: promotion.title,
    subtitle: null,
    description: promotion.description,
    button_text: 'Shop Now',
    button_link: promotion.link_url,
    image_url: promotion.image_url,
    sort_order: promotion.display_order,
    is_active: promotion.is_active,
    metadata: { source: 'homepage_blocks' },
    created_at: promotion.created_at,
    updated_at: promotion.updated_at,
  };
}

type HeroSidePromo = {
  id: string;
  title: string;
  image: string | null;
  className: string;
  href: string;
};

function renderHeroBlock(slides: CarouselSlide[], homepage: HomepageContent, heroSidePromos: HeroSidePromo[]) {
  const hasHeroSidePromos = heroSidePromos.length > 0;

  return (
    <section key="hero_carousel" className="overflow-hidden bg-white pb-8 pt-3 sm:pt-4">
      <Container className="max-w-[1440px]">
        <div className={`grid gap-5 ${hasHeroSidePromos ? 'xl:grid-cols-[minmax(0,1fr)_459px]' : ''}`}>
          <div className="-mx-4 w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:w-full">
            <HeroCarousel slides={slides} />
          </div>

          {hasHeroSidePromos && (
            <div className="hidden gap-5 sm:grid sm:grid-cols-2 xl:grid-cols-1">
              {heroSidePromos.map((promo) => (
                <Link
                  key={promo.id}
                  href={promo.href}
                  aria-label={promo.title || 'Top promotion'}
                  className={`group relative block min-h-[250px] overflow-hidden rounded-[10px] transition-shadow hover:shadow-xl hover:shadow-slate-200/80 lg:min-h-[290px] ${promo.className}`}
                >
                  {promo.image && (
                    <Image
                      src={promo.image}
                      alt={promo.title || 'Promotion'}
                      fill
                      sizes="(min-width: 1280px) 459px, (min-width: 640px) 50vw, 100vw"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
  );
}

function renderHeroSidePromos(heroSidePromos: HeroSidePromo[]) {
  if (heroSidePromos.length === 0) return null;

  return (
    <section key="hero_side_promo" className="bg-white pb-8 sm:hidden">
      <Container className="max-w-[1170px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {heroSidePromos.map((promo) => (
            <Link
              key={promo.id}
              href={promo.href}
              aria-label={promo.title || 'Top promotion'}
              className={`group relative block min-h-[190px] overflow-hidden rounded-lg transition-shadow hover:shadow-xl hover:shadow-slate-200/80 sm:min-h-[230px] ${promo.className}`}
            >
              {promo.image && (
                <Image
                  src={promo.image}
                  alt={promo.title || 'Promotion'}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function renderNewArrivalsBlock(products: Product[]) {
  return (
    <section key="new_arrivals" className="py-14 sm:py-16">
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
              This Week&apos;s
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

        {products.length > 0 ? (
          <HomepageProductRail products={products} label="New Arrivals" />
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
  );
}

function renderFeaturedProductsBlock(key: string, title: string, products: Product[]) {
  if (products.length === 0) return null;

  return (
    <section key={key} className="bg-white py-14 sm:py-16">
      <Container className="max-w-[1170px]">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <span className="mb-1.5 flex items-center gap-2.5 font-medium text-[#0B1B48]">
              Products
            </span>
            <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
              {title}
            </h2>
          </div>
          <Link
            href="/store"
            className="inline-flex rounded-md border border-slate-200 bg-[#F6F7FB] px-7 py-2.5 text-sm font-medium text-[#0B1B48] transition-colors hover:border-transparent hover:bg-[#0B1B48] hover:text-white"
          >
            View All
          </Link>
        </div>
        <HomepageProductRail products={products} label={title} />
      </Container>
    </section>
  );
}

function renderHomepageBlock(
  block: HomepageBlock,
  context: {
    homepage: HomepageContent;
    slides: CarouselSlide[];
    heroSidePromos: HeroSidePromo[];
    featured: Product[];
    bestSellerProducts: Product[];
    categories: Category[];
    brands: Brand[];
    categoryImages: string[];
  }
) {
  if (!block.is_active) return null;

  const data = getBlockSectionData(block);

  switch (block.block_type) {
    case 'hero_carousel':
      return renderHeroBlock(context.slides, context.homepage, context.heroSidePromos);

    case 'brand_showcase':
      return <BrandShowcase key={block.id} brands={context.brands} />;

    case 'category_showcase':
      return (
        <BrowseCategories
          key={block.id}
          categories={context.categories}
          fallbackImages={context.categoryImages}
        />
      );

    case 'new_arrivals': {
      const products = data && isProductList(data.products) ? data.products : context.featured;
      return renderNewArrivalsBlock(products);
    }

    case 'brand_product_section': {
      const section = data && isBrandProductSection(data.section) ? data.section : null;
      return section ? <HomepageBrandProductSections key={block.id} sections={[section]} /> : null;
    }

    case 'category_product_section': {
      const section = data && isCategoryProductSection(data.section) ? data.section : null;
      return section ? <HomepageCategoryProductSections key={block.id} sections={[section]} /> : null;
    }

    case 'promotion_banner': {
      const promotion = data && isPromotion(data.promotion) ? data.promotion : null;
      return promotion ? (
        <NextmercePromoBanners key={block.id} banners={[promotionToHomepageItem(promotion)]} />
      ) : null;
    }

    case 'best_sellers': {
      const products = data && isProductList(data.products) ? data.products : context.bestSellerProducts;
      return products.length > 0 ? <BestSellers key={block.id} products={products} /> : null;
    }

    case 'featured_products': {
      const products = data && isProductList(data.products) ? data.products : context.featured;
      return renderFeaturedProductsBlock(block.id, 'Featured Products', products);
    }

    case 'testimonials': {
      const testimonials = data && Array.isArray(data.items)
        ? data.items.filter(isHomepageSectionItem)
        : context.homepage.testimonials;
      return testimonials.length > 0 ? <Testimonials key={block.id} testimonials={testimonials} /> : null;
    }

    case 'newsletter': {
      const newsletter = data && isHomepageSectionContent(data.section)
        ? data.section
        : context.homepage.newsletter;

      return (
        <section key={block.id} className="bg-white py-14 sm:py-16">
          <Container>
            <Newsletter content={newsletter} />
          </Container>
        </section>
      );
    }

    default:
      return null;
  }
}

const lockedTopBlockTypes = new Set<HomepageBlock['block_type']>([
  'hero_carousel',
  'brand_showcase',
  'category_showcase',
]);

const lowerHomepageBlockTypes = new Set<HomepageBlock['block_type']>([
  'best_sellers',
  'featured_products',
  'testimonials',
  'newsletter',
]);

export default async function HomePage() {
  const renderStart = performance.now();
  let featured: Product[] = [];
  let trending: Product[] = [];
  let categories: Category[] = [];
  let brands: Brand[] = [];
  let slides: CarouselSlide[] = [];
  let homepage: HomepageContent = emptyHomepageContent;

  try {
    const homepageRes = await api.get<HomepageFullResponse>('/api/homepage/full', { cache: 'no-store' });
    const homepageData = homepageRes.data;

    featured = homepageData.featuredProducts || [];
    trending = homepageData.trendingProducts || [];
    categories = homepageData.categories || [];
    brands = homepageData.brands || [];
    slides = homepageData.carouselSlides || [];
    homepage = {
      ...emptyHomepageContent,
      ...(homepageData.homepage || {}),
      brand_product_sections: homepageData.homepage?.brand_product_sections || [],
      category_product_sections: homepageData.homepage?.category_product_sections || [],
      homepage_blocks: homepageData.homepage?.homepage_blocks || [],
    };
    if (homepageRes.partialFailures && homepageRes.partialFailures.length > 0) {
      console.warn('Homepage aggregate returned section fallbacks:', homepageRes.partialFailures);
    }
  } catch (error) {
    console.error('Error fetching homepage aggregate data:', error);
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
        image: promo.image_url,
        className: index % 2 === 0 ? 'bg-[#DDEFF6]' : 'bg-[#ECE8DE]',
        href: getSafeLink(promo.button_link, '/store'),
      }));
  const homepageBlocks = [...(homepage.homepage_blocks || [])]
    .filter((block) => block.is_active)
    .sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }

      return a.id.localeCompare(b.id);
    });

  if (homepageBlocks.length > 0) {
    const blockContext = {
      homepage,
      slides,
      heroSidePromos,
      featured,
      bestSellerProducts,
      categories,
      brands,
      categoryImages,
    };
    const movableHomepageSections: ReactNode[] = [];
    const movableHomepageBlocks = homepageBlocks.filter((block) => (
      !lockedTopBlockTypes.has(block.block_type) && block.block_type !== 'promotion_banner'
    ));
    let promoBannersInserted = false;

    for (const block of movableHomepageBlocks) {
      if (!promoBannersInserted && lowerHomepageBlockTypes.has(block.block_type)) {
        movableHomepageSections.push(
          <NextmercePromoBanners key="fixed-middle-promo-banners" banners={homepage.promo_banners} />
        );
        promoBannersInserted = true;
      }

      movableHomepageSections.push(renderHomepageBlock(block, blockContext));
    }

    if (!promoBannersInserted) {
      movableHomepageSections.push(
        <NextmercePromoBanners key="fixed-middle-promo-banners" banners={homepage.promo_banners} />
      );
    }

    logServerRenderTiming({
      pageType: 'homepage',
      phase: 'render_prep',
      durationMs: performance.now() - renderStart,
    });

    return (
      <div className="animate-fade-in bg-white">
        {renderHeroBlock(slides, homepage, heroSidePromos)}
        <BrandShowcase brands={brands} />
        {renderHeroSidePromos(heroSidePromos)}
        <BrowseCategories categories={categories} fallbackImages={categoryImages} />
        {movableHomepageSections}
      </div>
    );
  }

  logServerRenderTiming({
    pageType: 'homepage',
    phase: 'render_prep',
    durationMs: performance.now() - renderStart,
  });

  return (
    <div className="animate-fade-in bg-white">
      {renderHeroBlock(slides, homepage, heroSidePromos)}

      <BrandShowcase brands={brands} />

      {renderHeroSidePromos(heroSidePromos)}

      <BrowseCategories categories={categories} fallbackImages={categoryImages} />

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
            <HomepageProductRail products={featured} label="New Arrivals" />
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

      <HomepageBrandProductSections sections={homepage.brand_product_sections || []} />

      <HomepageCategoryProductSections sections={homepage.category_product_sections || []} />

      <NextmercePromoBanners banners={homepage.promo_banners} />

      <BestSellers products={bestSellerProducts} />

      <CountdownPromo promo={homepage.countdown_promo} />

      <Testimonials testimonials={homepage.testimonials} />

      <section className="bg-white py-14 sm:py-16">
        <Container>
          <Newsletter content={homepage.newsletter} />
        </Container>
      </section>

      <AllCategoriesSection categories={categories} fallbackImages={categoryImages} />
    </div>
  );
}
