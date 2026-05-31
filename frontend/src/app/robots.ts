import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/api/',
        '/auth',
        '/auth/',
        '/account',
        '/account/',
        '/cart',
        '/cart/',
        '/checkout',
        '/checkout/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
