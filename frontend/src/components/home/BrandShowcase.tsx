import Image from 'next/image';
import Link from 'next/link';
import { Brand } from '@/lib/types';

interface BrandShowcaseProps {
  brands: Brand[];
}

export function BrandShowcase({ brands }: BrandShowcaseProps) {
  const visibleBrands = brands
    .filter((brand) => brand.is_active && brand.logo_url)
    .slice(0, 12);

  if (visibleBrands.length === 0) return null;

  return (
    <section className="bg-white py-6 sm:py-12">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="flex snap-x snap-mandatory items-center gap-5 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:gap-x-8 sm:gap-y-8 sm:overflow-visible sm:pb-0 md:grid-cols-4 lg:grid-cols-6">
          {visibleBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/store?brand=${brand.slug}`}
              className="group flex min-w-[88px] shrink-0 snap-start items-center justify-center sm:min-w-0"
              aria-label={`Shop ${brand.name}`}
            >
              <div className="relative h-14 w-[88px] sm:h-28 sm:w-full sm:max-w-[190px] lg:h-32">
                <Image
                  src={brand.logo_url as string}
                  alt={brand.name}
                  fill
                  sizes="(min-width: 1024px) 190px, (min-width: 640px) 28vw, 88px"
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
