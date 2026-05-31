import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { businessContact } from '@/lib/business-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy information for shopping with ${businessContact.name}.`,
};

const sections = [
  {
    title: 'Information we collect',
    items: [
      'Account details such as name, email, and login information when you create an account.',
      'Order details such as recipient name, phone number, delivery address, products ordered, notes, and order status.',
      'Cart, wishlist, session, and authentication data needed to keep the store working.',
      'Basic technical data such as browser, device, and usage information that may appear in logs or analytics.',
    ],
  },
  {
    title: 'How information is used',
    items: [
      'To process orders, prepare delivery, and contact customers about cash-on-delivery confirmation.',
      'To manage customer accounts, carts, wishlists, and order history.',
      'To protect the store from abuse, fraud, spam, and unauthorized admin access.',
      'To improve product listings, support, and storefront performance.',
    ],
  },
  {
    title: 'Payment note',
    items: [
      'The current checkout flow supports cash on delivery. Customers should not enter card details on this website unless a future payment provider is officially added.',
      'Order payment status may be stored so the business can track pending, paid, cancelled, or delivery-related payment handling.',
    ],
  },
  {
    title: 'Cookies and sessions',
    items: [
      'The store may use cookies, tokens, local storage, or similar tools to keep users signed in and maintain cart behavior.',
      'Disabling browser storage may affect account, cart, wishlist, or checkout features.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy Policy"
      title="How customer information is handled"
      intro="This page provides general small-business ecommerce privacy wording. It should be reviewed and customized by the business owner before launch and is not legal advice."
      sections={sections}
    />
  );
}

function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; items: string[] }[];
}) {
  return (
    <div className="animate-fade-in bg-bg-primary">
      <Container className="max-w-[920px] py-10 sm:py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
        <h1 className="text-3xl font-bold text-[#0B1B48] sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-7 text-text-muted">{intro}</p>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0B1B48]">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm leading-6 text-text-muted">
          For privacy questions, contact <Link href="/contact" className="font-medium text-accent hover:text-[#0B1B48]">{businessContact.name} support</Link>.
        </p>
      </Container>
    </div>
  );
}

