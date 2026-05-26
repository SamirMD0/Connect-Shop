import { query } from '../config/db';

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

const SINGLE_SECTION_KEYS = new Set(['countdown_promo', 'newsletter']);

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
  [key: string]: HomepageSectionItem[] | HomepageSectionWithItems | null;
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
  };
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

export async function getActiveHomepageContent(): Promise<HomepageContent> {
  const sections = await query<HomepageSection>(
    `SELECT * FROM homepage_sections
     WHERE is_active = true
     ORDER BY sort_order ASC, created_at ASC`
  );

  if (sections.length === 0) {
    return applyLegacyPromotionContent(createEmptyHomepageContent());
  }

  const items = await query<HomepageSectionItem>(
    `SELECT hsi.*
     FROM homepage_section_items hsi
     JOIN homepage_sections hs ON hs.id = hsi.section_id
     WHERE hs.is_active = true
       AND hsi.is_active = true
     ORDER BY hs.sort_order ASC, hs.created_at ASC, hsi.sort_order ASC, hsi.created_at ASC`
  );

  return applyLegacyPromotionContent(groupHomepageContent(nestSections(sections, items)));
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

  return rows[0];
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

  return rows[0] || null;
}

export async function deleteHomepageSection(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM homepage_sections WHERE id = $1 RETURNING id`,
    [id]
  );

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

  return rows[0] || null;
}

export async function deleteHomepageSectionItem(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM homepage_section_items WHERE id = $1 RETURNING id`,
    [id]
  );

  return rows.length > 0;
}
