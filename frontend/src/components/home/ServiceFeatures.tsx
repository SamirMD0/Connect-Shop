import Image from 'next/image';
import { HomepageSectionItem } from '@/lib/types';

const featureData = [
  {
    img: '/nextmerce/icons/icon-01.svg',
    title: 'Free Shipping',
    description: 'Orders $50 or more',
  },
  {
    img: '/nextmerce/icons/icon-02.svg',
    title: '1 & 1 Returns',
    description: '30 days guarantee',
  },
  {
    img: '/nextmerce/icons/icon-03.svg',
    title: '100% Secure Payments',
    description: 'Safe checkout',
  },
  {
    img: '/nextmerce/icons/icon-04.svg',
    title: '24/7 Dedicated Support',
    description: 'Anywhere & anytime',
  },
];

interface ServiceFeaturesProps {
  features?: HomepageSectionItem[];
}

export function ServiceFeatures({ features }: ServiceFeaturesProps) {
  const items = features && features.length > 0
    ? features.map((feature, index) => ({
        img: feature.image_url || featureData[index % featureData.length].img,
        title: feature.title || featureData[index % featureData.length].title,
        description: feature.description || feature.subtitle || featureData[index % featureData.length].description,
      }))
    : featureData;

  return (
    <div className="mx-auto mt-10 w-full max-w-[1060px] px-4 sm:px-8 xl:px-0">
      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-7 sm:overflow-visible sm:pb-0 xl:grid-cols-4 xl:gap-12">
        {items.map((item) => (
          <div className="flex min-w-[270px] shrink-0 snap-start items-center gap-3 sm:min-w-0 sm:gap-4" key={item.title}>
            <Image src={item.img} alt="" width={36} height={37} className="sm:h-[41px] sm:w-10" />
            <div className="min-w-0">
              <h3 className="whitespace-nowrap text-base font-medium text-[#0B1B48] sm:text-lg">{item.title}</h3>
              <p className="text-sm text-text-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
