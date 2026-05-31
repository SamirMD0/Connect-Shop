import { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { API_URL, SITE_URL } from '@/lib/constants';
import { Product, Category } from '@/lib/types';

function isLocalApiUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/store`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/return-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  if (process.env.VERCEL && isLocalApiUrl(API_URL)) {
    console.warn('Skipping dynamic sitemap entries because NEXT_PUBLIC_API_URL is not configured for Vercel.');
    return staticRoutes;
  }

  try {
    const productsRes = await api.get<{ success: boolean; products: Product[] }>('/api/products?limit=100');
    const products = productsRes.products || [];

    const productUrls = products.map((product) => ({
      url: `${SITE_URL}/store/${product.slug}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const categoriesRes = await api.get<{ success: boolean; categories: Category[] }>('/api/categories');
    const categories = categoriesRes.categories || [];

    const categoryUrls = categories.map((category) => ({
      url: `${SITE_URL}/store?category=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [
      ...staticRoutes,
      ...categoryUrls,
      ...productUrls,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticRoutes;
  }
}
