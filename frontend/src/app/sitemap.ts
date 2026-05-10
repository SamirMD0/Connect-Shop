import { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { Product, Category } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  try {
    const productsRes = await api.get<{ success: boolean; products: Product[] }>('/api/products?limit=1000');
    const products = productsRes.products || [];

    const productUrls = products.map((product) => ({
      url: `${baseUrl}/store/${product.slug}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const categoriesRes = await api.get<{ success: boolean; categories: Category[] }>('/api/categories');
    const categories = categoriesRes.categories || [];

    const categoryUrls = categories.map((category) => ({
      url: `${baseUrl}/store?category=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/store`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      ...categoryUrls,
      ...productUrls,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
      { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ];
  }
}
