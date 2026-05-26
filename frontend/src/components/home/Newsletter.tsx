'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HomepageSection, HomepageSectionItem } from '@/lib/types';

interface NewsletterProps {
  content?: HomepageSection | HomepageSectionItem | null;
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

export function Newsletter({ content }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const backgroundImage = content && 'background_image_url' in content
    ? content.background_image_url || content.image_url
    : content?.image_url;
  const placeholder = getMetadataString(content?.metadata, 'placeholder') || 'Enter your email';
  const successText = getMetadataString(content?.metadata, 'success_text') || 'Thanks for subscribing! Check your inbox soon.';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // In a real app, you would send this to your API
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <div className="relative z-[1] overflow-hidden rounded-xl">
      <Image
        src={backgroundImage || '/nextmerce/shapes/newsletter-bg.jpg'}
        alt=""
        fill
        sizes="1170px"
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute right-0 top-0 -z-10 h-full w-full max-w-[523px] bg-gradient-to-l from-[#3C50E0]/90 to-[#3C50E0]/20" />

      <div className="flex flex-col gap-8 px-5 py-11 sm:px-8 lg:flex-row lg:items-center lg:justify-between xl:px-12">
        <div className="max-w-[491px]">
          <h2 className="mb-3 max-w-[399px] text-3xl font-bold leading-tight text-white sm:text-4xl">
            {content?.title || "Don't Miss Out Latest Trends & Offers"}
          </h2>
          <p className="text-white/85">
            {content?.subtitle || content?.description || 'Register to receive news about the latest offers & discount codes'}
          </p>
        </div>

        <div className="w-full max-w-[477px]">
          {submitted ? (
            <div className="rounded-md border border-white/20 bg-white/15 px-5 py-4">
              <p className="font-medium text-white">{successText}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-slate-200 bg-white px-5 py-3 text-sm text-[#0B1B48] outline-none transition-all placeholder:text-slate-400 focus:border-[#3C50E0] focus:ring-2 focus:ring-[#3C50E0]/20"
                required
              />
              <button
                type="submit"
                className="inline-flex justify-center rounded-md bg-[#3C50E0] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0B1B48]"
              >
                {content?.button_text || 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
