import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { businessContact } from '@/lib/business-config';

export const metadata: Metadata = {
  title: 'Terms',
  description: `Website terms for using ${businessContact.name}.`,
};

const terms = [
  {
    title: 'Using the website',
    text: 'Customers should use the store for lawful shopping, account access, cart management, and order placement. Misuse, unauthorized access, or attempts to disrupt the service may result in account or order restrictions.',
  },
  {
    title: 'Product availability',
    text: 'Products, stock, colors, specifications, and prices may change. The store should confirm availability before dispatching an order when stock or pricing needs manual verification.',
  },
  {
    title: 'Pricing changes',
    text: 'Prices are shown as clearly as possible, but errors can happen. If a pricing or product mistake is found after checkout, the store may contact the customer before confirming the order.',
  },
  {
    title: 'Order confirmation',
    text: 'Submitting an order does not always mean it has been dispatched. For small-business COD handling, the store may confirm the order by phone or message before delivery.',
  },
  {
    title: 'Cash on delivery',
    text: 'The current checkout flow supports cash on delivery. Customers pay when the order arrives unless another official payment method is added later.',
  },
  {
    title: 'Delivery limitations',
    text: 'Delivery availability, timing, and fees can vary by region, address, product size, and courier capacity.',
  },
  {
    title: 'Returns',
    text: 'Returns and replacements are handled according to the return policy and final business rules.',
  },
  {
    title: 'Account responsibility',
    text: 'Customers are responsible for keeping their account access secure and for providing accurate order, phone, and delivery information.',
  },
];

export default function TermsPage() {
  return (
    <div className="animate-fade-in bg-bg-primary">
      <Container className="max-w-[920px] py-10 sm:py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">Terms</p>
        <h1 className="text-3xl font-bold text-[#0B1B48] sm:text-4xl">Store terms and order conditions</h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          These terms are generic starter wording for a small ecommerce store. They should be reviewed and customized before launch.
        </p>

        <div className="mt-8 space-y-4">
          {terms.map((term) => (
            <section key={term.title} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0B1B48]">{term.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{term.text}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm leading-6 text-text-muted">
          For returns, review the <Link href="/return-policy" className="font-medium text-accent hover:text-[#0B1B48]">return policy</Link>. For support, contact the store through the <Link href="/contact" className="font-medium text-accent hover:text-[#0B1B48]">contact page</Link>.
        </p>
      </Container>
    </div>
  );
}

