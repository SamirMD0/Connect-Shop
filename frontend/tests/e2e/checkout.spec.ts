import { expect, test, type APIRequestContext } from '@playwright/test';

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  stock: number;
  variants?: Array<{
    id: string;
    stock: number;
  }>;
};

type ProductListResponse = {
  success: boolean;
  products?: ApiProduct[];
};

type ProductDetailResponse = {
  success: boolean;
  product?: ApiProduct;
};

const apiURL = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const configuredProductSlug = process.env.E2E_PRODUCT_SLUG;

async function getEligibleProduct(request: APIRequestContext) {
  if (configuredProductSlug) {
    const detail = await request.get(`${apiURL}/api/v1/products/${configuredProductSlug}`);
    expect(detail.ok(), `Configured E2E_PRODUCT_SLUG "${configuredProductSlug}" should resolve`).toBeTruthy();
    const data = await detail.json() as ProductDetailResponse;
    return isProductOrderable(data.product) ? data.product : null;
  }

  const response = await request.get(`${apiURL}/api/v1/products`, {
    params: {
      limit: '12',
      sort: 'newest',
    },
  });

  expect(response.ok(), 'Backend product API should be reachable for E2E checkout').toBeTruthy();
  const data = await response.json() as ProductListResponse;
  const products = data.products || [];

  for (const product of products) {
    if (!product.slug || product.stock <= 0) continue;

    const detail = await request.get(`${apiURL}/api/v1/products/${product.slug}`);
    if (!detail.ok()) continue;

    const detailData = await detail.json() as ProductDetailResponse;
    if (isProductOrderable(detailData.product)) {
      return detailData.product;
    }
  }

  return null;
}

function isProductOrderable(product?: ApiProduct | null): product is ApiProduct {
  if (!product || !product.id || !product.slug || product.stock <= 0) return false;
  const firstVariant = product.variants?.[0];
  return !firstVariant || firstVariant.stock > 0;
}

test.describe('guest cash-on-delivery checkout', () => {
  test('opens catalog, adds an in-stock product, and places a COD order', async ({ page, request }) => {
    const product = await getEligibleProduct(request);
    test.skip(!product, 'E2E checkout needs at least one in-stock seeded product with an orderable default variant.');

    await page.goto('/store');

    await expect(page.getByRole('heading', { name: /all products|results for/i })).toBeVisible();
    const productLink = page.getByRole('link', { name: product.name, exact: true }).first();
    await expect(productLink).toHaveAttribute('href', `/store/${product.slug}`);
    await page.goto(`/store/${product.slug}`);

    await expect(page).toHaveURL(new RegExp(`/store/${product.slug}$`));
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();

    await page.getByRole('button', { name: /^Add to Cart$/i }).click();
    await expect(page.getByText(/added to cart/i)).toBeVisible();

    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /review your cart/i })).toBeVisible();
    await expect(page.getByText(product.name).first()).toBeVisible();

    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { name: /delivery and review/i })).toBeVisible();

    await page.locator('input[name="guestEmail"]').fill('checkout-e2e@example.com');
    await page.locator('input[name="fullName"]').fill('Checkout E2E Customer');
    await page.locator('input[name="phone"]').fill('81 000 000');
    await page.locator('input[name="addressLine1"]').fill('123 Test Street');
    await page.locator('input[name="city"]').fill('Beirut');
    await page.locator('select[name="state"]').selectOption('Beirut');
    await page.locator('input[name="zipCode"]').fill('1100');
    await page.getByRole('checkbox', { name: /store terms/i }).check();

    await expect(page.getByText(/cash on delivery/i).first()).toBeVisible();
    await page.getByRole('button', { name: /place order/i }).click();

    await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/payment is collected on delivery/i)).toBeVisible();
    await expect(page.getByText(/Order ID:/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /contact via whatsapp/i })).toBeVisible();
  });
});
