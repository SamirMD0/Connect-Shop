import type { ImageLoaderProps } from 'next/image';

export function canResizeStorefrontImage(src: string): boolean {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return false;
    // Signed URLs cannot be transformed without invalidating their signature.
    if (url.searchParams.has('ik-s') || url.searchParams.has('ik-t')
      || url.pathname.includes('/tr:') || /\.(svg|gif)$/i.test(url.pathname)) return false;
    if (url.hostname === 'ik.imagekit.io') return true;
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (!endpoint) return false;
    const configured = new URL(endpoint);
    const prefix = configured.pathname.replace(/\/$/, '');
    return url.origin === configured.origin
      && (url.pathname === prefix || url.pathname.startsWith(prefix + '/'));
  } catch { return false; }
}

export function storefrontImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!canResizeStorefrontImage(src)) return src;
  const url = new URL(src);
  const existing = url.searchParams.get('tr');
  // Preserve existing crop/effects, then size at the CDN before Next passthrough.
  const resize = 'w-' + width + ',q-' + (quality ?? 75);
  url.searchParams.set('tr', existing ? existing + ':' + resize : resize);
  return url.toString();
}
