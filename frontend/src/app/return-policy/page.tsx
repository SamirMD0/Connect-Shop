import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { businessContact, createWhatsAppUrl } from '@/lib/business-config';

export const metadata: Metadata = {
  title: 'Return Policy',
  description: `Return and replacement policy information for ${businessContact.name}.`,
};

const policyItems = [
  {
    title: 'Return window',
    description: 'Returns should be requested within a business-defined return window after delivery. Replace this placeholder with the final number of days before launch.',
  },
  {
    title: 'Product condition',
    description: 'Returned products should be unused, complete, and in original packaging unless the item arrived damaged or incorrect.',
  },
  {
    title: 'Damaged or wrong item',
    description: 'If an item arrives damaged or different from the order, contact support with the order number and clear photos as soon as possible.',
  },
  {
    title: 'Refunds or replacement',
    description: 'Eligible orders may be replaced, repaired, exchanged, or refunded according to the final business policy.',
  },
  {
    title: 'Cash-on-delivery orders',
    description: 'For COD orders, the store may need to confirm payment and delivery status before approving a return or replacement.',
  },
];

export default function ReturnPolicyPage() {
  return (
    <div className="animate-fade-in bg-bg-primary">
      <Container className="max-w-[920px] py-10 sm:py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">Return Policy</p>
        <h1 className="text-3xl font-bold text-[#0B1B48] sm:text-4xl">Returns, replacements, and damaged items</h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          This policy is a practical starting point for a small ecommerce store. The final return window, warranty handling, and refund rules should be customized by the business owner before accepting real orders.
        </p>

        <div className="mt-8 grid gap-4">
          {policyItems.map((item) => (
            <section key={item.title} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0B1B48]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{item.description}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/10 p-6">
          <h2 className="text-lg font-bold text-[#0B1B48]">Need help with a return?</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Send your order number and return reason to support so the store can review the request.
          </p>
          <a
            href={createWhatsAppUrl('Hello, I need help with a return request.')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex"
          >
            <Button variant="primary" className="bg-[#25D366] text-white hover:bg-[#1ebd5a]">
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact on WhatsApp
            </Button>
          </a>
          <p className="mt-4 text-xs text-text-muted">
            You can also use the <Link href="/contact" className="font-medium text-accent hover:text-[#0B1B48]">contact page</Link>.
          </p>
        </div>
      </Container>
    </div>
  );
}

