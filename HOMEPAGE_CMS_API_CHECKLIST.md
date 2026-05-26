# Homepage CMS API Checklist

Phase C verification target:

- `GET /api/v1/homepage`
- Frontend-facing equivalent after API rewrite: `/api/homepage`

## Empty Response

With no rows in `homepage_sections` and `homepage_section_items`, the endpoint should return:

```json
{
  "success": true,
  "homepage": {
    "hero_carousel": [],
    "hero_side_promo": [],
    "service_features": [],
    "browse_categories": [],
    "promo_banners": [],
    "countdown_promo": null,
    "testimonials": [],
    "newsletter": null
  }
}
```

Manual check:

```bash
curl http://localhost:5000/api/v1/homepage
```

Use the backend port configured for the local environment if it differs.

## Active and Inactive Behavior

- Only `homepage_sections.is_active = true` sections should affect the public response.
- Only `homepage_section_items.is_active = true` items should appear in multi-item arrays.
- Items belonging to inactive sections must not appear.
- Active multi-item sections with no active items should leave their response key as an empty array.
- `countdown_promo` and `newsletter` should be `null` when no active section exists for that key.

Suggested SQL setup:

```sql
INSERT INTO homepage_sections (id, section_key, section_type, title, sort_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'hero_carousel', 'carousel', 'Hero', 2, true),
  ('00000000-0000-0000-0000-000000000102', 'promo_banners', 'banner_group', 'Hidden', 1, false),
  ('00000000-0000-0000-0000-000000000103', 'countdown_promo', 'countdown', 'Countdown', 3, true);

INSERT INTO homepage_section_items (section_id, title, sort_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Second slide', 20, true),
  ('00000000-0000-0000-0000-000000000101', 'First slide', 10, true),
  ('00000000-0000-0000-0000-000000000101', 'Hidden slide', 5, false),
  ('00000000-0000-0000-0000-000000000102', 'Hidden banner', 1, true);
```

Expected result:

- `hero_carousel` is an array with `First slide`, then `Second slide`.
- `Hidden slide` is excluded.
- `promo_banners` is `[]` because its section is inactive.
- `countdown_promo` is an object with `section_key: "countdown_promo"`, not an array.
- `newsletter` is `null`.

Cleanup:

```sql
DELETE FROM homepage_sections
WHERE id IN (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103'
);
```

## Sort Behavior

- Multi-item arrays are ordered by parent section `sort_order`, then item `sort_order`.
- Items with equal sort order fall back to creation order.
- Admin responses may include inactive records; public responses must not.

## Shape Rules

Arrays:

- `hero_carousel`
- `hero_side_promo`
- `service_features`
- `browse_categories`
- `promo_banners`
- `testimonials`

Object or `null`:

- `countdown_promo`
- `newsletter`

## Validation Rules

Homepage CMS admin routes should enforce:

- `section_key`: known key or safe slug-like value.
- `section_type`: known type.
- `metadata`: object only.
- `image_url` and `background_image_url`: safe internal path or `http`/`https`.
- `button_link`: safe internal path, `http`/`https`, `mailto`, or `tel`.
- `sort_order`: integer >= 0.
- `is_active`: boolean.
