'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createWhatsAppUrl } from '@/lib/business-config';

interface WhatsAppButtonProps {
  message?: string;
}

export function WhatsAppButton({
  message = 'Hello, I need help with an order.',
}: WhatsAppButtonProps) {
  const pathname = usePathname();

  if (pathname.startsWith('/admin') || pathname === '/cart' || pathname === '/checkout') {
    return null;
  }

  return (
    <a
      href={createWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact support on WhatsApp"
      title="Contact support on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-slate-900/20 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:ring-offset-2 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
