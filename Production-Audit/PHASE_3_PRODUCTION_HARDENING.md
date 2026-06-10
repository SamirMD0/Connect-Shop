# Phase 3: Production Hardening

## Goal
Improve database read speeds at scale, enforce strict database-level constraints for orphaned data, and implement automated End-to-End (E2E) tests.

## 1. Database Performance Indexes

Create a new migration file (e.g., `backend/migrations/003_add_performance_indexes.sql`) and run it against your database:

```sql
-- Speeds up the getCart() queries
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Speeds up category filtering on the store page
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Speeds up brand filtering
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Speeds up product detail page lookup
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Speeds up order history lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
```

## 2. Foreign Key Cascade Fixes

Currently, if an admin deletes a product, it might crash if a user has that product in their cart. Fix this by updating the constraint:

```sql
-- Drop the existing constraint
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

-- Re-add with CASCADE so deleting a product automatically removes it from abandoned carts
ALTER TABLE cart_items 
  ADD CONSTRAINT cart_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
```

## 3. End-to-End (E2E) Testing with Playwright

1. Install Playwright in the frontend:
   `cd frontend && npm init playwright@latest`

2. Create a test for the critical path: `frontend/tests/checkout.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Guest can add to cart and checkout via COD', async ({ page }) => {
  // 1. Go to store
  await page.goto('/store');
  
  // 2. Click first product
  await page.locator('.product-card').first().click();
  
  // 3. Add to cart
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByText('Item added to cart')).toBeVisible();
  
  // 4. Go to checkout
  await page.goto('/checkout');
  
  // 5. Fill shipping details
  await page.fill('input[name="fullName"]', 'Test User');
  await page.fill('input[name="phone"]', '03123456');
  await page.fill('input[name="addressLine1"]', '123 Test St');
  await page.fill('input[name="city"]', 'Beirut');
  await page.fill('input[name="country"]', 'Lebanon');
  
  // 6. Submit Order
  await page.getByRole('button', { name: 'Confirm Cash on Delivery' }).click();
  
  // 7. Verify Success
  await expect(page.getByText('Order Confirmed')).toBeVisible();
  await expect(page.getByText('Redirecting to WhatsApp')).toBeVisible();
});
```
