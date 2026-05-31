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

