import Image from 'next/image';
import Link from 'next/link';
import { HomepageSectionItem } from '@/lib/types';

interface NextmercePromoBannersProps {
  banners?: HomepageSectionItem[];
}

function getSafeLink(link: string | null | undefined): string {
  if (!link) return '/store';
  if (link.startsWith('/') && !link.startsWith('//')) return link;

  try {
    const url = new URL(link);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? link : '/store';
  } catch {
    return '/store';
  }
}

export function NextmercePromoBanners({ banners }: NextmercePromoBannersProps) {
  if (banners && banners.length > 0) {
    const [featuredBanner, ...secondaryBanners] = banners;
    const smallBanners = secondaryBanners.slice(0, 2);

    return (
      <section className="overflow-hidden bg-white py-14 sm:py-16">
        <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <Link
            href={getSafeLink(featuredBanner.button_link)}
            aria-label={featuredBanner.title || featuredBanner.description || 'Featured promotion'}
            className="group relative z-[1] mb-7 block aspect-[16/9] min-h-[260px] overflow-hidden rounded-lg bg-[#F5F5F7] sm:min-h-[330px] lg:min-h-[390px]"
          >
            {featuredBanner.image_url && (
              <Image
                src={featuredBanner.image_url}
                alt={featuredBanner.title || 'Featured offer'}
                fill
                sizes="(min-width: 1170px) 1170px, 100vw"
                className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                priority={false}
              />
            )}
          </Link>

          {smallBanners.length > 0 && (
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
              {smallBanners.map((banner, index) => {
                const isGreen = index % 2 === 0;
                return (
                  <Link
                    key={banner.id}
                    href={getSafeLink(banner.button_link)}
                    aria-label={banner.title || banner.description || 'Promotion'}
                    className={`group relative z-[1] block aspect-[16/9] min-h-[220px] overflow-hidden rounded-lg ${isGreen ? 'bg-[#DBF4F3]' : 'bg-[#FFECE1]'}`}
                  >
                    {banner.image_url && (
                      <Image
                        src={banner.image_url}
                        alt={banner.title || 'Promotion'}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
}
