# NEXTMERCE DEMO PARITY AUDIT

## 1. Goal

The goal is to make my frontend visually match the NextMerce demo website as closely as possible while preserving my project logic.

The UI/design should match NextMerce.
The behavior/data/API/backend logic must remain mine.

The live demo reviewed for visual parity is:

- `https://demo.nextmerce.com/`

The downloaded local template reviewed for implementation reference is:

- `nextjs-ecommerce-template-main`

## 2. Strict Rules

- Do not change backend files.
- Do not change API services.
- Do not change endpoint URLs.
- Do not change request/response logic.
- Do not change variable names.
- Do not change function names.
- Do not change state names.
- Do not change product/cart/auth/order models.
- Do not replace real backend data with NextMerce static data.
- Do not add Sanity, Stripe, Clerk, NextAuth, Medusa, or external backend services.
- Do not create a second cart system.
- Do not create a second auth system.
- Do not rename routes.
- Do not rewrite business logic.
- Only rebuild visual UI, layout, JSX structure, Tailwind classes, spacing, responsive behavior, and assets.

## 3. Demo Homepage Structure To Match

The homepage must visually follow the NextMerce demo structure in this order:

1. Header top area:
   - Logo.
   - Category dropdown / “All Categories”.
   - Search input if available in template/current project.
   - Sign In / Register.
   - Wishlist icon/link.
   - Cart icon with count.

2. Main navigation:
   - Popular.
   - Shop.
   - Contact.
   - Pages dropdown.
   - Blogs dropdown if template has it.
   - Best Selling SALE badge/link.

3. Hero area:
   - Main hero card for “Apple Watch Ultra” style promo.
   - Secondary promo card for “Apple AirPods Max”.
   - Third promo card for “iPhone 16 Pro Max”.
   - Use the actual NextMerce hero layout from the downloaded template.
   - Text/images can be adapted if needed, but layout must match.

4. Side promo cards:
   - Smart Security Home Camera style card.
   - Galaxy S24 Ultra style card.

5. Service feature row:
   - Free Shipping.
   - 1 & 1 Returns.
   - 100% Secure Payments.
   - 24/7 Dedicated Support.

6. Browse by Category section:
   - Match NextMerce category card layout.
   - Use my category data if available.
   - If no category data exists, use static display-only categories without affecting backend logic.

7. New Arrivals section:
   - Product grid must match NextMerce card design.
   - Use my existing product data and field names.
   - Keep my add-to-cart handler.
   - Keep my product detail route.

8. Large promo section:
   - iPhone 14 Plus / UP TO 30% OFF style banner.
   - Foldable treadmill / Workout At Home style smaller banner.
   - Apple Watch Ultra / Up to 40% off style banner.

9. Best Sellers section:
   - Match NextMerce horizontal/card style.
   - Use my existing product data if available.
   - Do not use NextMerce static product data as logic.

10. Countdown promo section:
   - “Enhance Your Music Experience” style section.
   - Countdown can be static UI if my project has no countdown logic.
   - Do not add complex logic unless already present.

11. User Feedbacks:
   - Match testimonial carousel/card style.
   - Static testimonials are acceptable because they are display content, not business logic.

12. Newsletter section:
   - Match NextMerce newsletter visual layout.
   - If my project has no newsletter logic, make it UI-only or disabled form.
   - Do not add backend/API logic.

13. Footer:
   - Help & Support.
   - Account.
   - Quick Link.
   - Download App.
   - Payment icons.
   - Copyright.
   - Match NextMerce footer layout.

## 4. Current UI vs Demo Gap Table

| Current Area | Current Problem | NextMerce Demo Target | Files To Change | Logic To Preserve |
| --- | --- | --- | --- | --- |
| Header | Current header is visually simplified and branded as a generic electronics store. It lacks the exact NextMerce commerce header layout and spacing. | Match `src/components/Header/index.tsx`: logo, category selector, search bar, account block, cart count block, and white fixed header styling. | `frontend/src/components/layout/Navbar.tsx`, possibly `frontend/src/components/layout/MobileMenu.tsx` | `useAuth`, `loading`, `user`, `mobileOpen`, `categories`, `parentCategories`, category API call, auth indicators, cart indicator, wishlist indicator. |
| Navbar | Current nav labels are Home/Store/Orders/Wishlist/Dashboard, not the demo labels. Dropdown styling is not the same as NextMerce. | Match demo secondary nav: Popular, Shop, Contact, pages dropdown, blogs dropdown, and Best Selling SALE link. Preserve actual project routes behind those labels. | `frontend/src/components/layout/Navbar.tsx` | Existing route destinations must remain valid. Do not rename `/store`, `/cart`, `/wishlist`, `/orders`, `/admin`, auth routes, or handlers. |
| Hero | Current hero uses a broad image carousel and two featured cards, not the demo’s specific white-card hero composition. | Match `src/components/Home/Hero/index.tsx` and `HeroCarousel.tsx`: light `#E5EAF4` background, large rounded white hero card, product image placement, pagination, two side promo cards. | `frontend/src/app/page.tsx`, `frontend/src/components/home/HeroCarousel.tsx`, possibly a new homepage-only visual component | Keep `slides`, `featured`, `trending`, `categories`, real product links, and existing API fetches. |
| Promo cards | Current promo tiles are generic image overlay cards. | Match demo side cards: Smart Security Home Camera and Galaxy S24 Ultra cards with white backgrounds, product image on right, save amount text. | `frontend/src/app/page.tsx`, `frontend/src/components/home/PromoTiles.tsx` | Display-only promo content can be static. No backend/API changes. |
| Service feature row | Current row uses generic delivery/top rated/category cards. | Match `HeroFeature.tsx`: four compact service features with icon images and text: Free Shipping, 1 & 1 Returns, 100% Secure Payments, 24/7 Dedicated Support. | `frontend/src/app/page.tsx`, possibly `frontend/src/components/home/ValueProps.tsx` | Existing page data variables and route links. No API/service changes. |
| Category section | Current category cards are larger, rounded, generic cards and not a carousel-like NextMerce category strip. | Match `src/components/Home/Categories/index.tsx` and `SingleItem.tsx`: section heading style, category item image, compact card, navigation arrows if practical. | `frontend/src/app/page.tsx`, possible category visual component | Use current `categories` data and fields: `cat.id`, `cat.name`, `cat.slug`, `cat.image_url`, `cat.product_count`. |
| Product card | Current product card is a modern generic card with badges and overlay actions, not the NextMerce card. | Match `src/components/Common/ProductItem.tsx`: light gray product image area, Add to cart overlay button, title, price/compare price, rating/actions where useful. | `frontend/src/components/products/ProductCard.tsx` | Keep `product` prop, `Product` type, `handleWishlist`, `handleAddToCart`, `handleCompare`, `addItem`, `toggleWishlist`, `isInWishlist`, `addToast`, product detail link `/store/${product.slug}`. |
| New Arrivals | Current section is titled “New arrivals and featured products” and uses generic grid styling. | Match `src/components/Home/NewArrivals/index.tsx`: “This Week’s” eyebrow, “New Arrivals” title, View All button, NextMerce card grid. | `frontend/src/app/page.tsx`, `frontend/src/components/products/ProductCard.tsx` | Use existing `featured` products or existing backend product array. Do not import `shopData` as live logic. |
| Promo banners | Current promo tiles are before products and do not match the demo’s large promo banner section. | Match `src/components/Home/PromoBanner/index.tsx`: one large iPhone 14 Plus banner and two smaller banners below. | `frontend/src/app/page.tsx`, `frontend/src/components/home/PromoTiles.tsx` or a new promo banner visual component | Promo text/assets may be static display content. Routes should remain existing `/store` routes. |
| Best Sellers | Current trending section uses the same generic product grid as featured products. | Match `src/components/Home/BestSeller/index.tsx` and `SingleItem.tsx`: compact horizontal seller cards, image on one side, title and prices on the other, View All button. | `frontend/src/app/page.tsx`, possible homepage-only best seller component | Use existing `trending` array from backend. Keep product field names and detail routes. |
| Countdown section | Current homepage has no NextMerce countdown promo. | Match `src/components/Home/Countdown/index.tsx`: “Don’t Miss!!”, “Enhance Your Music Experience”, static 00 Days/Hours/Minutes/Seconds blocks, product image and shape background. | `frontend/src/app/page.tsx`, possible new homepage-only countdown component | Countdown can be static UI. Do not add backend timers or external logic. |
| Testimonials | Current homepage has no testimonial carousel/cards. | Match `src/components/Home/Testimonials/index.tsx` and `SingleItem.tsx`: User Feedbacks heading, star icons, testimonial cards, user names/roles. | `frontend/src/app/page.tsx`, possible new homepage-only testimonials component | Static testimonials are display content only. No API/backend changes. |
| Newsletter | Current newsletter is a dark generic card, not NextMerce. | Match `src/components/Common/Newsletter.tsx`: background illustration, “Don't Miss Out Latest Trends & Offers”, input/button visual structure. | `frontend/src/components/home/Newsletter.tsx` or replace with adapted NextMerce newsletter visual | Preserve local `email`, `submitted`, and `handleSubmit` if keeping current UI-only form. Do not add backend newsletter API. |
| Footer | Current footer approximates ecommerce layout but is not NextMerce footer. | Match `src/components/Footer/index.tsx`: Help & Support, Account, Quick Link, Download App, payment icons, exact spacing, bottom bar. | `frontend/src/components/layout/Footer.tsx` | Preserve existing links/routes where available, `APP_NAME`, and any existing static link config. |
| Cart sidebar/modal if present | Current project has cart page/icon; NextMerce demo displays cart sidebar modal. Current layout does not visually match that modal. | Match `src/components/Common/CartSidebarModal/index.tsx`, `SingleItem.tsx`, `EmptyCart.tsx` only if current project supports cart sidebar behavior. | Existing cart modal/sidebar component if present; otherwise no Phase 8 code until support exists | Preserve current cart context/hooks, item count, add/remove/update logic, and route `/cart`. Do not copy NextMerce Redux cart slice. |

## 5. Files From Downloaded NextMerce Template To Inspect

Exact files found in the downloaded NextMerce folder:

Header components:

- `nextjs-ecommerce-template-main/src/components/Header/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Header/Dropdown.tsx`
- `nextjs-ecommerce-template-main/src/components/Header/CustomSelect.tsx`
- `nextjs-ecommerce-template-main/src/components/Header/menuData.ts`

Footer components:

- `nextjs-ecommerce-template-main/src/components/Footer/index.tsx`

Home components:

- `nextjs-ecommerce-template-main/src/components/Home/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Hero/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Hero/HeroCarousel.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Hero/HeroFeature.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Categories/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Categories/SingleItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Categories/categoryData.ts`
- `nextjs-ecommerce-template-main/src/components/Home/NewArrivals/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/PromoBanner/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/BestSeller/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/BestSeller/SingleItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Countdown/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Testimonials/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Testimonials/SingleItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Testimonials/testimonialsData.ts`

Hero components:

- `nextjs-ecommerce-template-main/src/components/Home/Hero/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Hero/HeroCarousel.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Hero/HeroFeature.tsx`

Promo/banner components:

- `nextjs-ecommerce-template-main/src/components/Home/PromoBanner/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Countdown/index.tsx`

Category components:

- `nextjs-ecommerce-template-main/src/components/Home/Categories/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Categories/SingleItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Categories/categoryData.ts`

Product card components:

- `nextjs-ecommerce-template-main/src/components/Common/ProductItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Shop/SingleGridItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Shop/SingleListItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Shop/shopData.ts`

Best seller components:

- `nextjs-ecommerce-template-main/src/components/Home/BestSeller/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/BestSeller/SingleItem.tsx`

Countdown components:

- `nextjs-ecommerce-template-main/src/components/Home/Countdown/index.tsx`

Testimonial components:

- `nextjs-ecommerce-template-main/src/components/Home/Testimonials/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Testimonials/SingleItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Home/Testimonials/testimonialsData.ts`

Newsletter components:

- `nextjs-ecommerce-template-main/src/components/Common/Newsletter.tsx`

Cart sidebar/modal components:

- `nextjs-ecommerce-template-main/src/components/Common/CartSidebarModal/index.tsx`
- `nextjs-ecommerce-template-main/src/components/Common/CartSidebarModal/SingleItem.tsx`
- `nextjs-ecommerce-template-main/src/components/Common/CartSidebarModal/EmptyCart.tsx`
- `nextjs-ecommerce-template-main/src/app/context/CartSidebarModalContext.tsx`

Global CSS:

- `nextjs-ecommerce-template-main/src/app/css/style.css`
- `nextjs-ecommerce-template-main/src/app/css/euclid-circular-a-font.css`
- `nextjs-ecommerce-template-main/src/app/css/async-gallery.css`

Tailwind config:

- `nextjs-ecommerce-template-main/tailwind.config.ts`

Public images used by those sections:

- `nextjs-ecommerce-template-main/public/images/logo/logo.svg`
- `nextjs-ecommerce-template-main/public/images/hero/hero-01.png`
- `nextjs-ecommerce-template-main/public/images/hero/hero-02.png`
- `nextjs-ecommerce-template-main/public/images/hero/hero-03.png`
- `nextjs-ecommerce-template-main/public/images/hero/hero-bg.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-01.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-02.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-03.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-04.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-05.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-06.png`
- `nextjs-ecommerce-template-main/public/images/categories/categories-07.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-01.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-02.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-03.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-04.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-05.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-06.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-07.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-08.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-09.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-10.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-11.png`
- `nextjs-ecommerce-template-main/public/images/arrivals/arrivals-12.png`
- `nextjs-ecommerce-template-main/public/images/promo/promo-01.png`
- `nextjs-ecommerce-template-main/public/images/promo/promo-02.png`
- `nextjs-ecommerce-template-main/public/images/promo/promo-03.png`
- `nextjs-ecommerce-template-main/public/images/sellers/sellers-01.png`
- `nextjs-ecommerce-template-main/public/images/sellers/sellers-02.png`
- `nextjs-ecommerce-template-main/public/images/sellers/sellers-03.png`
- `nextjs-ecommerce-template-main/public/images/sellers/sellers-04.png`
- `nextjs-ecommerce-template-main/public/images/sellers/sellers-05.png`
- `nextjs-ecommerce-template-main/public/images/sellers/sellers-06.png`
- `nextjs-ecommerce-template-main/public/images/countdown/countdown-01.png`
- `nextjs-ecommerce-template-main/public/images/countdown/countdown-bg.png`
- `nextjs-ecommerce-template-main/public/images/users/user-01.jpg`
- `nextjs-ecommerce-template-main/public/images/users/user-02.jpg`
- `nextjs-ecommerce-template-main/public/images/users/user-03.jpg`
- `nextjs-ecommerce-template-main/public/images/users/user-04.jpg`
- `nextjs-ecommerce-template-main/public/images/shapes/newsletter-bg.jpg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-01.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-02.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-03.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-04.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-05.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-06.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-07.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-08.svg`
- `nextjs-ecommerce-template-main/public/images/icons/icon-star.svg`
- `nextjs-ecommerce-template-main/public/images/payment/payment-01.svg`
- `nextjs-ecommerce-template-main/public/images/payment/payment-02.svg`
- `nextjs-ecommerce-template-main/public/images/payment/payment-03.svg`
- `nextjs-ecommerce-template-main/public/images/payment/payment-04.svg`
- `nextjs-ecommerce-template-main/public/images/payment/payment-05.svg`
- `nextjs-ecommerce-template-main/public/images/cart/cart-01.png`
- `nextjs-ecommerce-template-main/public/images/cart/cart-02.png`
- `nextjs-ecommerce-template-main/public/images/cart/cart-03.png`

## 6. Asset Copy Plan

Copy only assets that are used by rebuilt visual sections. Do not copy the whole NextMerce `public` folder.

Destination:

- `frontend/public/nextmerce/`

Copy plan:

- Header/footer:
  - `images/logo/logo.svg` to `frontend/public/nextmerce/logo/logo.svg`
  - `images/payment/payment-01.svg` to `frontend/public/nextmerce/payment/payment-01.svg`
  - `images/payment/payment-02.svg` to `frontend/public/nextmerce/payment/payment-02.svg`
  - `images/payment/payment-03.svg` to `frontend/public/nextmerce/payment/payment-03.svg`
  - `images/payment/payment-04.svg` to `frontend/public/nextmerce/payment/payment-04.svg`
  - `images/payment/payment-05.svg` to `frontend/public/nextmerce/payment/payment-05.svg`

- Hero and side promo visuals:
  - `images/hero/hero-bg.png` to `frontend/public/nextmerce/hero/hero-bg.png`
  - `images/hero/hero-01.png` to `frontend/public/nextmerce/hero/hero-01.png`
  - `images/hero/hero-02.png` to `frontend/public/nextmerce/hero/hero-02.png`
  - `images/hero/hero-03.png` to `frontend/public/nextmerce/hero/hero-03.png`

- Service feature icons:
  - `images/icons/icon-01.svg` to `frontend/public/nextmerce/icons/icon-01.svg`
  - `images/icons/icon-02.svg` to `frontend/public/nextmerce/icons/icon-02.svg`
  - `images/icons/icon-03.svg` to `frontend/public/nextmerce/icons/icon-03.svg`
  - `images/icons/icon-04.svg` to `frontend/public/nextmerce/icons/icon-04.svg`
  - `images/icons/icon-07.svg` to `frontend/public/nextmerce/icons/icon-07.svg`
  - `images/icons/icon-star.svg` to `frontend/public/nextmerce/icons/icon-star.svg`

- Category fallback/display images:
  - `images/categories/categories-01.png` to `frontend/public/nextmerce/categories/categories-01.png`
  - `images/categories/categories-02.png` to `frontend/public/nextmerce/categories/categories-02.png`
  - `images/categories/categories-03.png` to `frontend/public/nextmerce/categories/categories-03.png`
  - `images/categories/categories-04.png` to `frontend/public/nextmerce/categories/categories-04.png`
  - `images/categories/categories-05.png` to `frontend/public/nextmerce/categories/categories-05.png`
  - `images/categories/categories-06.png` to `frontend/public/nextmerce/categories/categories-06.png`
  - `images/categories/categories-07.png` to `frontend/public/nextmerce/categories/categories-07.png`

- Promo banners:
  - `images/promo/promo-01.png` to `frontend/public/nextmerce/promo/promo-01.png`
  - `images/promo/promo-02.png` to `frontend/public/nextmerce/promo/promo-02.png`
  - `images/promo/promo-03.png` to `frontend/public/nextmerce/promo/promo-03.png`

- Countdown:
  - `images/countdown/countdown-bg.png` to `frontend/public/nextmerce/countdown/countdown-bg.png`
  - `images/countdown/countdown-01.png` to `frontend/public/nextmerce/countdown/countdown-01.png`

- Testimonials:
  - `images/users/user-01.jpg` to `frontend/public/nextmerce/users/user-01.jpg`
  - `images/users/user-02.jpg` to `frontend/public/nextmerce/users/user-02.jpg`
  - `images/users/user-03.jpg` to `frontend/public/nextmerce/users/user-03.jpg`
  - `images/users/user-04.jpg` to `frontend/public/nextmerce/users/user-04.jpg`

- Newsletter:
  - `images/shapes/newsletter-bg.jpg` to `frontend/public/nextmerce/shapes/newsletter-bg.jpg`

- Cart sidebar only if Phase 8 is implemented:
  - `images/cart/cart-01.png` to `frontend/public/nextmerce/cart/cart-01.png`
  - `images/cart/cart-02.png` to `frontend/public/nextmerce/cart/cart-02.png`
  - `images/cart/cart-03.png` to `frontend/public/nextmerce/cart/cart-03.png`

Do not copy product images from `images/arrivals` or `images/sellers` for live product cards unless a display-only fallback is needed. Real product sections should use backend product images from my current product data.

Rules:

- Do not copy the entire public folder blindly.
- Copy only used images.
- Do not overwrite existing project images unless safe.
- Put copied assets in `frontend/public/nextmerce/`.
- Update image paths safely.
- Do not change backend image logic for real products.

## 7. Component Rebuild Plan

### Header

- Replace visual structure with NextMerce header.
- Preserve my auth logic.
- Preserve my cart count logic.
- Preserve my wishlist logic if present.
- Preserve my route links.
- Do not change handlers or state names.
- Use `Header/index.tsx`, `CustomSelect.tsx`, `Dropdown.tsx`, and `menuData.ts` as visual references only.
- Keep the current category API fetch and adapt it into the “All Categories” UI.
- Keep the current `MobileMenu` behavior but make its visual layout match NextMerce mobile navigation.
- Do not copy NextMerce `useCartModalContext`, Redux selectors, `selectTotalPrice`, or NextAuth behavior.

### Home

- Rebuild homepage section order to match the demo.
- Use display-only promo content where needed.
- Use existing backend products for product sections.
- Preserve loading/error states.
- Preserve `featured`, `trending`, `categories`, `slides`, and existing API fetch calls.
- Use `src/components/Home/index.tsx` order as the authoritative structure:
  - Hero.
  - Categories.
  - NewArrivals.
  - PromoBanner.
  - BestSeller.
  - Countdown.
  - Testimonials.
  - Newsletter.
- Add the demo service feature row inside/after the Hero area using `HeroFeature.tsx`.
- Keep all route targets aligned to existing project routes such as `/store`, `/store?category=...`, `/store/${product.slug}`, `/cart`, `/wishlist`, and existing auth routes.

### ProductCard

- Match NextMerce product card design.
- Keep existing props exactly.
- Keep existing field names exactly.
- Keep add-to-cart handler exactly.
- Keep detail link route exactly.
- Adapt `ProductItem.tsx` visual structure to my `Product` model:
  - Use `product.id`.
  - Use `product.name`.
  - Use `product.price`.
  - Use `product.image_url`.
  - Use `product.compare_at_price`.
  - Use `product.slug`.
  - Use `product.rating`.
  - Use `product.review_count`.
  - Use `product.stock`.
- Do not rename fields to NextMerce names like `title`, `imgs`, or `discountedPrice`.
- Keep `handleAddToCart`, `handleWishlist`, `handleCompare`, `wishlisted`, and `isCompared` unchanged as logic.

### Footer

- Match NextMerce footer.
- Preserve existing links/routes.
- Use static support/download/payment visuals if needed.
- Use `Footer/index.tsx` as the visual structure:
  - Help & Support.
  - Account.
  - Quick Link.
  - Download App.
  - Payment icons.
  - Bottom copyright bar.
- Use `APP_NAME` where project branding is required, but match NextMerce spacing, columns, typography, and icon placement.

## 8. Future Implementation Order

After this audit is created, implementation must happen in small phases:

Phase 1:
Header + navigation only.

Phase 2:
Hero + promo cards only.

Phase 3:
Service feature row + Browse by Category only.

Phase 4:
ProductCard + New Arrivals only.

Phase 5:
Promo banners + Best Sellers only.

Phase 6:
Countdown + Testimonials + Newsletter only.

Phase 7:
Footer only.

Phase 8:
Cart sidebar/modal only if current project supports it.

After each phase:

- Run build/lint if available.
- Fix errors.
- Confirm no backend/API files changed.
- Confirm no variable/function/state names changed.
- Confirm existing logic still works.

## 9. Final Rule

The final frontend should visually match the NextMerce demo, not just be inspired by it.

Use the downloaded NextMerce template as the source for JSX structure, Tailwind classes, spacing, image placement, and section order.

But keep my project logic untouched.
