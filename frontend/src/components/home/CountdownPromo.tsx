import Image from 'next/image';
import Link from 'next/link';

const countdownItems = [
  { value: '00', label: 'Days' },
  { value: '00', label: 'Hours' },
  { value: '00', label: 'Minutes' },
  { value: '00', label: 'Seconds' },
];

export function CountdownPromo() {
  return (
    <section className="overflow-hidden bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="relative z-[1] overflow-hidden rounded-lg bg-[#D0E9F3] p-6 sm:p-8 lg:p-10 xl:p-15">
          <div className="relative z-10 max-w-[422px]">
            <span className="mb-2.5 block text-base font-medium text-[#3C50E0]">
              Don't Miss!!
            </span>

            <h2 className="mb-3 text-3xl font-bold leading-tight text-[#0B1B48] sm:text-4xl lg:text-[44px]">
              Enhance Your Music Experience
            </h2>

            <p className="text-sm leading-6 text-slate-600 sm:text-base">
              iPhone 16 Pro Max delivers immersive audio, sharp performance, and a premium everyday experience.
            </p>

            <div className="mt-6 flex flex-wrap gap-5 sm:gap-6">
              {countdownItems.map((item) => (
                <div key={item.label}>
                  <span className="mb-2 flex h-[58px] min-w-[64px] items-center justify-center rounded-lg bg-white px-4 text-xl font-semibold text-[#0B1B48] shadow-lg shadow-slate-200/70 lg:text-3xl">
                    {item.value}
                  </span>
                  <span className="block text-center text-sm text-[#0B1B48]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/store"
              className="mt-8 inline-flex rounded-md bg-[#3C50E0] px-9 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0B1B48]"
            >
              Check it Out!
            </Link>
          </div>

          <Image
            src="/nextmerce/countdown/countdown-bg.png"
            alt="background shapes"
            width={737}
            height={482}
            className="absolute bottom-0 right-0 z-0 hidden h-full max-h-[482px] w-auto object-contain sm:block"
          />
          <Image
            src="/nextmerce/countdown/countdown-01.png"
            alt="featured product"
            width={411}
            height={376}
            className="absolute bottom-6 right-4 z-0 hidden h-[300px] w-auto object-contain transition-transform duration-500 hover:scale-105 lg:block xl:bottom-10 xl:right-28 xl:h-[376px]"
          />
        </div>
      </div>
    </section>
  );
}
