import Image from 'next/image';
import Link from 'next/link';
import { HomepageSection, HomepageSectionItem } from '@/lib/types';

const fallbackCountdownItems = [
  { value: '00', label: 'Days' },
  { value: '00', label: 'Hours' },
  { value: '00', label: 'Minutes' },
  { value: '00', label: 'Seconds' },
];

interface CountdownPromoProps {
  promo?: HomepageSection | HomepageSectionItem | null;
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

function getCountdownItems(endDate: string): typeof fallbackCountdownItems {
  const end = Date.parse(endDate);
  if (!Number.isFinite(end)) return fallbackCountdownItems;

  const remaining = Math.max(0, end - Date.now());
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return [
    { value: String(days).padStart(2, '0'), label: 'Days' },
    { value: String(hours).padStart(2, '0'), label: 'Hours' },
    { value: String(minutes).padStart(2, '0'), label: 'Minutes' },
    { value: String(seconds).padStart(2, '0'), label: 'Seconds' },
  ];
}

export function CountdownPromo({ promo }: CountdownPromoProps) {
  const eyebrow = promo
    ? ('eyebrow' in promo ? promo.eyebrow : null) || promo.subtitle || getMetadataString(promo.metadata, 'eyebrow')
    : null;
  const backgroundImage = promo && 'background_image_url' in promo ? promo.background_image_url : null;
  const endDate = promo ? getMetadataString(promo.metadata, 'end_date') || getMetadataString(promo.metadata, 'endDate') : '';
  const countdownItems = endDate ? getCountdownItems(endDate) : fallbackCountdownItems;

  return (
    <section className="overflow-hidden bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="relative z-[1] overflow-hidden rounded-lg bg-[#D0E9F3] p-6 sm:p-8 lg:p-10 xl:p-15">
          <div className="relative z-10 max-w-[422px]">
            <span className="mb-2.5 block text-base font-medium text-[#ffffff]">
              {eyebrow || "Don't Miss!!"}
            </span>

            <h2 className="mb-3 text-3xl font-bold leading-tight text-[#ffffff] sm:text-4xl lg:text-[44px]">
              {promo?.title || 'Enhance Your Music Experience'}
            </h2>

            <p className="text-sm leading-6 text-yellow-400 sm:text-base">
              {promo?.description || 'iPhone 16 Pro Max delivers immersive audio, sharp performance, and a premium everyday experience.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-5 sm:gap-6">
              {countdownItems.map((item) => (
                <div key={item.label}>
                  <span className="mb-2 flex h-[58px] min-w-[64px] items-center justify-center rounded-lg bg-white px-4 text-xl font-semibold text-[#0B1B48] shadow-lg shadow-slate-200/70 lg:text-3xl">
                    {item.value}
                  </span>
                  <span className="block text-center text-sm text-[#ffffff]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href={getSafeLink(promo?.button_link)}
              className="mt-8 inline-flex rounded-md bg-[#000000] px-9 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0B1B48]"
            >
              {promo?.button_text || 'Check it Out!'}
            </Link>
          </div>

          <Image
            src={backgroundImage || '/nextmerce/countdown/countdown-bg.png'}
            alt="background shapes"
            width={737}
            height={482}
            className="absolute inset-0 z-0 hidden h-full w-full object-cover sm:block"
          />
          <Image
            src={promo?.image_url || '/nextmerce/countdown/countdown-01.png'}
            alt={promo?.title || 'featured product'}
            width={411}
            height={376}
            className="absolute bottom-6 right-4 z-0 hidden h-[300px] w-auto object-contain transition-transform duration-500 hover:scale-105 lg:block xl:bottom-10 xl:right-28 xl:h-[376px]"
          />
        </div>
      </div>
    </section>
  );
}
