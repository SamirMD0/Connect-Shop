import type { Metadata } from 'next';
import Link from 'next/link';
import { Headphones, PackageCheck, ShieldCheck, Store } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { businessContact } from '@/lib/business-config';

export const metadata: Metadata = {
  title: 'About',
  description: `Learn about ${businessContact.name}, a small-business ecommerce store for electronics and customer-focused service.`,
};

const values = [
  {
    title: 'Practical electronics',
    description: 'Products are organized for everyday shopping, from phones and laptops to accessories and home electronics.',
    icon: Store,
  },
  {
    title: 'Order confirmation',
    description: 'Cash-on-delivery orders can be confirmed with the customer before delivery is arranged.',
    icon: PackageCheck,
  },
  {
    title: 'Customer support',
    description: 'Customers can contact the store for product questions, delivery updates, and order support.',
    icon: Headphones,
  },
  {
    title: 'Trust first',
    description: 'The store should keep product details, contact information, and policies clear before accepting orders.',
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <div className="animate-fade-in bg-bg-primary">
      <Container className="max-w-[1170px] py-10 sm:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              About {businessContact.name}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-[#0B1B48] sm:text-4xl">
              A customer-ready ecommerce store for small-business retail.
            </h1>
            <p className="mt-5 text-base leading-7 text-text-muted">
              {businessContact.name} is designed as a practical online shop for electronics and related products. Customers can browse products, add items to cart, place cash-on-delivery orders, and contact the store for support.
            </p>
            <p className="mt-4 text-base leading-7 text-text-muted">
              The goal is to give a small business a clear storefront, reliable admin tools, and straightforward customer communication without starting as a complex marketplace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/store">
                <Button variant="primary" size="lg">Shop products</Button>
              </Link>
              <Link href="/contact">
                <Button variant="secondary" size="lg">Contact support</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg shadow-slate-200/50">
            <h2 className="text-xl font-bold text-[#0B1B48]">Store focus</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-text-muted">
              <li>Electronics catalog with product details, images, pricing, and stock information.</li>
              <li>Cash-on-delivery checkout built for local small-business order handling.</li>
              <li>Admin management for products, categories, homepage content, and orders.</li>
              <li>Support channels that customers can use before and after placing an order.</li>
            </ul>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-base font-bold text-[#0B1B48]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">{item.description}</p>
              </article>
            );
          })}
        </section>
      </Container>
    </div>
  );
}

