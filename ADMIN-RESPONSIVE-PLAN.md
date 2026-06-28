# Admin Dashboard Responsive Design Plan

> **Status:** Approved for implementation, with corrections applied below (see inline ⚠️ notes). Execution order unchanged: Phase 1 → 2 → 4 → 5 → 3.

## Current State Assessment
- **Styling**: Tailwind CSS v4 exclusively (no CSS modules, no separate stylesheets)
- **Sidebar**: Mobile-aware with hamburger + overlay toggle at `lg:` breakpoint (1024px)
- **Grids**: Partial responsive support (`grid-cols-1 md:grid-cols-3 lg:grid-cols-5`)
- **Tables**: `overflow-x-auto` only — no mobile card/row view
- **Chart**: Fixed `h-80` height in a `ResponsiveContainer`
- **Forms**: Mostly stackable, but some areas cramped on small screens
- **Modals**: No mobile-specific sizing/inset
- **Touch targets**: Some icon buttons are 28-32px (below recommended 44px)

---

## Phase 1: Core Layout & Navigation *(~8 files)*

### 1.1 — Improve sidebar breakpoint & animation
- Change sidebar toggle breakpoint from `lg: (1024px)` to `md: (768px)` in `layout.tsx`
- ⚠️ **Correction:** this is a **UX choice**, not a bug fix. The current `lg:hidden` header already shows the hamburger below 1024px, so the sidebar is reachable at all widths today. Moving to `md:` makes the sidebar persistent on tablets (768–1023px) instead of collapsible — a deliberate tradeoff, not a gap fix.
- ⚠️ Test 768px carefully: a 256px (`w-64`) fixed sidebar at that width leaves ~512px of content, which can feel tight for tables/forms. Confirm with real admin pages (Orders, Products) before locking this in; consider a narrower sidebar (e.g. `w-56`) at `md:` if content feels cramped.
- Update all `lg:ml-64`, `lg:translate-x-0`, `lg:hidden` references to use `md:`

### 1.2 — Enhance mobile header
- Add current page title/breadcrumb to the mobile header (`layout.tsx`)
- Make the hamburger button larger (min 44px touch target)
- Add a subtle bottom border shadow on scroll

### 1.3 — Enrich AdminSidebar mobile close behavior
- Add `aria-expanded` and `aria-controls` attributes
- Ensure focus trap within sidebar when open on mobile (accessibility)

### 1.4 — Reduce content padding on very small screens
- Change `p-4 lg:p-8` → `p-3 sm:p-4 lg:p-8` in layout's main content container

---

## Phase 2: Dashboard Overview & Data Visualization *(~3 files)*

### 2.1 — Responsive stat cards (`AdminStatCard.tsx`, `admin/page.tsx`)
- Scale down `text-2xl` to `text-xl sm:text-2xl` on stat values
- Reduce card padding from `p-6` → `p-4 sm:p-6`
- Reduce icon container from `h-11 w-11` → `h-9 w-9 sm:h-11 sm:w-11`
- Ensure 5-column grid degrades gracefully: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`

### 2.2 — Responsive chart (`admin/page.tsx`)
- Reduce `h-80` → `h-64 sm:h-80` (shorter on mobile)
- Reduce chart margins for small screens: `margin={{ top: 5, right: 10, left: 10, bottom: 5 }}` on mobile
- Reduce `maxBarSize` from 50 to ~30 for narrower viewports
- Hide Y-axis labels or reduce font size on very small screens

### 2.3 — Recent data grid (`admin/page.tsx`)
- Stack single-column on mobile (already does this via `grid-cols-1 lg:grid-cols-2`)
- Reduce padding in list items from `p-4` → `p-3 sm:p-4`

---

## Phase 3: DataTable Mobile Card View *(~9 files)*

### 3.1 — Add mobile card mode to `DataTable.tsx`
- Create a new `renderMobileCard` prop (caller-supplied render function), not breakpoint-detection via JS
- ⚠️ **Correction:** use pure CSS breakpoints, not `useMediaQuery`/`window.matchMedia`, unless a specific interaction later requires JS-level knowledge of viewport. Safer, simpler shape:
  - Render **both** the table and the card list in the DOM at once
  - Cards wrapper: `className="md:hidden"`
  - Table wrapper: `className="hidden md:block"`
  - This avoids hydration mismatches, avoids a `useEffect`/resize listener, and preserves existing `loading` and empty-state branches untouched (they sit above/outside the table-vs-card split, not duplicated inside each)
- Each card shows: key fields as labeled rows, actions at the bottom
- Keep table mode for larger screens (no change to existing behavior)

### 3.2 — Update all DataTable callers to define mobile card rendering
- ⚠️ **Correction — caller list cleanup**, based on actual repo inspection:
  - **Remove `search/page.tsx`** — it does not use `DataTable`; it renders custom `Link` cards per result type. No change needed here for Phase 3.
  - **`homepage/page.tsx` has two `DataTable` instances** (one inside `SectionManager` for brand/category product sections, one inside `HomepageBlocksManager` for homepage blocks). Both need their own `renderMobileCard`.
  - **`products/page.tsx` and `promotions/page.tsx` already have a grid/card view toggle** (`viewMode: 'table' | 'grid'`) as an existing feature. ⚠️ Do not let the new mobile-card mode duplicate or conflict with that toggle — on mobile, the existing grid mode may already be a reasonable substitute. Decide per-page whether `renderMobileCard` is still needed when `viewMode === 'grid'`, or whether the grid view alone satisfies mobile UX (likely yes, skip duplicate card rendering when grid view is active).
- Corrected pages affected (`DataTable` consumers only): `products/page.tsx`, `orders/page.tsx`, `customers/page.tsx`, `categories/page.tsx`, `coupons/page.tsx`, `reviews/page.tsx`, `inventory/page.tsx`, `promotions/page.tsx`, `homepage/page.tsx` (×2 instances), `security/page.tsx`
- For each, add a `renderMobileCard` function that shows the most important 3-4 fields as a card

### 3.3 — Responsive pagination
- ⚠️ **Correction:** pagination is implemented **page-level** (inline JSX in each page, e.g. `orders/page.tsx`, `products/page.tsx`, `reviews/page.tsx`, `security/page.tsx`), not inside `DataTable.tsx` itself. `DataTable` has no pagination prop/logic.
- This means Phase 3.3 should target each page's own pagination block directly, not flow through the `DataTable` component changes in 3.1
- On mobile, simplify pagination to just page number indicator and icon-only prev/next buttons
- Hide "Previous" / "Next" text labels with `hidden sm:inline`

---

## Phase 4: Forms, Modals & Interactive Elements *(~6 files)*

### 4.1 — Responsive modals (`Modal.tsx`)
- On mobile: use `p-2 sm:p-4` instead of `p-4 sm:p-0` for outer padding
- Full-width modal on mobile: `m-2 sm:m-0` with `max-w-lg` unchanged
- Increase modal body padding: `p-6` → `p-4 sm:p-6`
- Ensure modal doesn't exceed viewport height better with `max-h-[85vh] sm:max-h-[90vh]`

### 4.2 — Form layout improvements (all form pages)
- Ensure form fields use full width on mobile (`w-full` already standard)
- Buttons at form bottom should be full-width stack on mobile, side-by-side on tablet+
- Reduce `py-3` input padding → `py-2.5 sm:py-3`
- Reduce `p-4` card sections → `p-3 sm:p-4`
- In product form variants: single column on mobile, 2-col on `sm:`

### 4.3 — Touch target optimization
- Increase icon buttons from `p-2` (32px) → `p-2.5` (36px+)
- Ensure all interactive elements have minimum 44px height on mobile
- Specifically in `AdminSidebar.tsx` close button, product action buttons, order view button

### 4.4 — Responsive action toolbars
- Throughout all pages, button groups should wrap and be full-width on mobile
- Search inputs should be full width on mobile
- Filter selects should stack below search on mobile

---

## Phase 5: Fine-Tuning & Edge Cases *(project-wide)*

### 5.1 — Responsive typography audit
- Page titles: `text-3xl` → `text-2xl sm:text-3xl`
- Section headings: `text-lg` → `text-base sm:text-lg`
- Body text sizes check for readability at 320px-375px widths

### 5.2 — MFA verification screen
- Reduce max width of MFA form on mobile (already has `max-w-md` but could tighten)
- Stack buttons vertically on mobile
- Ensure QR code fits screen: `h-48 w-48` → `h-40 w-40 sm:h-48 sm:w-48`

### 5.3 — Gap/negative space audit
- Reduce `gap-6` → `gap-4 sm:gap-6` on mobile
- Reduce `space-y-8` → `space-y-6 sm:space-y-8` between major sections

### 5.4 — Empty/loading states
- Ensure skeleton loaders are responsive (match card sizing)
- Empty state padding: `p-12` → `p-8 sm:p-12`

### 5.5 — Frontend admin polish (renamed from "Backend admin mobile optimization")
- ⚠️ **Correction:** these are **frontend** admin pages (`frontend/src/app/admin/.../page.tsx`); nothing here touches the backend. Title corrected to avoid confusion.
- `security/page.tsx` health cards: `md:grid-cols-2 xl:grid-cols-5` → add `sm:grid-cols-2` for mobile
- `brands/page.tsx` grid: already has `md:grid-cols-2 xl:grid-cols-3`
- `promotions/page.tsx`: already has `sm:grid-cols-2 xl:grid-cols-3`

---

## Effort Summary

| Phase | Files Changed | Type | Estimated Effort |
|-------|--------------|------|------------------|
| 1: Core Layout | `layout.tsx`, `AdminSidebar.tsx` | Layout | Small |
| 2: Dashboard Overview | `page.tsx`, `AdminStatCard.tsx` | Visual | Small |
| 3: DataTable Mobile | `DataTable.tsx` + 9 page files (10 `DataTable` instances; `search/page.tsx` excluded — no `DataTable` usage) | Architectural | **Large** |
| 4: Forms & Modals | `Modal.tsx` + 6 form pages | Medium | Medium |
| 5: Fine-Tuning | ~15 files across admin (frontend only) | Polish | Small |

**Total**: ~19 files, ~5 phases

---

## Recommended Execution Order

**Phase 1 → Phase 2 → Phase 4 → Phase 5 → Phase 3**

Why Phase 3 last? DataTable mobile card view is architecturally the most involved change (10 `DataTable` instances across 9 page files, requires a new render mode). The other phases deliver high-visibility improvements with less risk and can be shipped faster. Phase 3 should be designed carefully and tested against all `DataTable` consumers, with special attention to `homepage/page.tsx` (two instances) and to `products`/`promotions` pages where an existing grid/card `viewMode` toggle may already cover mobile UX without needing a separate `renderMobileCard`.