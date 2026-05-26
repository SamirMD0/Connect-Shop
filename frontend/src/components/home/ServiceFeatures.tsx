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
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4 xl:gap-12">
        {items.map((item) => (
          <div className="flex items-center gap-4" key={item.title}>
            <Image src={item.img} alt="" width={40} height={41} />
            <div>
              <h3 className="text-lg font-medium text-[#0B1B48]">{item.title}</h3>
              <p className="text-sm text-text-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
