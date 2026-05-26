import Image from 'next/image';
import Link from 'next/link';

export function NextmercePromoBanners() {
  return (
    <section className="overflow-hidden bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <Link
          href="/store"
          className="group relative z-[1] mb-7 block min-h-[330px] overflow-hidden rounded-lg bg-[#F5F5F7] px-5 py-10 sm:px-8 lg:min-h-[390px] lg:px-14 lg:py-16 xl:px-20"
        >
          <div className="relative z-10 max-w-[550px]">
            <span className="mb-3 block text-lg font-medium text-[#0B1B48] sm:text-xl">
              Apple iPhone 14 Plus
            </span>

            <h2 className="mb-5 text-3xl font-bold leading-tight text-[#0B1B48] sm:text-4xl lg:text-[44px]">
              UP TO 30% OFF
            </h2>

            <p className="max-w-[480px] text-sm leading-6 text-slate-600 sm:text-base">
              iPhone power, premium cameras, and all-day performance for the way you shop, stream, and work.
            </p>

            <span className="mt-7 inline-flex rounded-md bg-[#3C50E0] px-9 py-3 text-sm font-medium text-white transition-colors group-hover:bg-[#0B1B48]">
              Buy Now
            </span>
          </div>

          <Image
            src="/nextmerce/promo/promo-01.png"
            alt="Apple iPhone 14 Plus"
            width={274}
            height={350}
            className="absolute bottom-0 right-0 z-0 h-[255px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 sm:right-8 sm:h-[315px] lg:right-20 lg:h-[350px]"
          />
        </Link>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <Link
            href="/store"
            className="group relative z-[1] min-h-[255px] overflow-hidden rounded-lg bg-[#DBF4F3] px-5 py-10 sm:px-8 xl:px-10 xl:py-16"
          >
            <Image
              src="/nextmerce/promo/promo-02.png"
              alt="Foldable motorised treadmill"
              width={241}
              height={241}
              className="absolute left-0 top-1/2 z-0 h-[170px] w-auto -translate-y-1/2 object-contain transition-transform duration-500 group-hover:scale-105 sm:left-8 sm:h-[220px]"
            />

            <div className="relative z-10 ml-auto max-w-[270px] text-right">
              <span className="mb-1.5 block text-lg text-[#0B1B48]">
                Foldable Motorised Treadmill
              </span>

              <h3 className="mb-2.5 text-2xl font-bold leading-tight text-[#0B1B48] sm:text-[28px]">
                Workout At Home
              </h3>

              <p className="text-lg font-semibold text-[#10B981]">Flat 20% off</p>

              <span className="mt-9 inline-flex rounded-md bg-[#10B981] px-8 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-[#0F766E]">
                Grab Now
              </span>
            </div>
          </Link>

          <Link
            href="/store"
            className="group relative z-[1] min-h-[255px] overflow-hidden rounded-lg bg-[#FFECE1] px-5 py-10 sm:px-8 xl:px-10 xl:py-16"
          >
            <div className="relative z-10 max-w-[285px]">
              <span className="mb-1.5 block text-lg text-[#0B1B48]">
                Apple Watch Ultra
              </span>

              <h3 className="mb-2.5 text-2xl font-bold leading-tight text-[#0B1B48] sm:text-[28px]">
                Up to <span className="text-[#F97316]">40%</span> off
              </h3>

              <p className="text-sm leading-6 text-slate-600">
                Built for the everyday upgrade with rugged style and sharp performance.
              </p>

              <span className="mt-7 inline-flex rounded-md bg-[#F97316] px-8 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-[#C2410C]">
                Buy Now
              </span>
            </div>

            <Image
              src="/nextmerce/promo/promo-03.png"
              alt="Apple Watch Ultra"
              width={200}
              height={200}
              className="absolute bottom-4 right-2 z-0 h-[150px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 sm:right-8 sm:top-1/2 sm:h-[200px] sm:-translate-y-1/2"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
