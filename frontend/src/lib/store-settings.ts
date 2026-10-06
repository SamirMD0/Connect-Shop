export interface StoreSettings {
  currency: string; locale: string; defaultCountry: string; taxRate: number; shippingDefault: string;
  freeShippingThreshold: string; shippingRegions: { name: string; cost: string }[];
}
export function formatStoreMoney(amount: number | string | null | undefined, currency?: string | null, locale = 'en-US', compact = false): string {
  const value = amount == null || amount === '' ? NaN : Number(amount);
  if (!Number.isFinite(value)) return 'Unavailable';
  if (!currency) return value.toFixed(2); // No fabricated currency during a settings outage.
  return new Intl.NumberFormat(locale, { style: 'currency', currency,
    minimumFractionDigits: compact && Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value);
}
