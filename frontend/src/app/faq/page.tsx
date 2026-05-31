import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { businessContact } from '@/lib/business-config';

export const metadata: Metadata = {
  title: 'FAQ',
  description: `Common questions about ordering from ${businessContact.name}.`,
};

const faqs = [
  {
    question: 'How do I place an order?',
    answer: 'Browse products, add items to your cart, open checkout, enter your phone and delivery address, then submit the cash-on-delivery order.',
  },
  {
    question: 'Do you support cash on delivery?',
    answer: 'Yes. The current checkout flow is built around cash on delivery. The store may contact you to confirm your order before dispatch.',
  },
  {
    question: 'How can I contact support?',
    answer: 'Use the contact page, phone, email, or WhatsApp support link. WhatsApp is usually the fastest option for order questions.',
  },
  {
    question: 'Can I cancel an order?',
    answer: 'Cancellation depends on the current order status. Contact support as soon as possible with your order number.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Delivery time depends on region, product availability, and courier capacity. The store should confirm timing after the order is reviewed.',
  },
  {
    question: 'Can I return a product?',
    answer: 'Returns depend on the final return policy, product condition, and delivery status. Review the return policy and contact support before sending anything back.',
  },
  {
    question: 'Are product prices final?',
    answer: 'Prices should be kept current, but product and pricing errors can happen. The store may contact you if an order needs correction before confirmation.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Signed-in customers can check their orders page. If tracking is not available yet, contact support with your order number.',
  },
];

export default function FaqPage() {
  return (
    <div className="animate-fade-in bg-bg-primary">
      <Container className="max-w-[920px] py-10 sm:py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">FAQ</p>
        <h1 className="text-3xl font-bold text-[#0B1B48] sm:text-4xl">Common customer questions</h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          Answers for small-business ecommerce ordering, delivery, returns, and support.
        </p>

        <div className="mt-8 space-y-4">
          {faqs.map((faq) => (
            <section key={faq.question} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <HelpCircle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#0B1B48]">{faq.question}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{faq.answer}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm leading-6 text-text-muted">
          Still need help? Visit the <Link href="/contact" className="font-medium text-accent hover:text-[#0B1B48]">contact page</Link>.
        </p>
      </Container>
    </div>
  );
}

