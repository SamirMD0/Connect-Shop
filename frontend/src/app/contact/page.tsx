import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Mail, MapPin, MessageCircle, Phone, Clock } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { businessContact, createWhatsAppUrl } from '@/lib/business-config';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact ${businessContact.name} for order support, delivery questions, and store assistance.`,
};

export default function ContactPage() {
  return (
    <div className="animate-fade-in bg-bg-primary">
      <Container className="max-w-[1170px] py-10 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Contact
          </p>
          <h1 className="text-3xl font-bold text-[#0B1B48] sm:text-4xl">
            Need help with an order?
          </h1>
          <p className="mt-4 text-base leading-7 text-text-muted">
            Reach the store for product questions, cash-on-delivery confirmation, and delivery coordination.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
            <h2 className="mb-6 text-xl font-bold text-[#0B1B48]">Store contact details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ContactItem
                icon={<Phone className="h-5 w-5" />}
                label="Phone"
                value={businessContact.phone}
                href={`tel:${businessContact.phone.replace(/[^\d+]/g, '')}`}
              />
              <ContactItem
                icon={<MessageCircle className="h-5 w-5" />}
                label="WhatsApp"
                value="Message support"
                href={createWhatsAppUrl('Hello, I need help with an order.')}
                external
              />
              <ContactItem
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                value={businessContact.email}
                href={`mailto:${businessContact.email}`}
              />
              <ContactItem
                icon={<Clock className="h-5 w-5" />}
                label="Working hours"
                value={businessContact.workingHours}
              />
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="flex gap-3 text-sm text-text-muted">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-text-primary">Address</p>
                  <p className="mt-1">{businessContact.address}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-[#25D366]/20 bg-[#25D366]/10 p-6 sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[#0B1B48]">Fast order support</h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              For cash-on-delivery orders, send your order number and delivery question on WhatsApp.
            </p>
            <a
              href={createWhatsAppUrl('Hello, I need help with an order.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex"
            >
              <Button variant="primary" size="lg" className="bg-[#25D366] text-white hover:bg-[#1ebd5a]">
                <MessageCircle className="mr-2 h-4 w-4" />
                Open WhatsApp
              </Button>
            </a>
            {businessContact.isPlaceholderContact && (
              <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs leading-5 text-text-muted">
                Replace the placeholder contact details in the business config before handing this store to a real client.
              </p>
            )}
          </aside>
        </div>
      </Container>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
  external = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </span>
        <span className="mt-1 block text-sm font-medium text-text-primary">{value}</span>
      </span>
    </>
  );

  if (!href) {
    return <div className="flex gap-3 rounded-xl border border-slate-100 p-4">{content}</div>;
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex gap-3 rounded-xl border border-slate-100 p-4 transition-colors hover:border-accent/40 hover:bg-blue-50"
    >
      {content}
    </a>
  );
}
