export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ELECTRO SHOP';
export const CART_STORAGE_KEY = 'elecshop_guest_cart';
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');
