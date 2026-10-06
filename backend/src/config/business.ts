import { env } from './env';
import { customerConfigSchema } from './customerConfig';
const defaults = customerConfigSchema.parse({});

// One backend source of monetary rules. Defaults preserve the existing COD store.
export const businessRules = {
  name: env.STORE_NAME ?? defaults.STORE_NAME, currency: env.STORE_CURRENCY ?? defaults.STORE_CURRENCY, locale: env.STORE_LOCALE ?? defaults.STORE_LOCALE,
  defaultCountry: env.STORE_DEFAULT_COUNTRY ?? defaults.STORE_DEFAULT_COUNTRY, taxRate: env.STORE_TAX_RATE ?? defaults.STORE_TAX_RATE,
  shippingDefault: env.STORE_SHIPPING_DEFAULT ?? defaults.STORE_SHIPPING_DEFAULT, freeShippingThreshold: env.STORE_FREE_SHIPPING_THRESHOLD ?? defaults.STORE_FREE_SHIPPING_THRESHOLD,
  shippingByRegion: env.STORE_SHIPPING_BY_REGION ?? defaults.STORE_SHIPPING_BY_REGION,
};
export function publicBusinessSettings() {
  return { currency: businessRules.currency, locale: businessRules.locale, defaultCountry: businessRules.defaultCountry,
    taxRate: businessRules.taxRate, shippingDefault: businessRules.shippingDefault.toFixed(2),
    freeShippingThreshold: businessRules.freeShippingThreshold.toFixed(2),
    shippingRegions: Object.entries(businessRules.shippingByRegion).map(([name, cost]) => ({ name, cost: cost.toFixed(2) })) };
}
export const roundMoney = (value: number) => Math.round(value * 100) / 100;
export function checkoutTotals(subtotal: number, discount: number, region: string) {
  const taxable = Math.max(0, subtotal - discount);
  const tax = roundMoney(taxable * businessRules.taxRate);
  // Preserve existing eligibility: free shipping uses pre-discount subtotal.
  const key = region.trim().toLowerCase();
  const regionalCost = Object.prototype.hasOwnProperty.call(businessRules.shippingByRegion, key) ? businessRules.shippingByRegion[key] : businessRules.shippingDefault;
  const shipping = subtotal >= businessRules.freeShippingThreshold ? 0 : regionalCost;
  return { subtotal, discount, tax, shipping, total: roundMoney(taxable + tax + shipping), currency: businessRules.currency };
}
