import Image from 'next/image';
import Link from 'next/link';
import { HomepageSectionItem } from '@/lib/types';

interface NextmercePromoBannersProps {
  banners?: HomepageSectionItem[];
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
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
            className="group relative z-[1] mb-7 block min-h-[330px] overflow-hidden rounded-lg bg-[#F5F5F7] px-5 py-10 sm:px-8 lg:min-h-[390px] lg:px-14 lg:py-16 xl:px-20"
          >
            <div className="relative z-10 max-w-[550px]">
              {(featuredBanner.subtitle || getMetadataString(featuredBanner.metadata, 'eyebrow')) && (
                <span className="mb-3 block text-lg font-medium text-[#0B1B48] sm:text-xl">
                  {featuredBanner.subtitle || getMetadataString(featuredBanner.metadata, 'eyebrow')}
                </span>
              )}

              {featuredBanner.title && (
                <h2 className="mb-5 text-3xl font-bold leading-tight text-[#0B1B48] sm:text-4xl lg:text-[44px]">
                  {featuredBanner.title}
                </h2>
              )}

              {featuredBanner.description && (
                <p className="max-w-[480px] text-sm leading-6 text-slate-600 sm:text-base">
                  {featuredBanner.description}
                </p>
              )}

              <span className="mt-7 inline-flex rounded-md bg-[#3C50E0] px-9 py-3 text-sm font-medium text-white transition-colors group-hover:bg-[#0B1B48]">
                {featuredBanner.button_text || 'Buy Now'}
              </span>
            </div>

            {featuredBanner.image_url && (
              <Image
                src={featuredBanner.image_url}
                alt={featuredBanner.title || 'Featured offer'}
                width={274}
                height={350}
                className="absolute bottom-0 right-0 z-0 h-[255px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 sm:right-8 sm:h-[315px] lg:right-20 lg:h-[350px]"
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
                    className={`group relative z-[1] min-h-[255px] overflow-hidden rounded-lg px-5 py-10 sm:px-8 xl:px-10 xl:py-16 ${isGreen ? 'bg-[#DBF4F3]' : 'bg-[#FFECE1]'}`}
                  >
                    {banner.image_url && (
                      <Image
                        src={banner.image_url}
                        alt={banner.title || 'Promotion'}
                        width={220}
                        height={220}
                        className={`absolute z-0 h-[150px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 sm:h-[200px] ${isGreen ? 'left-0 top-1/2 -translate-y-1/2 sm:left-8' : 'bottom-4 right-2 sm:right-8 sm:top-1/2 sm:-translate-y-1/2'}`}
                      />
                    )}

                    <div className={`relative z-10 max-w-[285px] ${isGreen ? 'ml-auto text-right' : ''}`}>
                      {(banner.subtitle || getMetadataString(banner.metadata, 'eyebrow')) && (
                        <span className="mb-1.5 block text-lg text-[#0B1B48]">
                          {banner.subtitle || getMetadataString(banner.metadata, 'eyebrow')}
                        </span>
                      )}

                      {banner.title && (
                        <h3 className="mb-2.5 text-2xl font-bold leading-tight text-[#0B1B48] sm:text-[28px]">
                          {banner.title}
                        </h3>
                      )}

                      {(banner.description || getMetadataString(banner.metadata, 'offer')) && (
                        <p className={`${isGreen ? 'text-lg font-semibold text-[#10B981]' : 'text-sm leading-6 text-slate-600'}`}>
                          {banner.description || getMetadataString(banner.metadata, 'offer')}
                        </p>
                      )}

                      <span className={`mt-7 inline-flex rounded-md px-8 py-2.5 text-sm font-medium text-white transition-colors ${isGreen ? 'bg-[#10B981] group-hover:bg-[#0F766E]' : 'bg-[#F97316] group-hover:bg-[#C2410C]'}`}>
                        {banner.button_text || 'Buy Now'}
                      </span>
                    </div>
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
