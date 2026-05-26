import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { RatingStars } from '@/components/products/RatingStars';

interface BestSellersProps {
  products: Product[];
}

function formatPrice(value: string | null | undefined) {
  const parsed = Number.parseFloat(value || '0');

  if (!Number.isFinite(parsed)) {
    return '$0';
  }

  return `$${parsed.toLocaleString(undefined, {
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  })}`;
}

export function BestSellers({ products }: BestSellersProps) {
  const visibleProducts = products.slice(0, 6);

  return (
    <section className="overflow-hidden bg-white pb-14 sm:pb-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <span className="mb-1.5 flex items-center gap-2.5 font-medium text-[#0B1B48]">
              <Image
                src="/nextmerce/icons/icon-07.svg"
                alt=""
                width={17}
                height={17}
                aria-hidden="true"
              />
              This Month
            </span>
            <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
              Best Sellers
            </h2>
          </div>

          <Link
            href="/store?sort=rating"
            className="hidden rounded-md border border-slate-200 bg-[#F6F7FB] px-7 py-2.5 text-sm font-medium text-[#0B1B48] transition-colors hover:border-transparent hover:bg-[#0B1B48] hover:text-white sm:inline-flex"
          >
            View All
          </Link>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => {
              const price = formatPrice(product.price);
              const compareAtPrice = product.compare_at_price ? formatPrice(product.compare_at_price) : null;
              const rating = Number.parseFloat(product.rating || '0');

              return (
                <Link
                  key={product.id}
                  href={`/store/${product.slug}`}
                  className="group flex min-h-[170px] gap-4 rounded-lg border border-transparent bg-[#F6F7FB] p-4 transition-all hover:border-[#3C50E0]/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <div className="relative flex h-[138px] w-[138px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="138px"
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-3xl font-semibold text-slate-300">
                        {product.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-2">
                    <RatingStars
                      rating={Number.isFinite(rating) ? rating : 0}
                      reviewCount={product.review_count}
                    />

                    <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[#0B1B48] transition-colors group-hover:text-[#3C50E0]">
                      {product.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-lg font-medium">
                      <span className="text-[#0B1B48]">{price}</span>
                      {compareAtPrice && (
                        <span className="text-sm text-slate-400 line-through">{compareAtPrice}</span>
                      )}
                    </div>

                    {product.stock <= 0 && (
                      <span className="mt-3 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        Out of stock
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-[#F6F7FB] px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-[#0B1B48]">No best sellers yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Products from your existing backend will appear here when available.
            </p>
          </div>
        )}

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/store?sort=rating"
            className="inline-flex rounded-md border border-slate-200 bg-[#F6F7FB] px-8 py-3 text-sm font-medium text-[#0B1B48] transition-colors hover:border-transparent hover:bg-[#0B1B48] hover:text-white"
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}
