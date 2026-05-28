import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/types';

interface BrowseCategoriesProps {
  categories: Category[];
  fallbackImages: string[];
}

export function BrowseCategories({ categories, fallbackImages }: BrowseCategoriesProps) {
  return (
    <section className="overflow-hidden pt-14 sm:pt-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 pb-14 sm:px-8 xl:px-0">
        <div className="border-b border-slate-200 pb-14">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <span className="mb-1.5 flex items-center gap-2.5 font-medium text-[#0B1B48]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3.94024 13.4474C2.6523 12.1595 2.00832 11.5155 1.7687 10.68C1.52908 9.84449 1.73387 8.9571 2.14343 7.18231L2.37962 6.15883C2.72419 4.66569 2.89648 3.91912 3.40771 3.40789C3.91894 2.89666 4.66551 2.72437 6.15865 2.3798L7.18213 2.14361C8.95692 1.73405 9.84431 1.52927 10.6798 1.76889C11.5153 2.00851 12.1593 2.65248 13.4472 3.94042L14.9719 5.46512C17.2128 7.70594 18.3332 8.82635 18.3332 10.2186C18.3332 11.6109 17.2128 12.7313 14.9719 14.9721C12.7311 17.2129 11.6107 18.3334 10.2184 18.3334C8.82617 18.3334 7.70576 17.2129 5.46494 14.9721L3.94024 13.4474Z"
                    stroke="#3C50E0"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="7.17245"
                    cy="7.39917"
                    r="1.66667"
                    transform="rotate(-45 7.17245 7.39917)"
                    stroke="#3C50E0"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M9.61837 15.4164L15.4342 9.6004"
                    stroke="#3C50E0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Categories
              </span>
              <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
                Browse by Category
              </h2>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-text-muted transition-colors hover:border-accent hover:text-accent"
                aria-label="Previous categories"
              >
                <span className="text-2xl leading-none">‹</span>
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-text-muted transition-colors hover:border-accent hover:text-accent"
                aria-label="Next categories"
              >
                <span className="text-2xl leading-none">›</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((cat, index) => (
              <Link
                key={cat.id}
                href={`/store?category=${cat.slug}`}
                className="group flex flex-col items-center"
              >
                <div className="mb-5 flex h-32 w-32 items-center justify-center rounded-full border border-slate-200/70 bg-white transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={cat.image_url || fallbackImages[index % fallbackImages.length]}
                    alt={cat.name}
                    width={82}
                    height={82}
                    className="h-[82px] w-[82px] object-contain"
                  />
                </div>
                <h3 className="bg-gradient-to-r from-accent to-accent bg-[length:0px_1px] bg-left-bottom bg-no-repeat text-center font-medium text-[#0B1B48] transition-[background-size,color] duration-500 group-hover:bg-[length:100%_1px] group-hover:text-accent">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
