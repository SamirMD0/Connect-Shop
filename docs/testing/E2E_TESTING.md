# E2E Testing

This project uses Playwright for the critical customer checkout path.

## What The Test Covers

The current E2E test opens the storefront, views a product detail page, adds an item to the guest cart, proceeds to checkout, fills delivery details, submits a Cash on Delivery order, and verifies the order confirmation screen.

## Requirements

- Node.js and npm
- Playwright browsers
- Backend API running
- Frontend dev server running or available for Playwright to start
- PostgreSQL database migrated
- At least one in-stock product in the first store page, or `E2E_PRODUCT_SLUG` set to an orderable product slug

Install Playwright browsers after dependencies are installed:

```bash
cd frontend
npx playwright install
```

## Environment Variables

The test defaults to:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

Optional overrides:

```bash
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:5000
E2E_PRODUCT_SLUG=your-product-slug
E2E_FRONTEND_PORT=3000
```

`E2E_PRODUCT_SLUG` is recommended for stable production-like testing. The selected product must be in stock. If it has variants, the default first variant must also be in stock.

## Local Run Order

In one terminal, start the backend:

```bash
cd backend
npm run dev
```

In another terminal, run Playwright from the frontend directory:

```bash
cd frontend
npm run test:e2e
```

The Playwright config starts the frontend dev server automatically on port `3000` if one is not already running.

For interactive debugging:

```bash
cd frontend
npm run test:e2e:ui
```

## Test Data

`backend/src/db/seed.sql` currently does not create default catalog data. Before running the checkout E2E test, create or seed at least one visible in-stock product.

For a deterministic run, set:

```bash
E2E_PRODUCT_SLUG=existing-in-stock-product-slug
```

If no eligible product is found, the checkout test is skipped with a clear message instead of creating fake products.

## CI Notes

E2E tests are not wired into required CI yet. They depend on a running backend, PostgreSQL, and stable test catalog data. Add them to CI after a dedicated test database and seed workflow exist.

## Known Limitations

- The current test uses the real backend and creates a real guest COD order.
- The test does not fake checkout APIs.
- The test does not manage database cleanup yet.
- The test requires a product that can be ordered by a guest user.
