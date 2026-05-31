// backend/src/services/carousel.service.ts
import { query } from '../config/db';
import { delCache } from '../config/redis';
import { CACHE_KEYS } from '../utils/cachePolicy';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CarouselSlide {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Service Functions ───────────────────────────────────────────────────────

async function invalidateCarouselCache(): Promise<void> {
  await delCache(CACHE_KEYS.carouselActive);
}

/** Public: returns only active slides ordered by display_order */
export async function getActiveSlides(): Promise<CarouselSlide[]> {
  return query<CarouselSlide>(
    `SELECT * FROM carousel_slides
     WHERE is_active = true
     ORDER BY display_order ASC`
  );
}

/** Admin: returns all slides regardless of active state */
export async function getAllSlides(): Promise<CarouselSlide[]> {
  return query<CarouselSlide>(
    `SELECT * FROM carousel_slides ORDER BY display_order ASC`
  );
}

/** Admin: insert a new slide */
export async function createSlide(
  data: Omit<CarouselSlide, 'id' | 'created_at' | 'updated_at'>
): Promise<CarouselSlide> {
  const rows = await query<CarouselSlide>(
    `INSERT INTO carousel_slides
       (title, subtitle, image_url, link_url, button_text, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.title,
      data.subtitle ?? null,
      data.image_url,
      data.link_url ?? null,
      data.button_text ?? null,
      data.display_order,
      data.is_active,
    ]
  );
  await invalidateCarouselCache();
  return rows[0];
}

/** Admin: partial update — only updates the fields that are present in data */
export async function updateSlide(
  id: number,
  data: Partial<Omit<CarouselSlide, 'id' | 'created_at' | 'updated_at'>>
): Promise<CarouselSlide | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.subtitle !== undefined) { fields.push(`subtitle = $${paramIndex++}`); values.push(data.subtitle); }
  if (data.image_url !== undefined) { fields.push(`image_url = $${paramIndex++}`); values.push(data.image_url); }
  if (data.link_url !== undefined) { fields.push(`link_url = $${paramIndex++}`); values.push(data.link_url); }
  if (data.button_text !== undefined) { fields.push(`button_text = $${paramIndex++}`); values.push(data.button_text); }
  if (data.display_order !== undefined) { fields.push(`display_order = $${paramIndex++}`); values.push(data.display_order); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.is_active); }

  if (fields.length === 0) return null;

  values.push(id);
  const rows = await query<CarouselSlide>(
    `UPDATE carousel_slides SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  if (rows[0]) {
    await invalidateCarouselCache();
  }
  return rows[0] || null;
}

/** Admin: delete a slide by id */
export async function deleteSlide(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM carousel_slides WHERE id = $1 RETURNING id`,
    [id]
  );
  if (rows.length > 0) {
    await invalidateCarouselCache();
  }
  return rows.length > 0;
}
