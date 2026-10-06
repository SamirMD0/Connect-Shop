import { z } from 'zod';

const optional = z.preprocess(value => typeof value === 'string' && !value.trim() ? undefined : value, z.string().trim().optional());
const flag = (fallback: 'true' | 'false') => z.enum(['true', 'false']).default(fallback).transform(value => value === 'true');
const money = (fallback: string) => z.string().regex(/^\d+(?:\.\d{1,2})?$/, 'Use a nonnegative amount with at most two decimals').default(fallback).transform(Number)
  .refine(value => Number.isFinite(value) && value <= 99999999.99, 'Amount is outside the supported range');
export const defaultShipping = { beirut: 3, 'mount lebanon': 4, north: 5, south: 5, bekaa: 5 };
export const customerEnvFields = {
  STORE_NAME: z.string().trim().min(1).max(100).refine(value => !/[<>\r\n]/.test(value), 'Store name must not contain email header delimiters').default('ELECTRO SHOP'),
  STORE_CURRENCY: z.string().trim().toUpperCase().default('USD').refine(value => {
    try { return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('currency').includes(value)
      && new Intl.NumberFormat('en-US', { style: 'currency', currency: value }).resolvedOptions().maximumFractionDigits === 2; }
    catch { return false; }
  }, 'Use a supported ISO currency with two decimal places; no currency conversion is performed'),
  STORE_LOCALE: z.string().default('en-US').refine(value => { try { new Intl.Locale(value); return true; } catch { return false; } }, 'Invalid locale'),
  STORE_DEFAULT_COUNTRY: z.string().trim().min(1).max(100).default('Lebanon'),
  STORE_TAX_RATE: z.string().regex(/^(?:0(?:\.\d{1,4})?|1(?:\.0{1,4})?)$/, 'Tax rate must be between 0 and 1 with at most four decimals').default('0.11').transform(Number),
  STORE_SHIPPING_DEFAULT: money('4'),
  STORE_FREE_SHIPPING_THRESHOLD: money('150'),
  STORE_SHIPPING_BY_REGION: z.preprocess(value => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  }, z.record(z.string().trim().min(1).max(100), z.number().finite().min(0).max(99999999.99)
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Shipping amounts require at most two decimals'))
    .default(defaultShipping).transform(value => Object.fromEntries(Object.entries(value).map(([name, cost]) => [name.trim().toLowerCase(), cost])))),
};
export const emailEnvFields = {
  EMAIL_MODE: z.enum(['disabled', 'mock', 'resend']).default('disabled'),
  EMAIL_AUTH_ENABLED: flag('true'),
  EMAIL_ORDER_CONFIRMATIONS_ENABLED: flag('true'),
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional.pipe(z.string().email().optional()),
  EMAIL_REPLY_TO: optional.pipe(z.string().email().optional()),
  EMAIL_SENDER_VERIFIED: flag('false'),
  EMAIL_TIMEOUT_MS: z.string().regex(/^\d+$/).default('5000').transform(Number).refine(value => value >= 1 && value <= 30000, 'Email timeout must be 1–30000 ms'),
};
export function validateEmailConfiguration(value: { NODE_ENV: string; EMAIL_MODE: string; EMAIL_AUTH_ENABLED: boolean; EMAIL_ORDER_CONFIRMATIONS_ENABLED: boolean;
  RESEND_API_KEY?: string; EMAIL_FROM?: string; EMAIL_SENDER_VERIFIED: boolean }, context: z.RefinementCtx) {
  const issue = (field: string, message: string) => context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
  if (value.NODE_ENV === 'production' && value.EMAIL_MODE === 'mock') issue('EMAIL_MODE', 'Mock email is restricted to development/test');
  const enabled = value.EMAIL_AUTH_ENABLED || value.EMAIL_ORDER_CONFIRMATIONS_ENABLED;
  if (value.NODE_ENV === 'production' && enabled && value.EMAIL_MODE !== 'resend') issue('EMAIL_MODE', 'Production email-dependent features require Resend delivery');
  if (value.EMAIL_MODE === 'resend' && enabled) {
    if (!value.RESEND_API_KEY || !/^re_[A-Za-z0-9_-]{8,}$/.test(value.RESEND_API_KEY)) issue('RESEND_API_KEY', 'A valid Resend API key is required');
    if (!value.EMAIL_FROM) issue('EMAIL_FROM', 'A customer sender email is required');
    if (value.NODE_ENV === 'production' && !value.EMAIL_SENDER_VERIFIED) issue('EMAIL_SENDER_VERIFIED', 'Confirm sender-domain verification before enabling production email');
  }
}
export const customerConfigSchema = z.object(customerEnvFields);
export const emailConfigSchema = z.object({ NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), ...emailEnvFields }).superRefine(validateEmailConfiguration);
