import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const promos = [
  {
    title: 'Smart Security Home Camera',
    eyebrow: 'Limited time offer',
    price: '$99',
    compareAt: '$149',
    href: '/store',
    image: '/nextmerce/hero/hero-03.png',
  },
  {
    title: 'Galaxy S24 Ultra',
    eyebrow: 'Save up to $220',
    price: '$899',
    compareAt: '$1,119',
    href: '/store?sort=rating',
    image: '/nextmerce/hero/hero-02.png',
  },
];

export function PromoTiles() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {promos.map((promo) => (
        <Link
          key={promo.title}
          href={promo.href}
          className="group relative min-h-[210px] overflow-hidden rounded-[10px] bg-white p-5 shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-xl hover:shadow-slate-200/80 sm:p-7"
        >
          <div className="relative z-10 max-w-[210px]">
            <h2 className="mb-12 text-xl font-semibold leading-snug text-[#1C274C] transition-colors group-hover:text-accent">
              {promo.title}
            </h2>

            <p className="mb-1.5 text-sm font-medium text-text-muted">{promo.eyebrow}</p>
            <span className="flex items-center gap-3">
              <span className="text-2xl font-semibold text-red-500">{promo.price}</span>
              <span className="text-lg font-medium text-text-muted line-through">{promo.compareAt}</span>
            </span>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Shop Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>

          <Image
            src={promo.image}
            alt={promo.title}
            width={170}
            height={180}
            className="absolute bottom-3 right-3 h-[145px] w-[145px] object-contain transition-transform duration-500 group-hover:scale-105 sm:h-[170px] sm:w-[170px]"
          />
        </Link>
      ))}
    </div>
  );
}
