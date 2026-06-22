import Link from 'next/link';
import { Container } from './Container';
import { APP_NAME } from '@/lib/constants';
import { businessContact, createWhatsAppUrl } from '@/lib/business-config';
import { Mail, MapPin, MessageCircle, Phone, Truck, WalletCards, Zap } from 'lucide-react';

const footerSections = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', href: '/store' },
      { label: 'Best sellers', href: '/store?sort=rating' },
      { label: 'Shopping cart', href: '/cart' },
      { label: 'Wishlist', href: '/wishlist' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My account', href: '/account' },
      { label: 'My orders', href: '/orders' },
      { label: 'Sign in', href: '/auth/login' },
      { label: 'Create account', href: '/auth/register' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact us', href: '/contact' },
      { label: 'Frequently asked questions', href: '/faq' },
      { label: 'Return policy', href: '/return-policy' },
      { label: 'Privacy policy', href: '/privacy-policy' },
      { label: 'Terms of use', href: '/terms' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-white">
      <Container className="max-w-[1170px]">
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] lg:gap-12 lg:py-16">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3" aria-label={`${APP_NAME} home`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white">
                <Zap className="h-5 w-5" fill="currentColor" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold text-text-primary">{APP_NAME}</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-text-muted">
              Electronics with fast local delivery, practical support, and Cash on Delivery.
            </p>

            <address className="mt-6 space-y-3 text-sm not-italic text-text-secondary">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <span>{businessContact.address}</span>
              </p>
              <a
                href={`tel:${businessContact.phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-3 transition-colors hover:text-accent"
              >
                <Phone className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                {businessContact.phone}
              </a>
              <a
                href={`mailto:${businessContact.email}`}
                className="flex items-center gap-3 transition-colors hover:text-accent"
              >
                <Mail className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                {businessContact.email}
              </a>
              <a
                href={createWhatsAppUrl('Hello, I need help with an order.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition-colors hover:text-accent"
              >
                <MessageCircle className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                WhatsApp support
              </a>
            </address>
          </div>

          {footerSections.map((section) => (
            <nav key={section.title} aria-label={`${section.title} footer links`}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-text-primary">
                {section.title}
              </h2>
              <ul className="space-y-3 text-sm text-text-muted">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link className="inline-flex min-h-6 items-center transition-colors hover:text-accent" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      <div className="border-t border-border bg-bg-elevated">
        <Container className="max-w-[1170px]">
          <div className="flex flex-col gap-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-text-muted">&copy; {year} {APP_NAME}. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-semibold text-text-secondary">
              <span className="inline-flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-accent" aria-hidden="true" />
                Cash on Delivery
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" aria-hidden="true" />
                Local delivery
              </span>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
