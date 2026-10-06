import { APP_NAME } from './constants';

const placeholderWhatsAppNumber = '+96100000000';

export const businessContact = {
  name: APP_NAME,
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+961 00 000 000',
  whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || placeholderWhatsAppNumber,
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'support@example.com',
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Lebanon',
  workingHours: process.env.NEXT_PUBLIC_BUSINESS_HOURS || 'Monday to Saturday, 9:00 AM - 8:00 PM',
  isPlaceholderContact: !process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP,
};

export function getWhatsAppNumberForUrl(phone = businessContact.whatsapp) {
  return phone.replace(/[^\d]/g, '');
}

export function createWhatsAppUrl(message: string, phone = businessContact.whatsapp) {
  return `https://wa.me/${getWhatsAppNumberForUrl(phone)}?text=${encodeURIComponent(message)}`;
}


const color = (value: string | undefined, fallback: string) => value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export const businessBrand = {
  title: process.env.NEXT_PUBLIC_META_TITLE || `${APP_NAME} — Premium Electronics Store`,
  description: process.env.NEXT_PUBLIC_META_DESCRIPTION || 'Shop smartphones, laptops, audio gear, appliances, gaming accessories, and more with cash-on-delivery support.',
  keywords: process.env.NEXT_PUBLIC_META_KEYWORDS?.split(',').map(value => value.trim()).filter(Boolean) || ['electronics store', 'online electronics shop', 'cash on delivery', APP_NAME],
  colors: {
    '--color-accent': color(process.env.NEXT_PUBLIC_COLOR_ACCENT, '#2563eb'),
    '--color-accent-hover': color(process.env.NEXT_PUBLIC_COLOR_ACCENT_HOVER, '#1d4ed8'),
    '--color-accent-glow': color(process.env.NEXT_PUBLIC_COLOR_ACCENT_GLOW, '#60a5fa'),
    '--color-bg-primary': color(process.env.NEXT_PUBLIC_COLOR_BACKGROUND, '#f8fafc'),
    '--color-bg-surface': color(process.env.NEXT_PUBLIC_COLOR_SURFACE, '#ffffff'),
    '--color-bg-elevated': color(process.env.NEXT_PUBLIC_COLOR_ELEVATED, '#f1f5f9'),
    '--color-text-primary': color(process.env.NEXT_PUBLIC_COLOR_TEXT, '#0f172a'),
    '--color-text-muted': color(process.env.NEXT_PUBLIC_COLOR_MUTED, '#64748b'),
    '--color-border': color(process.env.NEXT_PUBLIC_COLOR_BORDER, '#e2e8f0'),
  },
};
