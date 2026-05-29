import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/types';

interface AllCategoriesSectionProps {
  categories: Category[];
  fallbackImages: string[];
}

export function AllCategoriesSection({ categories, fallbackImages }: AllCategoriesSectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="bg-white pb-14 sm:pb-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="mb-8">
          <span className="mb-1.5 flex items-center gap-2.5 font-medium text-[#0B1B48]">
            Categories
          </span>
          <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
            All Categories
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/store?category=${category.slug}`}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm shadow-slate-200/60 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-slate-200/80"
            >
              <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-white">
                <Image
                  src={category.image_url || fallbackImages[index % fallbackImages.length]}
                  alt={category.name}
                  fill
                  sizes="96px"
                  className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <h3 className="line-clamp-2 text-sm font-medium text-[#0B1B48] transition-colors group-hover:text-accent">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
