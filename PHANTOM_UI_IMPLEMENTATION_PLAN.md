# PHANTOM UI IMPLEMENTATION PLAN

## 1. Goal

Add `phantom-ui` skeleton loading to selected frontend sections in the ecommerce UI without changing business logic.

The goal is to use `phantom-ui` for structure-aware skeleton loading. It should wrap real UI and generate skeleton placeholders from the actual DOM structure while data is loading.

It should not replace actual data fetching. It should not replace existing product, category, cart, wishlist, auth, checkout, order, or admin logic. It should not be used as a fake full-screen loading screen only.

The first implementation should be narrow and reversible: add the package, register the Web Component safely on the client, add TypeScript support for the custom element, and then use it only in high-value loading areas.

## 2. Package Overview

- Package name: `@aejkatappaja/phantom-ui`
- It provides a Web Component: `<phantom-ui>`
- It measures the child DOM structure and creates skeleton/shimmer placeholders from the real UI layout.
- It needs browser APIs, so it must be registered client-side in Next.js.
- SSR CSS should be imported in the root layout to avoid visual flash.

This package is different from a normal skeleton component. Instead of manually drawing placeholder rectangles, the real component tree is rendered inside `<phantom-ui loading>`, and the Web Component builds a skeleton from that structure.

## 3. Safety Rules

- Do not edit backend files.
- Do not edit database files.
- Do not edit API services unless absolutely required for frontend types.
- Do not change API endpoint URLs.
- Do not rename variables.
- Do not rename functions.
- Do not rename state.
- Do not change product fetching.
- Do not change category fetching.
- Do not change cart logic.
- Do not change wishlist logic.
- Do not change auth logic.
- Do not change checkout/order logic.
- Do not change admin permissions.
- Do not add CDN script tags.
- Do not wrap the whole app blindly.
- Do not use phantom-ui on checkout/payment/auth-sensitive flows unless there is a clear reason.

## 4. Project Inspection Checklist

Before implementation, inspect:

- `frontend/package.json`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/loading.tsx` if it exists
- `frontend/src/app/page.tsx`
- homepage loading states
- product listing page
- product card component
- category section/component
- admin table components
- global CSS file
- Tailwind config
- TypeScript config
- existing skeleton/spinner/loading components

Current inspection notes:

- `frontend/src/app/layout.tsx` imports `./globals.css` and wraps the app with auth, wishlist, cart, and toast providers.
- There is no root `frontend/src/app/loading.tsx` currently.
- Existing loading UI is mostly local:
  - `animate-pulse` blocks in admin pages.
  - `frontend/src/components/ui/Skeleton.tsx`.
  - `.skeleton-shimmer` in `frontend/src/app/globals.css`.
  - button-level loading states in `frontend/src/components/ui/Button.tsx`.
- Homepage data is fetched in `frontend/src/app/page.tsx` as a server component.
- Client-side loading states exist in cart, wishlist, account, orders, admin tables, reviews, questions, and auth forms.

## 5. Install Plan

Install the package from inside the frontend folder:

```bash
cd frontend
npm install @aejkatappaja/phantom-ui
```

If Codex cannot run npm, update `frontend/package.json` and `frontend/package-lock.json` manually, but prefer `npm install` so the lockfile is generated correctly.

After install:

- Review `frontend/package.json`.
- Review `frontend/package-lock.json`.
- Run `npm audit` from `frontend` if available.
- Do not add unrelated packages.
- Do not modify backend dependencies.

## 6. SSR CSS Plan

Add this import to `frontend/src/app/layout.tsx`:

```ts
import "@aejkatappaja/phantom-ui/ssr.css";
```

Place it near the existing global CSS import:

```ts
import './globals.css';
import "@aejkatappaja/phantom-ui/ssr.css";
```

Reason:

- The CSS import gives SSR-safe base styling for the Web Component.
- It reduces layout flicker before the custom element is registered on the client.
- It keeps styling global and predictable instead of importing CSS in multiple feature components.

## 7. Client Registration Plan

Create a small client-only registration component, for example:

```text
frontend/src/components/phantom/PhantomUiProvider.tsx
```

Expected pattern:

```tsx
'use client';

import { useEffect } from 'react';

export function PhantomUiProvider() {
  useEffect(() => {
    void import('@aejkatappaja/phantom-ui');
  }, []);

  return null;
}
```

Then render it once in `frontend/src/app/layout.tsx`, inside `<body>` and before UI that may use `<phantom-ui>`.

Do not import the Web Component package directly in server components, because it may depend on browser APIs.

## 8. TypeScript Plan

Add a custom element JSX type declaration if TypeScript does not already recognize `<phantom-ui>`.

Possible file:

```text
frontend/src/types/phantom-ui.d.ts
```

Possible declaration:

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'phantom-ui': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          loading?: boolean | string;
        },
        HTMLElement
      >;
    }
  }
}
```

Adjust the prop type only after checking the package documentation and actual accepted attributes.

## 9. Wrapper Component Plan

Prefer a small React wrapper instead of spreading raw `<phantom-ui>` everywhere.

Possible file:

```text
frontend/src/components/ui/PhantomSkeleton.tsx
```

Purpose:

- Centralize the custom element usage.
- Keep class names and loading attribute behavior consistent.
- Make it easy to remove or change the package later.

Example target API:

```tsx
<PhantomSkeleton loading={loading}>
  <ProductGrid products={products} />
</PhantomSkeleton>
```

Rules:

- The wrapper should not fetch data.
- The wrapper should not own product/category/cart/auth state.
- The wrapper should only translate a React boolean into the correct Web Component attribute.

## 10. Recommended First Integration Points

Start with frontend areas that already have local loading states and stable DOM structure.

Recommended first targets:

- Admin dashboard summary cards in `frontend/src/app/admin/page.tsx`.
- Admin data tables using `frontend/src/components/admin/DataTable.tsx`.
- Admin categories/products/promotions/carousel loading blocks.
- Wishlist page loading state in `frontend/src/app/wishlist/page.tsx`.
- Cart page loading state in `frontend/src/app/cart/page.tsx`, only for product list skeletons, not payment/checkout actions.
- Product reviews/questions loading lists.

Homepage caution:

- `frontend/src/app/page.tsx` is a server component, so it does not have a normal client loading state for its initial render.
- Do not force the whole homepage into a client component just to use phantom-ui.
- If homepage skeletons are needed, add targeted client wrappers around specific interactive/client sections or use a route-level `loading.tsx` after confirming the UX benefit.

Store page caution:

- `frontend/src/app/store/page.tsx` is also server-rendered.
- Do not rewrite product/category fetching just for skeletons.
- If needed, use `loading.tsx` for route transitions or client components around filter-driven sections later.

## 11. Areas To Avoid Initially

Avoid using phantom-ui in these areas during the first implementation:

- Checkout form submission and payment-sensitive UI.
- Auth login/register/reset forms.
- Admin MFA setup and verification.
- Cart mutation buttons.
- Add-to-cart and buy-now buttons.
- Any area where hiding actual text/inputs during loading may confuse users or risk repeated actions.

These flows can keep their existing button loading indicators.

## 12. Styling Plan

Keep the current NextMerce visual design.

Use phantom-ui only to improve loading states, not to change layouts, colors, spacing, typography, or component structure.

Check the package CSS variables/options before adding custom CSS. If custom styling is needed, add it narrowly to `frontend/src/app/globals.css` and avoid one-off styles across many components.

Existing loading CSS to review before replacing:

- `.skeleton-shimmer` in `frontend/src/app/globals.css`
- `frontend/src/components/ui/Skeleton.tsx`
- `animate-pulse` blocks in admin pages

Do not delete existing skeleton styles in the first pass. Replace only after phantom-ui is verified in real screens.

## 13. Implementation Order

1. Install `@aejkatappaja/phantom-ui`.
2. Import SSR CSS in `frontend/src/app/layout.tsx`.
3. Add a client-only registration component.
4. Add TypeScript JSX declaration for `<phantom-ui>` if needed.
5. Add a small `PhantomSkeleton` wrapper component.
6. Use it in one low-risk admin loading area first.
7. Build and test.
8. Expand to selected admin tables and wishlist/cart list loading states.
9. Only after validation, consider product listing or homepage route-level loading.

## 14. Testing Plan

Run from `frontend`:

```bash
npm run build
```

Run lint if it is configured non-interactively:

```bash
npm run lint
```

Manual checks:

- Homepage still loads real carousel, promo, category, and product content.
- Store page product/category filtering still works.
- Cart and wishlist still load and mutate correctly.
- Auth flows still work.
- Admin dashboard still requires admin/MFA.
- Admin tables show skeletons only during loading.
- Skeletons do not persist after data loads.
- No hydration errors appear in the browser console.
- No `customElements.define` duplicate registration errors appear.
- No backend requests or endpoints changed.

## 15. Rollback Plan

Keep the integration isolated so rollback is simple:

- Remove `PhantomUiProvider` from `layout.tsx`.
- Remove SSR CSS import from `layout.tsx`.
- Replace `PhantomSkeleton` usages with their previous loading blocks.
- Remove the TypeScript declaration file.
- Uninstall `@aejkatappaja/phantom-ui`.

Do not tie phantom-ui directly into API services, providers, or backend logic.

## 16. Acceptance Criteria

Implementation is acceptable when:

- Package is installed only in `frontend`.
- Backend files are untouched.
- API URLs and response handling are unchanged.
- The Web Component is registered client-side only.
- SSR CSS is imported once in the root layout.
- TypeScript build passes.
- Selected loading sections show structure-aware skeletons.
- Real content appears after loading.
- Existing ecommerce and admin workflows still work.
