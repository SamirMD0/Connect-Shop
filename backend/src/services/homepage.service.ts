import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/db';
import { delCache } from '../config/redis';
import { CACHE_KEYS } from '../utils/cachePolicy';
import { BrandRepository } from '../repositories/brand.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { AppError } from '../utils/errors';
import { getBrands, getCategories, getFeaturedProducts, listProducts } from './products.service';
import type { Brand, Category, Product } from './products.service';

export const HOMEPAGE_SECTION_KEYS = [
  'hero_carousel',
  'hero_side_promo',
  'service_features',
  'browse_categories',
  'promo_banners',
  'countdown_promo',
  'testimonials',
  'newsletter',
] as const;

export const HOMEPAGE_SECTION_TYPES = [
  'carousel',
  'card_grid',
  'banner_group',
  'countdown',
  'testimonial_group',
  'newsletter',
  'static_product_section',
] as const;

export const HOMEPAGE_BRAND_PRODUCT_LIMITS = [4, 8, 12] as const;
export const HOMEPAGE_BRAND_PRODUCT_SORT_KEYS = ['newest', 'rating', 'price_asc', 'price_desc'] as const;
export const HOMEPAGE_BRAND_PRODUCT_LAYOUTS = ['grid', 'rail'] as const;
export const HOMEPAGE_CATEGORY_PRODUCT_LIMITS = HOMEPAGE_BRAND_PRODUCT_LIMITS;
export const HOMEPAGE_CATEGORY_PRODUCT_SORT_KEYS = HOMEPAGE_BRAND_PRODUCT_SORT_KEYS;
export const HOMEPAGE_CATEGORY_PRODUCT_LAYOUTS = HOMEPAGE_BRAND_PRODUCT_LAYOUTS;
export const HOMEPAGE_BLOCK_TYPES = [
  'hero_carousel',
  'new_arrivals',
  'brand_product_section',
  'category_product_section',
  'promotion_banner',
  'best_sellers',
  'featured_products',
  'testimonials',
  'newsletter',
  'category_showcase',
  'brand_showcase',
] as const;
export const HOMEPAGE_FIXED_BLOCK_TYPES = [
  'hero_carousel',
  'new_arrivals',
  'best_sellers',
  'featured_products',
  'testimonials',
  'newsletter',
  'category_showcase',
  'brand_showcase',
] as const;

const SINGLE_SECTION_KEYS = new Set(['countdown_promo', 'newsletter']);
const FIXED_HOMEPAGE_BLOCK_TYPE_SET = new Set<string>(HOMEPAGE_FIXED_BLOCK_TYPES);
const DEFAULT_HOMEPAGE_BLOCKS: Array<{ block_type: HomepageBlockType; display_order: number }> = [
  { block_type: 'hero_carousel', display_order: 0 },
  { block_type: 'brand_showcase', display_order: 10 },
  { block_type: 'category_showcase', display_order: 20 },
  { block_type: 'new_arrivals', display_order: 30 },
  { block_type: 'best_sellers', display_order: 40 },
  { block_type: 'testimonials', display_order: 50 },
  { block_type: 'newsletter', display_order: 60 },
];

export interface HomepageSectionItem {
  id: string;
  section_id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface HomepageSection {
  id: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  eyebrow: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  background_image_url: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface HomepageSectionWithItems extends HomepageSection {
  items: HomepageSectionItem[];
}

export interface HomepageSectionInput {
  section_key: string;
  section_type: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  eyebrow?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  image_url?: string | null;
  background_image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface HomepageSectionItemInput {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export type HomepageBrandProductLimit = typeof HOMEPAGE_BRAND_PRODUCT_LIMITS[number];
export type HomepageBrandProductSortKey = typeof HOMEPAGE_BRAND_PRODUCT_SORT_KEYS[number];
export type HomepageBrandProductLayout = typeof HOMEPAGE_BRAND_PRODUCT_LAYOUTS[number];
export type HomepageCategoryProductLimit = typeof HOMEPAGE_CATEGORY_PRODUCT_LIMITS[number];
export type HomepageCategoryProductSortKey = typeof HOMEPAGE_CATEGORY_PRODUCT_SORT_KEYS[number];
export type HomepageCategoryProductLayout = typeof HOMEPAGE_CATEGORY_PRODUCT_LAYOUTS[number];
export type HomepageBlockType = typeof HOMEPAGE_BLOCK_TYPES[number];

export interface HomepageBrandProductSection {
  id: string;
  title: string;
  subtitle: string | null;
  brand_id: number;
  product_limit: number;
  sort_key: HomepageBrandProductSortKey;
  layout: HomepageBrandProductLayout;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface HomepageBrandProductSectionInput {
  title: string;
  subtitle?: string | null;
  brand_id: number;
  product_limit?: HomepageBrandProductLimit;
  sort_key?: HomepageBrandProductSortKey;
  layout?: HomepageBrandProductLayout;
  is_active?: boolean;
}

export interface HomepageBrandProductSectionWithBrand extends HomepageBrandProductSection {
  brand: Brand | null;
}

export interface PublicHomepageBrandProductSection extends HomepageBrandProductSectionWithBrand {
  products: Product[];
}

export interface HomepageCategoryProductSection {
  id: string;
  title: string;
  subtitle: string | null;
  category_id: number;
  product_limit: number;
  sort_key: HomepageCategoryProductSortKey;
  layout: HomepageCategoryProductLayout;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface HomepageCategoryProductSectionInput {
  title: string;
  subtitle?: string | null;
  category_id: number;
  product_limit?: HomepageCategoryProductLimit;
  sort_key?: HomepageCategoryProductSortKey;
  layout?: HomepageCategoryProductLayout;
  is_active?: boolean;
}

export interface HomepageCategoryProductSectionWithCategory extends HomepageCategoryProductSection {
  category: Category | null;
}

export interface PublicHomepageCategoryProductSection extends HomepageCategoryProductSectionWithCategory {
  products: Product[];
}

export interface HomepageBlock {
  id: string;
  block_type: HomepageBlockType;
  brand_product_section_id: string | null;
  category_product_section_id: string | null;
  promotion_id: number | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface HomepageBlockInput {
  block_type: HomepageBlockType;
  brand_product_section_id?: string | null;
  category_product_section_id?: string | null;
  promotion_id?: number | null;
  is_active?: boolean;
}

export interface PublicHomepageBlock extends HomepageBlock {
  data: Record<string, unknown>;
}

interface LegacyPromotion {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type HomepageContent = {
  hero_carousel: HomepageSectionItem[];
  hero_side_promo: HomepageSectionItem[];
  service_features: HomepageSectionItem[];
  browse_categories: HomepageSectionItem[];
  promo_banners: HomepageSectionItem[];
  countdown_promo: HomepageSectionWithItems | null;
  testimonials: HomepageSectionItem[];
  newsletter: HomepageSectionWithItems | null;
  brand_product_sections: PublicHomepageBrandProductSection[];
  category_product_sections: PublicHomepageCategoryProductSection[];
  homepage_blocks?: PublicHomepageBlock[];
  [key: string]: HomepageSectionItem[] | HomepageSectionWithItems | PublicHomepageBrandProductSection[] | PublicHomepageCategoryProductSection[] | PublicHomepageBlock[] | null | undefined;
};

export function createEmptyHomepageContent(): HomepageContent {
  return {
    hero_carousel: [],
    hero_side_promo: [],
    service_features: [],
    browse_categories: [],
    promo_banners: [],
    countdown_promo: null,
    testimonials: [],
    newsletter: null,
    brand_product_sections: [],
    category_product_sections: [],
  };
}

async function invalidateHomepageCache(): Promise<void> {
  await delCache(CACHE_KEYS.homepageActive, CACHE_KEYS.homepageFull);
}

function isHomepageBlockType(value: unknown): value is HomepageBlockType {
  return typeof value === 'string' && HOMEPAGE_BLOCK_TYPES.includes(value as HomepageBlockType);
}

function isFixedHomepageBlockType(value: HomepageBlockType): boolean {
  return FIXED_HOMEPAGE_BLOCK_TYPE_SET.has(value);
}

function clampBrandProductLimit(limit: number): HomepageBrandProductLimit {
  if (limit === 4 || limit === 8 || limit === 12) {
    return limit;
  }

  return 8;
}

async function assertBrandIsUsable(brandId: number): Promise<Brand> {
  const brand = await BrandRepository.getById(brandId);
  if (!brand || !brand.is_active) {
    throw new AppError('Brand not found or inactive.', 400);
  }

  return brand;
}

async function assertCategoryExists(categoryId: number): Promise<Category> {
  const category = await CategoryRepository.getById(categoryId);
  if (!category) {
    throw new AppError('Category not found.', 400);
  }

  return category;
}

function getBrandProductOrderBy(sortKey: HomepageBrandProductSortKey): string {
  const sortMap: Record<HomepageBrandProductSortKey, string> = {
    newest: 'p.created_at DESC',
    rating: 'p.rating DESC, p.review_count DESC, p.created_at DESC',
    price_asc: 'p.price ASC, p.created_at DESC',
    price_desc: 'p.price DESC, p.created_at DESC',
  };

  return sortMap[sortKey];
}

function getCategoryProductOrderBy(sortKey: HomepageCategoryProductSortKey): string {
  const sortMap: Record<HomepageCategoryProductSortKey, string> = {
    newest: 'p.created_at DESC',
    rating: 'p.rating DESC, p.review_count DESC, p.created_at DESC',
    price_asc: 'p.price ASC, p.created_at DESC',
    price_desc: 'p.price DESC, p.created_at DESC',
  };

  return sortMap[sortKey];
}

async function normalizeBrandProductSectionOrder(client: PoolClient): Promise<void> {
  await client.query(
    `WITH ordered AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY display_order ASC, created_at ASC, id ASC) - 1 AS next_order
       FROM homepage_brand_product_sections
     )
     UPDATE homepage_brand_product_sections hbps
     SET display_order = ordered.next_order
     FROM ordered
     WHERE hbps.id = ordered.id
       AND hbps.display_order <> ordered.next_order`
  );
}

async function getNextBrandProductSectionOrder(client: PoolClient): Promise<number> {
  const rows = await client.query<{ next_order: number }>(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
     FROM homepage_brand_product_sections`
  );

  return rows.rows[0]?.next_order ?? 0;
}

async function normalizeCategoryProductSectionOrder(client: PoolClient): Promise<void> {
  await client.query(
    `WITH ordered AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY display_order ASC, created_at ASC, id ASC) - 1 AS next_order
       FROM homepage_category_product_sections
     )
     UPDATE homepage_category_product_sections hcps
     SET display_order = ordered.next_order
     FROM ordered
     WHERE hcps.id = ordered.id
       AND hcps.display_order <> ordered.next_order`
  );
}

async function getNextCategoryProductSectionOrder(client: PoolClient): Promise<number> {
  const rows = await client.query<{ next_order: number }>(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
     FROM homepage_category_product_sections`
  );

  return rows.rows[0]?.next_order ?? 0;
}

function mapSectionWithBrand(row: HomepageBrandProductSection & {
  brand: Brand | null;
}): HomepageBrandProductSectionWithBrand {
  return {
    ...row,
    brand: row.brand,
  };
}

function mapSectionWithCategory(row: HomepageCategoryProductSection & {
  category: Category | null;
}): HomepageCategoryProductSectionWithCategory {
  return {
    ...row,
    category: row.category,
  };
}

async function fetchBrandProducts(
  brandId: number,
  sortKey: HomepageBrandProductSortKey,
  limit: number
): Promise<Product[]> {
  const safeLimit = Math.min(clampBrandProductLimit(limit), 12);
  return query<Product>(
    `SELECT p.*, COALESCE(b.name, p.brand) AS brand, b.slug AS brand_slug, b.logo_url AS brand_logo_url,
            c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.brand_id = $1
     ORDER BY ${getBrandProductOrderBy(sortKey)}
     LIMIT $2`,
    [brandId, safeLimit]
  );
}

async function fetchCategoryProducts(
  categoryId: number,
  sortKey: HomepageCategoryProductSortKey,
  limit: number
): Promise<Product[]> {
  const safeLimit = Math.min(clampBrandProductLimit(limit), 12);
  return query<Product>(
    `SELECT p.*, COALESCE(b.name, p.brand) AS brand, b.slug AS brand_slug, b.logo_url AS brand_logo_url,
            c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.category_id = $1 OR c.parent_id = $1
     ORDER BY ${getCategoryProductOrderBy(sortKey)}
     LIMIT $2`,
    [categoryId, safeLimit]
  );
}

function nestSections(
  sections: HomepageSection[],
  items: HomepageSectionItem[]
): HomepageSectionWithItems[] {
  const itemsBySection = new Map<string, HomepageSectionItem[]>();

  for (const item of items) {
    const sectionItems = itemsBySection.get(item.section_id) || [];
    sectionItems.push(item);
    itemsBySection.set(item.section_id, sectionItems);
  }

  return sections.map((section) => ({
    ...section,
    items: itemsBySection.get(section.id) || [],
  }));
}

function groupHomepageContent(sections: HomepageSectionWithItems[]): HomepageContent {
  const homepage = createEmptyHomepageContent();

  for (const section of sections) {
    if (SINGLE_SECTION_KEYS.has(section.section_key)) {
      homepage[section.section_key] = section;
      continue;
    }

    if (!Array.isArray(homepage[section.section_key])) {
      homepage[section.section_key] = [];
    }

    (homepage[section.section_key] as HomepageSectionItem[]).push(...section.items);
  }

  return homepage;
}

async function getActiveLegacyPromotionItems(): Promise<HomepageSectionItem[]> {
  const promotions = await query<LegacyPromotion>(
    `SELECT id, title, description, image_url, link_url, display_order, is_active, created_at, updated_at
     FROM promotions
     WHERE is_active = true
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (ends_at IS NULL OR ends_at >= NOW())
     ORDER BY display_order ASC, created_at DESC`
  );

  return promotions.map((promotion) => ({
    id: `promotion-${promotion.id}`,
    section_id: 'legacy-promotions',
    title: promotion.title,
    subtitle: null,
    description: promotion.description,
    button_text: 'Shop Now',
    button_link: promotion.link_url,
    image_url: promotion.image_url,
    sort_order: promotion.display_order,
    is_active: promotion.is_active,
    metadata: { source: 'promotions' },
    created_at: promotion.created_at,
    updated_at: promotion.updated_at,
  }));
}

async function applyLegacyPromotionContent(homepage: HomepageContent): Promise<HomepageContent> {
  const legacyPromotions = await getActiveLegacyPromotionItems();
  if (legacyPromotions.length === 0) {
    return homepage;
  }

  const existingIds = new Set(homepage.promo_banners.map((banner) => banner.id));
  const missingLegacyPromotions = legacyPromotions.filter((promotion) => !existingIds.has(promotion.id));

  return {
    ...homepage,
    promo_banners: [...homepage.promo_banners, ...missingLegacyPromotions].sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }),
  };
}

async function normalizeHomepageBlockOrder(client: PoolClient): Promise<void> {
  await client.query(
    `WITH ordered AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY display_order ASC, created_at ASC, id ASC) - 1 AS next_order
       FROM homepage_blocks
     )
     UPDATE homepage_blocks hb
     SET display_order = ordered.next_order
     FROM ordered
     WHERE hb.id = ordered.id
       AND hb.display_order <> ordered.next_order`
  );
}

async function getNextHomepageBlockOrder(client: PoolClient): Promise<number> {
  const rows = await client.query<{ next_order: number }>(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
     FROM homepage_blocks`
  );

  return rows.rows[0]?.next_order ?? 0;
}

async function assertBrandProductSectionExists(id: string): Promise<void> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM homepage_brand_product_sections WHERE id = $1`,
    [id]
  );
  if (!rows[0]) {
    throw new AppError('Homepage brand product section not found.', 400);
  }
}

async function assertCategoryProductSectionExists(id: string): Promise<void> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM homepage_category_product_sections WHERE id = $1`,
    [id]
  );
  if (!rows[0]) {
    throw new AppError('Homepage category product section not found.', 400);
  }
}

async function assertPromotionExists(id: number): Promise<void> {
  const rows = await query<{ id: number }>(
    `SELECT id FROM promotions WHERE id = $1`,
    [id]
  );
  if (!rows[0]) {
    throw new AppError('Promotion not found.', 400);
  }
}

function rejectForbiddenHomepageBlockFields(data: Record<string, unknown>): void {
  const forbiddenFields = [
    'display_order',
    'sort_order',
    'metadata',
    'image_url',
    'background_image_url',
    'button_link',
    'link_url',
    'url',
    'raw_url',
  ];

  for (const field of forbiddenFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      throw new AppError(`${field} is not supported for homepage blocks.`, 400);
    }
  }
}

async function validateHomepageBlockShape(data: HomepageBlockInput): Promise<HomepageBlockInput> {
  if (!isHomepageBlockType(data.block_type)) {
    throw new AppError('block_type is invalid.', 400);
  }

  const normalized: HomepageBlockInput = {
    block_type: data.block_type,
    brand_product_section_id: data.brand_product_section_id ?? null,
    category_product_section_id: data.category_product_section_id ?? null,
    promotion_id: data.promotion_id ?? null,
    is_active: data.is_active,
  };

  if (normalized.block_type === 'brand_product_section') {
    if (!normalized.brand_product_section_id) {
      throw new AppError('brand_product_section_id is required for brand product section blocks.', 400);
    }
    if (normalized.category_product_section_id || normalized.promotion_id) {
      throw new AppError('Brand product section blocks cannot include category or promotion references.', 400);
    }
    await assertBrandProductSectionExists(normalized.brand_product_section_id);
    return normalized;
  }

  if (normalized.block_type === 'category_product_section') {
    if (!normalized.category_product_section_id) {
      throw new AppError('category_product_section_id is required for category product section blocks.', 400);
    }
    if (normalized.brand_product_section_id || normalized.promotion_id) {
      throw new AppError('Category product section blocks cannot include brand or promotion references.', 400);
    }
    await assertCategoryProductSectionExists(normalized.category_product_section_id);
    return normalized;
  }

  if (normalized.block_type === 'promotion_banner') {
    if (!normalized.promotion_id) {
      throw new AppError('promotion_id is required for promotion banner blocks.', 400);
    }
    if (normalized.brand_product_section_id || normalized.category_product_section_id) {
      throw new AppError('Promotion banner blocks cannot include brand or category section references.', 400);
    }
    await assertPromotionExists(normalized.promotion_id);
    return normalized;
  }

  if (!isFixedHomepageBlockType(normalized.block_type)) {
    throw new AppError('block_type is invalid.', 400);
  }

  if (normalized.brand_product_section_id || normalized.category_product_section_id || normalized.promotion_id) {
    throw new AppError('Fixed homepage blocks cannot include reference IDs.', 400);
  }

  return normalized;
}

async function getHomepageBlockById(id: string): Promise<HomepageBlock | null> {
  const rows = await query<HomepageBlock>(
    `SELECT * FROM homepage_blocks WHERE id = $1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function getAdminHomepageBlocks(): Promise<HomepageBlock[]> {
  return query<HomepageBlock>(
    `SELECT * FROM homepage_blocks
     ORDER BY display_order ASC, created_at ASC, id ASC`
  );
}

export async function createHomepageBlock(rawData: HomepageBlockInput & Record<string, unknown>): Promise<HomepageBlock> {
  rejectForbiddenHomepageBlockFields(rawData);
  const data = await validateHomepageBlockShape(rawData);

  const block = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_blocks IN EXCLUSIVE MODE');
    await normalizeHomepageBlockOrder(client);
    if (isFixedHomepageBlockType(data.block_type)) {
      const existingRows = await client.query<{ id: string }>(
        `SELECT id FROM homepage_blocks WHERE block_type = $1 LIMIT 1`,
        [data.block_type]
      );
      if (existingRows.rows[0]) {
        throw new AppError('A fixed homepage block of this type already exists.', 409);
      }
    }
    const displayOrder = await getNextHomepageBlockOrder(client);
    const rows = await client.query<HomepageBlock>(
      `INSERT INTO homepage_blocks
         (block_type, brand_product_section_id, category_product_section_id, promotion_id, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.block_type,
        data.brand_product_section_id ?? null,
        data.category_product_section_id ?? null,
        data.promotion_id ?? null,
        displayOrder,
        data.is_active ?? true,
      ]
    );

    return rows.rows[0];
  });

  await invalidateHomepageCache();
  return block;
}

export async function updateHomepageBlock(
  id: string,
  rawData: Partial<HomepageBlockInput> & Record<string, unknown>
): Promise<HomepageBlock | null> {
  rejectForbiddenHomepageBlockFields(rawData);

  const existing = await getHomepageBlockById(id);
  if (!existing) {
    return null;
  }

  const nextData = await validateHomepageBlockShape({
    block_type: rawData.block_type ?? existing.block_type,
    brand_product_section_id:
      rawData.brand_product_section_id !== undefined
        ? rawData.brand_product_section_id
        : existing.brand_product_section_id,
    category_product_section_id:
      rawData.category_product_section_id !== undefined
        ? rawData.category_product_section_id
        : existing.category_product_section_id,
    promotion_id:
      rawData.promotion_id !== undefined
        ? rawData.promotion_id
        : existing.promotion_id,
    is_active:
      rawData.is_active !== undefined
        ? rawData.is_active
        : existing.is_active,
  });

  const rows = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_blocks IN EXCLUSIVE MODE');
    if (isFixedHomepageBlockType(nextData.block_type)) {
      const existingRows = await client.query<{ id: string }>(
        `SELECT id FROM homepage_blocks WHERE block_type = $1 AND id <> $2 LIMIT 1`,
        [nextData.block_type, id]
      );
      if (existingRows.rows[0]) {
        throw new AppError('A fixed homepage block of this type already exists.', 409);
      }
    }

    return client.query<HomepageBlock>(
      `UPDATE homepage_blocks
       SET block_type = $1,
           brand_product_section_id = $2,
           category_product_section_id = $3,
           promotion_id = $4,
           is_active = $5
       WHERE id = $6
       RETURNING *`,
      [
        nextData.block_type,
        nextData.brand_product_section_id ?? null,
        nextData.category_product_section_id ?? null,
        nextData.promotion_id ?? null,
        nextData.is_active ?? existing.is_active,
        id,
      ]
    );
  });

  await invalidateHomepageCache();
  return rows.rows[0] ?? null;
}

export async function deleteHomepageBlock(id: string): Promise<boolean> {
  const deleted = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_blocks IN EXCLUSIVE MODE');
    const rows = await client.query<{ id: string }>(
      `DELETE FROM homepage_blocks WHERE id = $1 RETURNING id`,
      [id]
    );
    await normalizeHomepageBlockOrder(client);
    return (rows.rowCount ?? 0) > 0;
  });

  if (deleted) {
    await invalidateHomepageCache();
  }

  return deleted;
}

export async function moveHomepageBlock(
  id: string,
  direction: 'up' | 'down'
): Promise<HomepageBlock | null> {
  const movedBlockId = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_blocks IN EXCLUSIVE MODE');
    await normalizeHomepageBlockOrder(client);

    const currentRows = await client.query<HomepageBlock>(
      `SELECT * FROM homepage_blocks WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const current = currentRows.rows[0];
    if (!current) {
      return null;
    }

    const orderDirection = direction === 'up' ? 'DESC' : 'ASC';
    const comparison = direction === 'up' ? '<' : '>';
    const targetRows = await client.query<HomepageBlock>(
      `SELECT * FROM homepage_blocks
       WHERE display_order ${comparison} $1
       ORDER BY display_order ${orderDirection}, created_at ${orderDirection}, id ${orderDirection}
       LIMIT 1
       FOR UPDATE`,
      [current.display_order]
    );
    const target = targetRows.rows[0];
    if (!target) {
      return current.id;
    }

    await client.query(
      `UPDATE homepage_blocks SET display_order = $1 WHERE id = $2`,
      [target.display_order, current.id]
    );
    await client.query(
      `UPDATE homepage_blocks SET display_order = $1 WHERE id = $2`,
      [current.display_order, target.id]
    );

    return current.id;
  });

  if (!movedBlockId) {
    return null;
  }

  await invalidateHomepageCache();
  return getHomepageBlockById(movedBlockId);
}

export async function resetHomepageBlocksToDefaults(): Promise<HomepageBlock[]> {
  const blocks = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_blocks IN EXCLUSIVE MODE');
    await client.query('DELETE FROM homepage_blocks');

    const inserted: HomepageBlock[] = [];
    for (const block of DEFAULT_HOMEPAGE_BLOCKS) {
      const rows = await client.query<HomepageBlock>(
        `INSERT INTO homepage_blocks (block_type, display_order, is_active)
         VALUES ($1, $2, true)
         RETURNING *`,
        [block.block_type, block.display_order]
      );
      inserted.push(rows.rows[0]);
    }

    return inserted;
  });

  await invalidateHomepageCache();
  return blocks;
}

async function resolvePromotionBlockData(promotionId: number): Promise<Record<string, unknown>> {
  const rows = await query<LegacyPromotion>(
    `SELECT id, title, description, image_url, link_url, display_order, is_active, created_at, updated_at
     FROM promotions
     WHERE id = $1
       AND is_active = true
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (ends_at IS NULL OR ends_at >= NOW())`,
    [promotionId]
  );

  return { promotion: rows[0] ?? null };
}

async function resolveHomepageBlockData(
  block: HomepageBlock,
  homepage: HomepageContent
): Promise<Record<string, unknown> | null> {
  switch (block.block_type) {
    case 'hero_carousel':
      return {
        items: homepage.hero_carousel,
        side_promos: homepage.hero_side_promo,
        service_features: homepage.service_features,
      };
    case 'new_arrivals': {
      const result = await listProducts({ sort: 'newest', limit: 8 });
      return { products: result.products };
    }
    case 'brand_product_section': {
      const section = homepage.brand_product_sections.find(
        (item) => item.id === block.brand_product_section_id
      );
      return section ? { section } : null;
    }
    case 'category_product_section': {
      const section = homepage.category_product_sections.find(
        (item) => item.id === block.category_product_section_id
      );
      return section ? { section } : null;
    }
    case 'promotion_banner':
      return block.promotion_id ? resolvePromotionBlockData(block.promotion_id) : null;
    case 'best_sellers': {
      const result = await listProducts({ sort: 'rating', limit: 8 });
      return { products: result.products };
    }
    case 'featured_products':
      return { products: await getFeaturedProducts(8) };
    case 'testimonials':
      return { items: homepage.testimonials };
    case 'newsletter':
      return { section: homepage.newsletter };
    case 'category_showcase':
      return { categories: await getCategories() };
    case 'brand_showcase':
      return { brands: await getBrands() };
    default:
      return {};
  }
}

export async function getActiveHomepageBlocks(homepage: HomepageContent): Promise<PublicHomepageBlock[]> {
  const blocks = await query<HomepageBlock>(
    `SELECT * FROM homepage_blocks
     WHERE is_active = true
     ORDER BY display_order ASC, created_at ASC, id ASC`
  );

  const resolved = await Promise.all(
    blocks.map(async (block) => {
      const data = await resolveHomepageBlockData(block, homepage);
      if (!data) {
        return null;
      }

      return { ...block, data };
    })
  );

  return resolved.filter((block): block is PublicHomepageBlock => block !== null);
}

export async function getActiveHomepageContent(): Promise<HomepageContent> {
  const sections = await query<HomepageSection>(
    `SELECT * FROM homepage_sections
     WHERE is_active = true
     ORDER BY sort_order ASC, created_at ASC`
  );

  if (sections.length === 0) {
    const homepage = await applyLegacyPromotionContent(createEmptyHomepageContent());
    const [brandSections, categorySections] = await Promise.all([
      getActiveHomepageBrandProductSections(),
      getActiveHomepageCategoryProductSections(),
    ]);
    homepage.brand_product_sections = brandSections;
    homepage.category_product_sections = categorySections;
    const homepageBlocks = await getActiveHomepageBlocks(homepage);
    if (homepageBlocks.length > 0) {
      homepage.homepage_blocks = homepageBlocks;
    }
    return homepage;
  }

  const items = await query<HomepageSectionItem>(
    `SELECT hsi.*
     FROM homepage_section_items hsi
     JOIN homepage_sections hs ON hs.id = hsi.section_id
     WHERE hs.is_active = true
       AND hsi.is_active = true
     ORDER BY hs.sort_order ASC, hs.created_at ASC, hsi.sort_order ASC, hsi.created_at ASC`
  );

  const homepage = await applyLegacyPromotionContent(groupHomepageContent(nestSections(sections, items)));
  const [brandSections, categorySections] = await Promise.all([
    getActiveHomepageBrandProductSections(),
    getActiveHomepageCategoryProductSections(),
  ]);
  homepage.brand_product_sections = brandSections;
  homepage.category_product_sections = categorySections;
  const homepageBlocks = await getActiveHomepageBlocks(homepage);
  if (homepageBlocks.length > 0) {
    homepage.homepage_blocks = homepageBlocks;
  }
  return homepage;
}

export async function getAdminHomepageBrandProductSections(): Promise<HomepageBrandProductSectionWithBrand[]> {
  const rows = await query<HomepageBrandProductSection & { brand: Brand | null }>(
    `SELECT hbps.*,
            CASE WHEN b.id IS NULL THEN NULL ELSE json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'logo_url', b.logo_url,
              'description', b.description,
              'is_active', b.is_active,
              'created_at', b.created_at,
              'updated_at', b.updated_at
            ) END AS brand
     FROM homepage_brand_product_sections hbps
     LEFT JOIN brands b ON b.id = hbps.brand_id
     ORDER BY hbps.display_order ASC, hbps.created_at ASC`
  );

  return rows.map(mapSectionWithBrand);
}

export async function getActiveHomepageBrandProductSections(): Promise<PublicHomepageBrandProductSection[]> {
  const sections = await query<HomepageBrandProductSection & { brand: Brand | null }>(
    `SELECT hbps.*,
            CASE WHEN b.id IS NULL THEN NULL ELSE json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'logo_url', b.logo_url,
              'description', b.description,
              'is_active', b.is_active,
              'created_at', b.created_at,
              'updated_at', b.updated_at
            ) END AS brand
     FROM homepage_brand_product_sections hbps
     LEFT JOIN brands b ON b.id = hbps.brand_id AND b.is_active = true
     WHERE hbps.is_active = true
     ORDER BY hbps.display_order ASC, hbps.created_at ASC`
  );

  const resolvedSections = await Promise.all(
    sections.map(async (section) => {
      if (!section.brand) {
        return null;
      }

      const products = await fetchBrandProducts(section.brand_id, section.sort_key, section.product_limit);
      return {
        ...mapSectionWithBrand(section),
        products,
      };
    })
  );

  return resolvedSections.filter((section): section is PublicHomepageBrandProductSection => section !== null);
}

export async function getAdminHomepageCategoryProductSections(): Promise<HomepageCategoryProductSectionWithCategory[]> {
  const rows = await query<HomepageCategoryProductSection & { category: Category | null }>(
    `SELECT hcps.*,
            CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'image_url', c.image_url,
              'parent_id', c.parent_id,
              'depth', c.depth
            ) END AS category
     FROM homepage_category_product_sections hcps
     LEFT JOIN categories c ON c.id = hcps.category_id
     ORDER BY hcps.display_order ASC, hcps.created_at ASC`
  );

  return rows.map(mapSectionWithCategory);
}

export async function getActiveHomepageCategoryProductSections(): Promise<PublicHomepageCategoryProductSection[]> {
  const sections = await query<HomepageCategoryProductSection & { category: Category | null }>(
    `SELECT hcps.*,
            CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'image_url', c.image_url,
              'parent_id', c.parent_id,
              'depth', c.depth
            ) END AS category
     FROM homepage_category_product_sections hcps
     LEFT JOIN categories c ON c.id = hcps.category_id
     WHERE hcps.is_active = true
     ORDER BY hcps.display_order ASC, hcps.created_at ASC`
  );

  const resolvedSections = await Promise.all(
    sections.map(async (section) => {
      if (!section.category) {
        return null;
      }

      const products = await fetchCategoryProducts(section.category_id, section.sort_key, section.product_limit);
      return {
        ...mapSectionWithCategory(section),
        products,
      };
    })
  );

  return resolvedSections.filter((section): section is PublicHomepageCategoryProductSection => section !== null);
}

export async function getAdminHomepageSections(): Promise<HomepageSectionWithItems[]> {
  const [sections, items] = await Promise.all([
    query<HomepageSection>(
      `SELECT * FROM homepage_sections
       ORDER BY sort_order ASC, created_at ASC`
    ),
    query<HomepageSectionItem>(
      `SELECT * FROM homepage_section_items
       ORDER BY sort_order ASC, created_at ASC`
    ),
  ]);

  return nestSections(sections, items);
}

export async function createHomepageSection(data: HomepageSectionInput): Promise<HomepageSection> {
  const rows = await query<HomepageSection>(
    `INSERT INTO homepage_sections
       (section_key, section_type, title, subtitle, description, eyebrow, button_text, button_link,
        image_url, background_image_url, sort_order, is_active, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      data.section_key,
      data.section_type,
      data.title ?? null,
      data.subtitle ?? null,
      data.description ?? null,
      data.eyebrow ?? null,
      data.button_text ?? null,
      data.button_link ?? null,
      data.image_url ?? null,
      data.background_image_url ?? null,
      data.sort_order ?? 0,
      data.is_active ?? true,
      data.metadata ?? {},
    ]
  );

  await invalidateHomepageCache();
  return rows[0];
}

export async function createHomepageBrandProductSection(
  data: HomepageBrandProductSectionInput
): Promise<HomepageBrandProductSectionWithBrand> {
  const brand = await assertBrandIsUsable(data.brand_id);

  const section = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_brand_product_sections IN EXCLUSIVE MODE');
    await normalizeBrandProductSectionOrder(client);
    const displayOrder = await getNextBrandProductSectionOrder(client);
    const rows = await client.query<HomepageBrandProductSection>(
      `INSERT INTO homepage_brand_product_sections
         (title, subtitle, brand_id, product_limit, sort_key, layout, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.title,
        data.subtitle ?? null,
        brand.id,
        data.product_limit ?? 8,
        data.sort_key ?? 'newest',
        data.layout ?? 'grid',
        displayOrder,
        data.is_active ?? true,
      ]
    );

    return rows.rows[0];
  });

  await invalidateHomepageCache();
  return { ...section, brand };
}

export async function updateHomepageBrandProductSection(
  id: string,
  data: Partial<HomepageBrandProductSectionInput>
): Promise<HomepageBrandProductSectionWithBrand | null> {
  let brand: Brand | undefined;
  if (data.brand_id !== undefined) {
    brand = await assertBrandIsUsable(data.brand_id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.subtitle !== undefined) { fields.push(`subtitle = $${paramIndex++}`); values.push(data.subtitle ?? null); }
  if (data.brand_id !== undefined) { fields.push(`brand_id = $${paramIndex++}`); values.push(brand?.id); }
  if (data.product_limit !== undefined) { fields.push(`product_limit = $${paramIndex++}`); values.push(data.product_limit); }
  if (data.sort_key !== undefined) { fields.push(`sort_key = $${paramIndex++}`); values.push(data.sort_key); }
  if (data.layout !== undefined) { fields.push(`layout = $${paramIndex++}`); values.push(data.layout); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.is_active); }

  if (fields.length === 0) {
    const existing = await getHomepageBrandProductSectionById(id);
    return existing;
  }

  values.push(id);
  const rows = await query<HomepageBrandProductSection>(
    `UPDATE homepage_brand_product_sections
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (!rows[0]) {
    return null;
  }

  await invalidateHomepageCache();
  return getHomepageBrandProductSectionById(rows[0].id);
}

export async function deleteHomepageBrandProductSection(id: string): Promise<boolean> {
  const deleted = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_brand_product_sections IN EXCLUSIVE MODE');
    const rows = await client.query<{ id: string }>(
      `DELETE FROM homepage_brand_product_sections WHERE id = $1 RETURNING id`,
      [id]
    );
    await normalizeBrandProductSectionOrder(client);
    return (rows.rowCount ?? 0) > 0;
  });

  if (deleted) {
    await invalidateHomepageCache();
  }

  return deleted;
}

export async function moveHomepageBrandProductSection(
  id: string,
  direction: 'up' | 'down'
): Promise<HomepageBrandProductSectionWithBrand | null> {
  const movedSectionId = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_brand_product_sections IN EXCLUSIVE MODE');
    await normalizeBrandProductSectionOrder(client);

    const currentRows = await client.query<HomepageBrandProductSection>(
      `SELECT * FROM homepage_brand_product_sections WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const current = currentRows.rows[0];
    if (!current) {
      return null;
    }

    const targetOrder = direction === 'up' ? current.display_order - 1 : current.display_order + 1;
    if (targetOrder < 0) {
      return current.id;
    }

    const targetRows = await client.query<HomepageBrandProductSection>(
      `SELECT * FROM homepage_brand_product_sections WHERE display_order = $1 FOR UPDATE`,
      [targetOrder]
    );
    const target = targetRows.rows[0];
    if (!target) {
      return current.id;
    }

    await client.query(
      `UPDATE homepage_brand_product_sections SET display_order = $1 WHERE id = $2`,
      [target.display_order, current.id]
    );
    await client.query(
      `UPDATE homepage_brand_product_sections SET display_order = $1 WHERE id = $2`,
      [current.display_order, target.id]
    );

    return current.id;
  });

  if (!movedSectionId) {
    return null;
  }

  await invalidateHomepageCache();
  return getHomepageBrandProductSectionById(movedSectionId);
}

export async function createHomepageCategoryProductSection(
  data: HomepageCategoryProductSectionInput
): Promise<HomepageCategoryProductSectionWithCategory> {
  const category = await assertCategoryExists(data.category_id);

  const section = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_category_product_sections IN EXCLUSIVE MODE');
    await normalizeCategoryProductSectionOrder(client);
    const displayOrder = await getNextCategoryProductSectionOrder(client);
    const rows = await client.query<HomepageCategoryProductSection>(
      `INSERT INTO homepage_category_product_sections
         (title, subtitle, category_id, product_limit, sort_key, layout, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.title,
        data.subtitle ?? null,
        category.id,
        data.product_limit ?? 8,
        data.sort_key ?? 'newest',
        data.layout ?? 'grid',
        displayOrder,
        data.is_active ?? true,
      ]
    );

    return rows.rows[0];
  });

  await invalidateHomepageCache();
  return { ...section, category };
}

export async function updateHomepageCategoryProductSection(
  id: string,
  data: Partial<HomepageCategoryProductSectionInput>
): Promise<HomepageCategoryProductSectionWithCategory | null> {
  let category: Category | undefined;
  if (data.category_id !== undefined) {
    category = await assertCategoryExists(data.category_id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.subtitle !== undefined) { fields.push(`subtitle = $${paramIndex++}`); values.push(data.subtitle ?? null); }
  if (data.category_id !== undefined) { fields.push(`category_id = $${paramIndex++}`); values.push(category?.id); }
  if (data.product_limit !== undefined) { fields.push(`product_limit = $${paramIndex++}`); values.push(data.product_limit); }
  if (data.sort_key !== undefined) { fields.push(`sort_key = $${paramIndex++}`); values.push(data.sort_key); }
  if (data.layout !== undefined) { fields.push(`layout = $${paramIndex++}`); values.push(data.layout); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.is_active); }

  if (fields.length === 0) {
    return getHomepageCategoryProductSectionById(id);
  }

  values.push(id);
  const rows = await query<HomepageCategoryProductSection>(
    `UPDATE homepage_category_product_sections
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (!rows[0]) {
    return null;
  }

  await invalidateHomepageCache();
  return getHomepageCategoryProductSectionById(rows[0].id);
}

export async function deleteHomepageCategoryProductSection(id: string): Promise<boolean> {
  const deleted = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_category_product_sections IN EXCLUSIVE MODE');
    const rows = await client.query<{ id: string }>(
      `DELETE FROM homepage_category_product_sections WHERE id = $1 RETURNING id`,
      [id]
    );
    await normalizeCategoryProductSectionOrder(client);
    return (rows.rowCount ?? 0) > 0;
  });

  if (deleted) {
    await invalidateHomepageCache();
  }

  return deleted;
}

export async function moveHomepageCategoryProductSection(
  id: string,
  direction: 'up' | 'down'
): Promise<HomepageCategoryProductSectionWithCategory | null> {
  const movedSectionId = await withTransaction(async (client) => {
    await client.query('LOCK TABLE homepage_category_product_sections IN EXCLUSIVE MODE');
    await normalizeCategoryProductSectionOrder(client);

    const currentRows = await client.query<HomepageCategoryProductSection>(
      `SELECT * FROM homepage_category_product_sections WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const current = currentRows.rows[0];
    if (!current) {
      return null;
    }

    const targetOrder = direction === 'up' ? current.display_order - 1 : current.display_order + 1;
    if (targetOrder < 0) {
      return current.id;
    }

    const targetRows = await client.query<HomepageCategoryProductSection>(
      `SELECT * FROM homepage_category_product_sections WHERE display_order = $1 FOR UPDATE`,
      [targetOrder]
    );
    const target = targetRows.rows[0];
    if (!target) {
      return current.id;
    }

    await client.query(
      `UPDATE homepage_category_product_sections SET display_order = $1 WHERE id = $2`,
      [target.display_order, current.id]
    );
    await client.query(
      `UPDATE homepage_category_product_sections SET display_order = $1 WHERE id = $2`,
      [current.display_order, target.id]
    );

    return current.id;
  });

  if (!movedSectionId) {
    return null;
  }

  await invalidateHomepageCache();
  return getHomepageCategoryProductSectionById(movedSectionId);
}

async function getHomepageBrandProductSectionById(
  id: string
): Promise<HomepageBrandProductSectionWithBrand | null> {
  const rows = await query<HomepageBrandProductSection & { brand: Brand | null }>(
    `SELECT hbps.*,
            CASE WHEN b.id IS NULL THEN NULL ELSE json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'logo_url', b.logo_url,
              'description', b.description,
              'is_active', b.is_active,
              'created_at', b.created_at,
              'updated_at', b.updated_at
            ) END AS brand
     FROM homepage_brand_product_sections hbps
     LEFT JOIN brands b ON b.id = hbps.brand_id
     WHERE hbps.id = $1`,
    [id]
  );

  return rows[0] ? mapSectionWithBrand(rows[0]) : null;
}

async function getHomepageCategoryProductSectionById(
  id: string
): Promise<HomepageCategoryProductSectionWithCategory | null> {
  const rows = await query<HomepageCategoryProductSection & { category: Category | null }>(
    `SELECT hcps.*,
            CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'image_url', c.image_url,
              'parent_id', c.parent_id,
              'depth', c.depth
            ) END AS category
     FROM homepage_category_product_sections hcps
     LEFT JOIN categories c ON c.id = hcps.category_id
     WHERE hcps.id = $1`,
    [id]
  );

  return rows[0] ? mapSectionWithCategory(rows[0]) : null;
}

export async function updateHomepageSection(
  id: string,
  data: Partial<HomepageSectionInput>
): Promise<HomepageSection | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.section_key !== undefined) { fields.push(`section_key = $${paramIndex++}`); values.push(data.section_key); }
  if (data.section_type !== undefined) { fields.push(`section_type = $${paramIndex++}`); values.push(data.section_type); }
  if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.subtitle !== undefined) { fields.push(`subtitle = $${paramIndex++}`); values.push(data.subtitle); }
  if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }
  if (data.eyebrow !== undefined) { fields.push(`eyebrow = $${paramIndex++}`); values.push(data.eyebrow); }
  if (data.button_text !== undefined) { fields.push(`button_text = $${paramIndex++}`); values.push(data.button_text); }
  if (data.button_link !== undefined) { fields.push(`button_link = $${paramIndex++}`); values.push(data.button_link); }
  if (data.image_url !== undefined) { fields.push(`image_url = $${paramIndex++}`); values.push(data.image_url); }
  if (data.background_image_url !== undefined) { fields.push(`background_image_url = $${paramIndex++}`); values.push(data.background_image_url); }
  if (data.sort_order !== undefined) { fields.push(`sort_order = $${paramIndex++}`); values.push(data.sort_order); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.is_active); }
  if (data.metadata !== undefined) { fields.push(`metadata = $${paramIndex++}`); values.push(data.metadata ?? {}); }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);
  const rows = await query<HomepageSection>(
    `UPDATE homepage_sections
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (rows[0]) {
    await invalidateHomepageCache();
  }

  return rows[0] || null;
}

export async function deleteHomepageSection(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM homepage_sections WHERE id = $1 RETURNING id`,
    [id]
  );

  if (rows.length > 0) {
    await invalidateHomepageCache();
  }

  return rows.length > 0;
}

export async function createHomepageSectionItem(
  sectionId: string,
  data: HomepageSectionItemInput
): Promise<HomepageSectionItem | null> {
  const rows = await query<HomepageSectionItem>(
    `INSERT INTO homepage_section_items
       (section_id, title, subtitle, description, button_text, button_link, image_url,
        sort_order, is_active, metadata)
     SELECT id, $2, $3, $4, $5, $6, $7, $8, $9, $10
     FROM homepage_sections
     WHERE id = $1
     RETURNING *`,
    [
      sectionId,
      data.title ?? null,
      data.subtitle ?? null,
      data.description ?? null,
      data.button_text ?? null,
      data.button_link ?? null,
      data.image_url ?? null,
      data.sort_order ?? 0,
      data.is_active ?? true,
      data.metadata ?? {},
    ]
  );

  if (rows[0]) {
    await invalidateHomepageCache();
  }

  return rows[0] || null;
}

export async function updateHomepageSectionItem(
  id: string,
  data: Partial<HomepageSectionItemInput>
): Promise<HomepageSectionItem | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.subtitle !== undefined) { fields.push(`subtitle = $${paramIndex++}`); values.push(data.subtitle); }
  if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }
  if (data.button_text !== undefined) { fields.push(`button_text = $${paramIndex++}`); values.push(data.button_text); }
  if (data.button_link !== undefined) { fields.push(`button_link = $${paramIndex++}`); values.push(data.button_link); }
  if (data.image_url !== undefined) { fields.push(`image_url = $${paramIndex++}`); values.push(data.image_url); }
  if (data.sort_order !== undefined) { fields.push(`sort_order = $${paramIndex++}`); values.push(data.sort_order); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.is_active); }
  if (data.metadata !== undefined) { fields.push(`metadata = $${paramIndex++}`); values.push(data.metadata ?? {}); }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);
  const rows = await query<HomepageSectionItem>(
    `UPDATE homepage_section_items
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (rows[0]) {
    await invalidateHomepageCache();
  }

  return rows[0] || null;
}

export async function deleteHomepageSectionItem(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM homepage_section_items WHERE id = $1 RETURNING id`,
    [id]
  );

  if (rows.length > 0) {
    await invalidateHomepageCache();
  }

  return rows.length > 0;
}
