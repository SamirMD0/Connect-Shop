# NEXTMERCE UI REBUILD PLAN

## 1. Project Inspection

Before coding starts, the current project must be inspected carefully. The goal is to understand the existing frontend and preserve the working application behavior while rebuilding only the UI/design layer.

Inspect:

- Current frontend framework.
- Current routes/pages.
- Current components.
- Current API services.
- Current product logic.
- Current cart logic.
- Current auth logic.
- Current checkout/order logic.
- Current admin logic if present.
- Current Tailwind/CSS setup.
- Current image handling.

The NextMerce template must be treated as a visual reference, not as a replacement application.

## 2. Current Logic That Must Be Preserved

The following existing logic must not be changed:

- [ ] Product fetching.
- [ ] Product search/filter/sort logic.
- [ ] Product detail loading.
- [ ] Cart add/remove/update quantity logic.
- [ ] Wishlist logic if present.
- [ ] Checkout/order creation logic.
- [ ] Login/register/logout logic.
- [ ] User/session handling.
- [ ] Admin CRUD logic.
- [ ] API services.
- [ ] Environment variables.
- [ ] Existing variable names.
- [ ] Existing function names.
- [ ] Existing state names.
- [ ] Existing TypeScript interfaces/models.

Strong rule: The UI can change. The logic must not.

## 3. NextMerce Parts To Use

The following NextMerce areas can be reused as UI/design references:

- Header design from `src/components/Header`.
- Footer design from `src/components/Footer`.
- Home sections from `src/components/Home`:
  - Hero.
  - Categories.
  - BestSeller.
  - NewArrivals.
  - PromoBanner.
  - Countdown.
  - Testimonials.
- Product card/list design from:
  - `src/components/Common/ProductItem.tsx`.
  - `src/components/Shop/SingleGridItem.tsx`.
  - `src/components/Shop/SingleListItem.tsx`.
- Shop page layout from:
  - `src/components/ShopWithSidebar`.
  - `src/components/ShopWithoutSidebar`.
- Product details UI from:
  - `src/components/ShopDetails`.
- Cart UI from:
  - `src/components/Cart`.
- Checkout UI from:
  - `src/components/Checkout`.
- Wishlist UI from:
  - `src/components/Wishlist`.
- Auth page visual layout from:
  - `src/components/Auth/Signin`.
  - `src/components/Auth/Signup`.
- Common UI from:
  - `src/components/Common/Breadcrumb`.
  - `src/components/Common/Newsletter`.
  - `src/components/Common/QuickViewModal`.
  - `src/components/Common/CartSidebarModal`.

Use JSX structure, layout, spacing, Tailwind classes, and visual design ideas from these files. Do not copy the business logic directly.

## 4. NextMerce Parts To Avoid

Do not copy or replace existing project behavior with:

- NextMerce static product data.
- NextMerce `shopData.ts` as live data.
- NextMerce `ordersData.tsx` as live data.
- NextMerce Redux slices unless compatible with the current project.
- NextMerce cart logic.
- NextMerce wishlist logic if this project already has one.
- NextMerce dummy auth flow.
- NextMerce fake checkout/order logic.
- NextMerce types if they conflict with existing types.
- Any logic that changes API behavior.

Do not add Sanity, Stripe, Clerk, NextAuth, Medusa, or any external backend/service as part of this UI rebuild.

## 5. Component Replacement Strategy

| Old Area | NextMerce UI Reference | What To Replace | What Must Stay The Same |
| --- | --- | --- | --- |
| Header/Navbar | `src/components/Header` | Replace only UI markup, classes, layout, navigation presentation, dropdown styling, search presentation, and responsive menu styling. | Existing props, imports, API calls, variable names, functions, event handlers, state, auth/cart indicators, and existing route links. |
| Footer | `src/components/Footer` | Replace only footer layout, spacing, typography, columns, and visual styling. | Existing route links, dynamic content, variable names, props, and any current configuration-driven footer logic. |
| Home page | `src/components/Home` | Rebuild homepage visual sections using NextMerce-inspired Hero, Categories, BestSeller, NewArrivals, PromoBanner, Countdown, and Testimonials layouts. | Existing product fetching, featured product logic, category data source, route structure, variable names, functions, and state. |
| Product card | `src/components/Common/ProductItem.tsx`, `src/components/Shop/SingleGridItem.tsx`, `src/components/Shop/SingleListItem.tsx` | Replace card markup, image layout, badges, buttons, hover states, spacing, and responsive styling. | Existing product props, product field names, cart handlers, wishlist handlers, detail links, variable names, functions, and state. |
| Product listing page | `src/components/ShopWithSidebar`, `src/components/ShopWithoutSidebar` | Replace grid/list layout, sidebar visual style, toolbar style, filters UI, sort UI, pagination UI, and responsive behavior. | Existing product fetch logic, search/filter/sort behavior, pagination behavior, API calls, state names, handler names, and route names. |
| Product details page | `src/components/ShopDetails` | Replace gallery layout, product info layout, tabs, quantity controls styling, and related product visual layout. | Existing product detail loading, selected product data model, add-to-cart logic, wishlist logic, state names, handler names, and API calls. |
| Cart page | `src/components/Cart` | Replace table/list layout, quantity control styling, totals panel UI, coupon UI if already present, and empty-cart visual state. | Existing cart state, add/remove/update quantity logic, total calculation, checkout navigation, variable names, function names, and data model. |
| Checkout page | `src/components/Checkout` | Replace form layout, order summary layout, payment/shipping section styling, and responsive structure. | Existing checkout form state, validation logic, order creation request, API endpoint URLs, variable names, handlers, and response handling. |
| Login page | `src/components/Auth/Signin` | Replace visual layout, form spacing, button styling, labels, and responsive presentation. | Existing login request, auth state handling, validation, environment variables, variable names, handler names, and redirect behavior. |
| Register page | `src/components/Auth/Signup` | Replace visual layout, form spacing, button styling, labels, and responsive presentation. | Existing register request, auth state handling, validation, environment variables, variable names, handler names, and redirect behavior. |
| Wishlist page if present | `src/components/Wishlist` | Replace wishlist item layout, grid/table styling, empty state, and action button presentation. | Existing wishlist state, add/remove logic, product data model, variable names, functions, and API calls if any. |
| Admin product table if present | NextMerce shop/list UI as broad visual inspiration only | Improve table/card styling, spacing, controls, filters, and responsive layout if appropriate. | Existing admin routes, product CRUD API calls, table data model, variable names, handler names, state, permissions, and backend behavior. |
| Admin product form if present | NextMerce form/card styling as broad visual inspiration only | Improve form layout, input styling, labels, image upload presentation, and action button styling. | Existing form state, validation, submit/update/delete handlers, API calls, field names, file upload behavior, and admin logic. |

For every area, replace only the UI markup/classes/layout. Keep existing props, API calls, variable names, functions, and state.

## 6. Safe Refactor Rules

When rebuilding a component:

1. Open the existing component first.
2. Identify all props.
3. Identify all imported logic/hooks/services.
4. Identify all state variables.
5. Identify all event handlers.
6. Keep all of them.
7. Replace only the returned JSX and styling.
8. Do not rename props.
9. Do not rename handlers.
10. Do not rename variables.
11. Do not change API response mapping unless absolutely necessary.
12. If mapping is needed, create a small adapter without changing backend response names.

The component should look different, but its behavioral contract should remain the same.

## 7. Data Compatibility Rules

NextMerce product objects may not match this project's product objects. The rebuilt UI must use the current project data model exactly.

Example current project shape:

```ts
product.id
product.name
product.price
product.image
product.description
product.category
```

The rebuilt UI must continue using those exact names if they are the current project names.

Do not convert them to:

```ts
product.title
product.slug
product.imgs
product.discountedPrice
```

unless this project already uses those names.

If the NextMerce UI expects different names, adapt the JSX to the current project names. Do not alter backend response names, API service names, state names, or TypeScript model names just to match the template.

## 8. Route Preservation Rules

Keep the existing route structure.

Do not rename routes unless the current project already uses the NextMerce-style route.

Examples:

- Do not change `/products` to `/shop` unless this project already uses `/shop`.
- Do not change `/product/:id` to `/shop-details` unless this project already uses that.
- Do not change `/cart`.
- Do not change `/checkout`.
- Do not change `/login`.
- Do not change `/register`.
- Do not change admin routes.

All navigation rebuilt with NextMerce styling must point to the existing project routes.

## 9. Styling Migration Plan

Styles should be migrated conservatively:

- Reuse compatible Tailwind classes from NextMerce.
- Copy required global CSS only if needed.
- Do not overwrite global styles blindly.
- Check for class conflicts.
- Keep the existing Tailwind config unless missing required values.
- Add NextMerce colors/screens only if needed.
- Copy images from NextMerce `public/images` only when used by the new UI.
- Do not import font files unless necessary.
- Do not expose or share font files.

If a NextMerce class depends on a custom Tailwind color, screen, font, or animation that does not exist in this project, either add only the required compatible config value or replace the class with an equivalent existing style.

## 10. Implementation Order

Future rebuild work must happen in this strict order:

Step 1:
Backup/check git status.

Step 2:
Inspect current frontend structure.

Step 3:
Copy only needed assets from NextMerce `public/images`.

Step 4:
Rebuild layout:

- Header.
- Footer.
- Main layout wrapper.

Step 5:
Rebuild homepage sections.

Step 6:
Rebuild product cards.

Step 7:
Rebuild product listing page.

Step 8:
Rebuild product details page.

Step 9:
Rebuild cart page.

Step 10:
Rebuild checkout page.

Step 11:
Rebuild auth pages.

Step 12:
Rebuild wishlist page if present.

Step 13:
Rebuild admin frontend pages if present, but keep admin logic.

Step 14:
Remove old unused components only after confirming they are no longer imported.

Step 15:
Run lint/build and fix errors.

## 11. Deletion Rules

Deleting old components must be done carefully.

Before deleting any old component:

1. Search for imports.
2. Confirm the new replacement exists.
3. Confirm the route still works.
4. Confirm API logic still works.
5. Confirm no build errors.
6. Only then delete.

Do not delete:

- API service files.
- Hooks.
- Context providers.
- Redux/Zustand stores if used by project logic.
- Auth utilities.
- Cart utilities.
- Type files used by API logic.
- Backend files.
- Env files.

Old UI components should only be deleted after the replacement is confirmed and no imports remain.

## 12. Verification Checklist

The following checklist must pass after future implementation:

- [ ] Home page loads.
- [ ] Products load from existing backend/API.
- [ ] Product cards display correct data.
- [ ] Product details page loads real product data.
- [ ] Add to cart still works.
- [ ] Remove from cart still works.
- [ ] Quantity update still works.
- [ ] Cart total is correct.
- [ ] Checkout still sends the correct request.
- [ ] Login still works.
- [ ] Register still works.
- [ ] Logout still works.
- [ ] Wishlist still works if present.
- [ ] Admin product CRUD still works if present.
- [ ] No API endpoint changed.
- [ ] No variable names changed.
- [ ] No TypeScript errors.
- [ ] No broken imports.
- [ ] No console errors.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes if available.
- [ ] Responsive design works on mobile/tablet/desktop.

## 13. Final Instruction For Future Coding

When implementation starts, do not rewrite the whole project in one shot.
Rebuild one area at a time.
After each area, run the app and verify that the existing logic still works.
The design should become NextMerce-inspired, but the project logic must remain mine.
