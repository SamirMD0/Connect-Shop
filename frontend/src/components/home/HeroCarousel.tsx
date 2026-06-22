'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Truck, WalletCards } from 'lucide-react';
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
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || isPaused || prefersReducedMotion) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next, prefersReducedMotion, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="group relative min-h-[430px] w-full overflow-hidden rounded-lg bg-slate-950 sm:min-h-[520px] lg:min-h-[600px]"
      role="region"
      aria-label="Featured electronics"
      tabIndex={slides.length > 1 ? 0 : undefined}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          next();
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          prev();
        }
      }}
    >
      {slides.map((slide, index) => {
        const slideHref = getSafeLink(slide.link_url);
        const eyebrow = slide.eyebrow || getMetadataString(slide.metadata, 'eyebrow') || 'Electronics for every day';

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
            aria-hidden={index !== currentIndex}
          >
            <Image
              src={slide.image_url}
              alt={slide.title}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/15" />

            <div className="relative z-10 flex h-full min-h-[430px] items-center px-6 py-10 sm:min-h-[520px] sm:px-12 lg:min-h-[600px] lg:px-[88px]">
              <div className="max-w-[500px]">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-blue-200 sm:text-sm">
                  {eyebrow}
                </p>

                <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
                  <Link href={slideHref}>{slide.title || 'Featured electronics'}</Link>
                </h1>

                <p className="max-w-[440px] text-sm leading-6 text-white/85 sm:text-base">
                  {slide.subtitle || 'Shop trusted electronics with fast local delivery and payment when your order arrives.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white sm:text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-300" aria-hidden="true" />
                    Fast local delivery
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <WalletCards className="h-4 w-4 text-blue-300" aria-hidden="true" />
                    Cash on Delivery
                  </span>
                </div>

                <Link
                  href={slideHref}
                  className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-colors duration-200 hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {slide.button_text || 'Shop electronics'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
            className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-text-primary shadow-md transition-colors duration-200 hover:border-accent hover:text-accent sm:left-4"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-text-primary shadow-md transition-colors duration-200 hover:border-accent hover:text-accent sm:right-4"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-full bg-black/30 p-2 sm:bottom-7">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-[width,background-color] duration-200 ${
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
