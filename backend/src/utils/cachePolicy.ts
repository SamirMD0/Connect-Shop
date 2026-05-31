import crypto from 'crypto';

export const CACHE_TTL_SECONDS = {
  homepage: 180,
  categories: 600,
  featuredProducts: 180,
  productDetail: 180,
  productList: 45,
  carousel: 180,
} as const;

export const CACHE_KEYS = {
  homepageActive: 'homepage:active:v1',
  categoriesTree: 'categories:tree:v1',
  featuredProducts: (limit: number) => `products:featured:v1:limit=${limit}`,
  featuredProductsPattern: 'products:featured:v1:*',
  productSlug: (slug: string) => `product:slug:v1:${slug}`,
  productList: (params: ProductListCacheParams) => `products:list:v1:${hashStableJson(params)}`,
  productListPattern: 'products:list:v1:*',
  carouselActive: 'carousel:active:v1',
} as const;

export interface ProductListCacheParams {
  page: number;
  limit: number;
  category?: string;
  search?: string;
  sort?: string;
  ids?: string[];
  brand?: string;
  min_price?: number;
  max_price?: number;
  parent_id?: number;
  min_rating?: number;
  specs?: Record<string, string>;
}

function hashStableJson(value: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

function cleanString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function cleanNumber(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

function normalizeSpecs(specs: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!specs) return undefined;

  const normalized = Object.fromEntries(
    Object.entries(specs)
      .map(([key, value]) => [key.trim(), value.trim()] as const)
      .filter(([key, value]) => key && value)
      .sort(([left], [right]) => left.localeCompare(right))
  );

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeProductListCacheParams(input: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  ids?: string[];
  brand?: string;
  min_price?: number;
  max_price?: number;
  parent_id?: number;
  min_rating?: number;
  specs?: Record<string, string>;
}): ProductListCacheParams {
  const ids = input.ids?.map((id) => id.trim()).filter(Boolean).sort();

  return {
    page: Math.max(1, Math.floor(input.page ?? 1)),
    limit: Math.min(Math.max(1, Math.floor(input.limit ?? 12)), 100),
    category: cleanString(input.category),
    search: cleanString(input.search),
    sort: cleanString(input.sort),
    ids: ids && ids.length > 0 ? ids : undefined,
    brand: cleanString(input.brand),
    min_price: cleanNumber(input.min_price),
    max_price: cleanNumber(input.max_price),
    parent_id: cleanNumber(input.parent_id),
    min_rating: cleanNumber(input.min_rating),
    specs: normalizeSpecs(input.specs),
  };
}

// Cache only anonymous public reads. Never cache auth, cart, wishlist,
// checkout, orders, CSRF, sessions, or admin permission responses.
