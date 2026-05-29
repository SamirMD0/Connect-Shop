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
    <section className="bg-white py-10 sm:py-12">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="grid grid-cols-2 items-center gap-x-8 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visibleBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/store?brand=${brand.slug}`}
              className="group flex items-center justify-center"
              aria-label={`Shop ${brand.name}`}
            >
              <div className="relative h-24 w-full max-w-[190px] sm:h-28 lg:h-32">
                <Image
                  src={brand.logo_url as string}
                  alt={brand.name}
                  fill
                  sizes="(min-width: 1024px) 190px, (min-width: 640px) 28vw, 45vw"
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
