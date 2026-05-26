# Homepage CMS Plan

## Scope

Add admin-controlled homepage marketing content while preserving the current NextMerce-style homepage UI and all existing product, category, cart, auth, and admin behavior.

This plan is Phase A only. No implementation code should be changed until this plan is approved.

## Current Project Inspection

### Application Shape

- Backend: Express + TypeScript in `backend/src`.
- Frontend: Next.js App Router + TypeScript in `frontend/src`.
- Database: PostgreSQL through `pg`, with base schema in `backend/src/db/schema.sql` and numbered migrations in `backend/src/db/migrations`.
- API base convention:
  - Backend mounts routes under `/api/v1`.
  - Frontend calls `/api/...`; `frontend/src/lib/api.ts` rewrites that to `/api/v1/...`.
  - New public frontend calls should use `/api/homepage`, which resolves to backend `/api/v1/homepage`.

### Existing Homepage

Current homepage lives in `frontend/src/app/page.tsx`.

It already fetches:

- Featured products from `/api/products/featured`.
- Trending products from `/api/products`.
- Categories from `/api/categories`.
- Carousel slides from `/api/carousel`.

Marketing sections are currently a mix of fetched and hardcoded content:

- `HeroCarousel` receives fetched `CarouselSlide[]` with local fallback content.
- Hero side promo cards are hardcoded in `page.tsx`.
- `NextmercePromoBanners` is hardcoded.
- `CountdownPromo` is hardcoded.
- `Testimonials` is hardcoded.
- `Newsletter` is hardcoded text/background, with only local submitted state.
- Product/category sections are already API-driven and should remain unchanged.

### Existing Admin Dashboard

Admin UI exists under `frontend/src/app/admin`.

Relevant patterns:

- `frontend/src/app/admin/layout.tsx` handles admin route guarding and MFA UX.
- `frontend/src/components/admin/AdminSidebar.tsx` defines sidebar navigation and permission-based visibility.
- `frontend/src/app/admin/carousel/page.tsx` manages existing carousel slides.
- `frontend/src/app/admin/promotions/page.tsx` manages existing promotions.
- Shared admin UI pieces include `Modal`, `DataTable`, `Button`, `Badge`, and lucide icons.

The new homepage CMS page should follow these local admin styles rather than adding a UI library.

### Existing Auth/Admin Middleware

Admin backend routes currently use:

- `requireAuth`
- `isAdmin`
- `requireAdminMfa`
- `adminAudit`
- `requireAdminPermission(...)`

Existing permissions include:

- `content`
- `marketing`
- `products`
- `orders`
- `users`
- `reviews`
- `analytics`

Homepage CMS should use `content` or `marketing`. Recommendation:

- Use `content` for homepage section/content management.
- Keep existing promotions under `marketing`.

### Existing Upload/Image Handling

There is already an admin image upload endpoint:

- Route: `POST /api/v1/admin/uploads/image`
- Frontend usage: `frontend/src/app/admin/products/page.tsx`
- Backend handler: `uploadImage` in `backend/src/controllers/admin.controller.ts`
- Storage strategy: writes decoded base64 image data to `frontend/public/uploads/admin`
- Response shape: `{ success: true, url: "/uploads/admin/<file>" }`
- Allowed data URL types: PNG, JPG/JPEG, WEBP, GIF

No Cloudinary/ImageKit/S3 is configured. Do not add an external image service blindly.

Important caveat:

- The app has `express.json({ limit: '10kb' })`, so the current base64 upload endpoint is only suitable for very small files unless the route/body parser strategy is adjusted later.
- Phase F should either reuse and harden this local upload strategy or keep URL-only fields until upload behavior is explicitly expanded.

### Existing Database Style

The base schema is idempotent SQL with `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, indexes, and `updated_at` triggers.

Migrations are numbered files such as:

- `001_backend_indexes.sql`
- `002_notifications_newsletter.sql`

Migration runner:

- `backend/src/db/migrate.ts`
- Tracks applied migrations in `schema_migrations`.

Existing content-related tables:

- `carousel_slides`
- `promotions`

These should not be removed. The homepage CMS can supersede them for the rebuilt homepage while keeping old routes intact for compatibility.

## Database Migration Plan

Add a new migration, likely:

`backend/src/db/migrations/003_homepage_cms.sql`

Recommended tables:

```sql
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_key VARCHAR(100) NOT NULL,
  section_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  subtitle TEXT,
  description TEXT,
  eyebrow VARCHAR(255),
  button_text VARCHAR(100),
  button_link TEXT,
  image_url TEXT,
  background_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_section_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
  title VARCHAR(255),
  subtitle TEXT,
  description TEXT,
  button_text VARCHAR(100),
  button_link TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes:

- `homepage_sections(section_key)`
- `homepage_sections(is_active, sort_order)`
- `homepage_section_items(section_id, is_active, sort_order)`

Triggers:

- Reuse `update_updated_at_column()`.
- Add triggers for `homepage_sections` and `homepage_section_items`.

Recommended section keys:

- `hero_carousel`
- `hero_side_promo`
- `service_features`
- `browse_categories`
- `promo_banners`
- `countdown_promo`
- `testimonials`
- `newsletter`

Recommended section type usage:

- `carousel`
- `card_grid`
- `banner_group`
- `countdown`
- `testimonial_group`
- `newsletter`
- `static_product_section`

Recommended metadata usage:

- Hero carousel slide eyebrow, theme, overlay settings.
- Side promo savings text, color class/token, product link override.
- Promo banner layout variant and accent color token.
- Countdown end date, foreground/background image choices, color token.
- Testimonial rating, author role, avatar URL.
- Newsletter placeholder, success text, button label.

Do not store image binary data in PostgreSQL. Store only `image_url` and `background_image_url`.

## Backend API Plan

### Route Placement

Add:

- `backend/src/routes/homepage.routes.ts`
- `backend/src/controllers/homepage.controller.ts`
- `backend/src/services/homepage.service.ts`

Mount in `backend/src/app.ts`:

- `app.use('/api/v1/homepage', homepageRoutes)`

### Public API

Backend route:

- `GET /api/v1/homepage`

Frontend call:

- `api.get('/api/homepage')`

Returns active sections/items ordered by `sort_order`.

Recommended response:

```json
{
  "success": true,
  "homepage": {
    "hero_carousel": [],
    "hero_side_promo": [],
    "promo_banners": [],
    "countdown_promo": null,
    "testimonials": [],
    "newsletter": null
  }
}
```

The frontend should still own fallback content. The public API should return a stable empty shape if no content exists.

### Admin API

Follow the existing project convention under `/api/v1/admin`, not a separate unversioned route.

Add to `backend/src/routes/admin.routes.ts`:

- `GET /homepage`
- `POST /homepage/sections`
- `PUT /homepage/sections/:id`
- `DELETE /homepage/sections/:id`
- `POST /homepage/sections/:id/items`
- `PUT /homepage/items/:id`
- `DELETE /homepage/items/:id`

Frontend calls:

- `/api/admin/homepage`
- `/api/admin/homepage/sections`
- `/api/admin/homepage/sections/:id`
- `/api/admin/homepage/sections/:id/items`
- `/api/admin/homepage/items/:id`

Use:

- `requireAdminPermission('content')`
- existing admin auth, MFA, audit middleware already applied by `admin.routes.ts`

### Validation

Extend `backend/src/middleware/validate.ts`.

Add reusable validators or local route validators for:

- `section_key`: known section keys or safe slug-like value.
- `section_type`: known section type.
- `title`, `subtitle`, `description`, `eyebrow`: length-limited strings.
- `button_link`: safe internal path, `http:`, `https:`, `mailto:`, or `tel:`.
- `image_url`, `background_image_url`: safe internal site path or `http:`/`https:`.
- `sort_order`: integer >= 0.
- `is_active`: boolean.
- `metadata`: object only, not arbitrary string.

The existing private helpers `isImageReference` and `isSafeLink` are good patterns; they may need to be reused or moved inside the same file without renaming existing validation exports.

### Service Behavior

Public `getActiveHomepageContent()`:

- Query active sections ordered by `sort_order`.
- Query active items for those sections ordered by `sort_order`.
- Group by `section_key`.
- Return arrays for multi-item sections.
- Return a single object for single-content sections such as `countdown_promo` and `newsletter`.
- Do not fail homepage rendering if no content exists.

Admin `getHomepageContent()`:

- Return all sections and items, including inactive, ordered by `sort_order`.
- Shape can be normalized for admin editing:

```json
{
  "success": true,
  "sections": [
    {
      "id": "...",
      "section_key": "hero_carousel",
      "items": []
    }
  ]
}
```

Create/update/delete:

- Prefer full `PUT` updates to match existing admin routes.
- Cascading delete of section items is handled by `ON DELETE CASCADE`.
- Return created/updated record in existing project style.

### Compatibility With Existing Carousel/Promotions

Do not remove:

- `/api/v1/carousel`
- `/api/v1/carousel/admin`
- `/api/v1/admin/promotions`
- Existing `carousel_slides` or `promotions` tables

Initial homepage CMS can coexist with those. During frontend integration, `GET /api/homepage` should become the primary source for marketing content, while old carousel data may remain as an optional fallback during transition.

## Frontend Homepage Integration Plan

### Types

Add homepage CMS types to `frontend/src/lib/types.ts`, for example:

- `HomepageSection`
- `HomepageSectionItem`
- `HomepageContent`
- `HomepageContentResponse`

Avoid renaming existing `CarouselSlide`.

### Data Fetching

In `frontend/src/app/page.tsx`:

- Keep existing product/category fetches unchanged.
- Add `api.get('/api/homepage')`.
- Do not let homepage CMS fetch failure block product/category rendering.
- Use safe fallback content matching the current NextMerce UI if `homepage` content is empty.

Recommended fetch pattern:

- Add homepage fetch to the existing `Promise.all`, with `.catch(() => fallback empty shape)`.
- Keep `featured`, `trending`, and `categories` assignments as they are.
- Map `homepage.hero_carousel` to existing `HeroCarousel` slide props.

### Component Updates

Keep existing UI components and make them accept optional CMS props:

- `HeroCarousel`: keep current `slides` prop. Optionally extend slide typing later without breaking `CarouselSlide`.
- `NextmercePromoBanners`: accept optional banners/items. Render current hardcoded banners if none are provided.
- `CountdownPromo`: accept optional promo object. Render current hardcoded content if missing.
- `Testimonials`: accept optional testimonials. Render current hardcoded testimonials if missing.
- `Newsletter`: accept optional content. Render current hardcoded text/background if missing.

Hero side promos are currently inline in `page.tsx`. Recommended:

- Keep markup in `page.tsx` initially to minimize changes.
- Replace the hardcoded array with `homepage.hero_side_promo` mapped to the same shape.
- Fall back to the current two promo cards.

Section visibility/order:

- Phase D should support visibility by rendering only active content returned by the public API.
- Full arbitrary section reordering is practical later but higher risk because product/category sections are mixed with marketing sections.
- Initial implementation should support per-section active/inactive and item ordering.

## Admin UI Plan

Add:

- `frontend/src/app/admin/homepage/page.tsx`
- Sidebar item: `Homepage`, permission `content`, icon likely `PanelsTopLeft`, `LayoutTemplate`, or existing lucide equivalent.

Use existing admin style:

- Dark admin background.
- Existing `Modal`, `DataTable`, simple inputs, checkboxes, icon buttons.
- No new UI library.

Recommended layout:

- Tabs or segmented buttons for:
  - Hero Carousel
  - Side Promos
  - Promo Banners
  - Countdown
  - Testimonials
  - Newsletter
- Each tab lists current records with:
  - Preview image/card.
  - Title/subtitle.
  - Active/inactive badge.
  - Sort order.
  - Edit/delete actions.

Admin form fields:

Hero Carousel item:

- Image URL
- Optional upload button reusing `/api/admin/uploads/image` if Phase F is approved
- Title
- Subtitle
- Button text
- Button link
- Sort order
- Active checkbox
- Optional metadata: eyebrow

Side Promo item:

- Image URL
- Title
- Eyebrow
- Savings/offer text in metadata
- Button text/link
- Sort order
- Active checkbox
- Optional metadata color token

Promo Banner item:

- Image URL
- Eyebrow
- Title
- Subtitle/description
- Button text/link
- Sort order
- Active checkbox
- Optional metadata layout variant/accent color

Countdown section:

- Title
- Eyebrow/subtitle
- Description
- Image URL
- Background image URL
- Countdown end date in metadata
- Button text/link
- Active checkbox

Testimonials item:

- User name as title
- User role as subtitle
- Review text as description
- Avatar URL as image_url
- Rating in metadata
- Sort order
- Active checkbox

Newsletter section:

- Title
- Subtitle/description
- Background image URL
- Button text and placeholder in metadata if needed
- Active checkbox

Initial admin UI should prefer URL fields first. Upload controls can be added only if Phase F is approved.

## Image Upload Plan

Phase F should not introduce external storage by default.

Recommended first implementation:

- Store URL fields only in homepage CMS forms.
- Allow existing `/uploads/admin/...`, `/nextmerce/...`, `/images/...`, or HTTPS URLs.

If upload is approved:

- Reuse `POST /api/v1/admin/uploads/image`.
- Add upload controls similar to product admin.
- Consider increasing upload body handling only for that route or replacing base64 JSON upload with multipart parsing.
- Add server-side image size validation before writing.
- Keep allowed file types to PNG, JPG/JPEG, WEBP, GIF.
- Continue storing only returned image URLs in PostgreSQL.

Do not add Cloudinary, ImageKit, S3, or another provider unless explicitly requested or configured later.

## Risk List

- Existing upload endpoint is constrained by the global `10kb` JSON body limit, so full image uploads may fail for realistic files.
- Homepage currently combines hardcoded marketing sections with product/category API data; replacing only marketing content requires careful prop mapping to avoid product section regressions.
- Existing `carousel_slides` and `promotions` tables overlap with the new CMS concept. Keep them intact to avoid breaking existing admin pages/routes.
- Next.js image rendering may require remote image domain configuration for arbitrary external URLs. Internal `/uploads`, `/nextmerce`, and `/images` paths are safer.
- `metadata JSONB` gives flexibility but needs validation so the admin cannot save malformed shapes that break frontend rendering.
- Arbitrary section ordering across all homepage sections is higher risk than item ordering; start with section active/inactive and item sort order.
- Existing carousel admin may become redundant. Do not remove it in the first CMS implementation.
- Admin delete operations are permanent. Add confirmation dialogs in UI.
- The newsletter component currently does not call a subscription API. Homepage CMS should manage only text/background unless newsletter submission behavior is separately requested.

## Step-by-Step Implementation Order

### Phase B - Database and Backend Foundation

1. Add `003_homepage_cms.sql`.
2. Add `homepage_sections` and `homepage_section_items`.
3. Add indexes and `updated_at` triggers.
4. Add backend homepage service, controller, and route files.
5. Add admin route handlers under existing `/api/v1/admin`.
6. Add validation rules for homepage sections/items.
7. Mount public `/api/v1/homepage`.
8. Keep existing carousel and promotions routes unchanged.

### Phase C - Public Homepage API

1. Implement `GET /api/v1/homepage`.
2. Return active sections/items ordered by `sort_order`.
3. Return stable empty fallback-safe keys.
4. Verify the endpoint works with an empty database.
5. Verify active/inactive and ordering behavior.

### Phase D - Frontend Homepage Integration

1. Add homepage CMS types.
2. Fetch `/api/homepage` in `frontend/src/app/page.tsx`.
3. Keep product/category fetching unchanged.
4. Map CMS hero items to current `HeroCarousel`.
5. Update side promos, promo banners, countdown, testimonials, and newsletter to accept optional dynamic props.
6. Preserve current hardcoded NextMerce fallback content when CMS data is empty.
7. Confirm homepage still loads if homepage CMS API fails.

### Phase E - Admin Dashboard

1. Add `/admin/homepage`.
2. Add sidebar navigation item with `content` permission.
3. Build tabbed/segmented management UI for each homepage content group.
4. Support create/edit/delete/toggle active/sort order.
5. Add preview cards where practical.
6. Use existing modal/table/button/admin styles.

### Phase F - Image Upload

1. Start with URL-only fields.
2. If upload is approved, reuse `/api/admin/uploads/image`.
3. Add upload controls to homepage forms.
4. Harden or adjust upload size validation if necessary.
5. Store only returned image URLs in homepage tables.

### Phase G - Testing

Backend:

- Run `npm run build` in `backend`.
- Run migration locally with `npm run db:migrate` when database is available.
- Test `GET /api/v1/homepage` with no CMS data.
- Test admin create/edit/delete/toggle flows.

Frontend:

- Run `npm run build` in `frontend`.
- Run lint if available and functional.
- Verify homepage with no CMS data uses current NextMerce fallback content.
- Verify homepage with CMS data renders dynamic marketing sections.
- Verify products, categories, product links, cart, auth, and admin access still work.
- Verify internal `/uploads/admin/...`, `/nextmerce/...`, and `/images/...` image paths render correctly.

