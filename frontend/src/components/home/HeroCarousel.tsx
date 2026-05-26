'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselSlide } from '@/lib/types';

interface HeroCarouselProps {
  slides: CarouselSlide[];
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

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="group relative min-h-[430px] w-full overflow-hidden rounded-[10px] bg-[#070914] sm:min-h-[520px] lg:min-h-[600px]">
      {slides.map((slide, index) => {
        const slideHref = getSafeLink(slide.link_url);
        const eyebrow = slide.eyebrow || getMetadataString(slide.metadata, 'eyebrow') || 'Premium Design';

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
          >
            <Image
              src={slide.image_url}
              alt={slide.title}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 960px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-[#11142b]/70 to-black/10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_58%,rgba(91,93,189,0.38),transparent_34%)]" />
            <div className="absolute bottom-[16%] right-[4%] hidden text-[160px] font-bold leading-none text-white/[0.04] sm:block lg:text-[210px]">
              14
            </div>

            <div className="relative z-10 flex h-full min-h-[430px] items-center px-6 py-10 sm:min-h-[520px] sm:px-12 lg:min-h-[600px] lg:px-[88px]">
              <div className="max-w-[430px]">
                <p className="mb-8 text-sm font-bold uppercase tracking-wide text-white sm:text-lg">
                  {eyebrow}
                </p>

                <h1 className="mb-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  <Link href={slideHref}>{slide.title || 'Apple Watch Ultra'}</Link>
                </h1>

                {slide.subtitle && (
                  <p className="max-w-[420px] text-sm leading-6 text-white/75 sm:text-base">
                    {slide.subtitle}
                  </p>
                )}

                <Link
                  href={slideHref}
                  className="mt-10 inline-flex rounded-full bg-accent px-10 py-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white hover:text-[#1C274C]"
                >
                  {slide.button_text || 'Shop Now'}
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1C274C] opacity-0 shadow-sm transition-all duration-200 hover:border-accent hover:text-accent group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1C274C] opacity-0 shadow-sm transition-all duration-200 hover:border-accent hover:text-accent group-hover:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-7 left-1/2 z-30 flex -translate-x-1/2 gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-accent'
                  : 'w-5 bg-white/70 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
