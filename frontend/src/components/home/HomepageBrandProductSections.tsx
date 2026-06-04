import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HomepageBrandProductSection } from '@/lib/types';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from '@/components/products/ProductGrid';
import { HomepageProductRail } from '@/components/home/HomepageProductRail';

interface HomepageBrandProductSectionsProps {
  sections?: HomepageBrandProductSection[];
}

function getBrandStoreHref(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return `/store?brand=${encodeURIComponent(slug)}`;
}

export function HomepageBrandProductSections({ sections = [] }: HomepageBrandProductSectionsProps) {
  const visibleSections = sections.filter((section) => Array.isArray(section.products) && section.products.length > 0);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <div className="bg-white">
      {visibleSections.map((section) => {
        const products = section.products || [];
        const brandHref = getBrandStoreHref(section.brand?.slug);
        const brandName = section.brand?.name;

        return (
          <section key={section.id} className="py-10 sm:py-12">
            <Container className="max-w-[1170px]">
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  {brandName && (
                    <p className="mb-1.5 text-sm font-medium text-accent">
                      {brandName}
                    </p>
                  )}
                  <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      {section.subtitle}
                    </p>
                  )}
                </div>

                {brandHref && (
                  <Link
                    href={brandHref}
                    className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-[#F6F7FB] px-5 py-2.5 text-sm font-medium text-[#0B1B48] transition-colors hover:border-transparent hover:bg-[#0B1B48] hover:text-white"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {section.layout === 'rail' ? (
                <HomepageProductRail products={products} label={section.title} />
              ) : (
                <ProductGrid products={products} />
              )}
            </Container>
          </section>
        );
      })}
    </div>
  );
}
