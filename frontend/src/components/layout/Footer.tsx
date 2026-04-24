import Link from 'next/link';
import { Container } from './Container';
import { APP_NAME } from '@/lib/constants';

const footerLinks = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/store' },
      { label: 'Smartphones', href: '/store?category=smartphones' },
      { label: 'Laptops', href: '/store?category=laptops' },
      { label: 'Audio', href: '/store?category=audio' },
      { label: 'Gaming', href: '/store?category=gaming' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My Orders', href: '/orders' },
      { label: 'Cart', href: '/cart' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-bg-surface/30 mt-auto">
      <Container className="py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h8.25c1.035 0 1.875-.84 1.875-1.875V15Z" />
                  <path d="M8.25 19.5a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM15.75 6.75a.75.75 0 0 0-.75.75v11.25c0 .087.015.17.042.248a3 3 0 0 1 5.958.464c.034-.11.052-.227.052-.348V7.5a.75.75 0 0 0-.75-.75h-4.552Z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-text-primary">{APP_NAME}</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Premium electronics at your fingertips. Quality products, fast shipping, and exceptional service.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map(section => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-text-primary mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-white/5 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved. This is a demo project.
        </div>
      </Container>
    </footer>
  );
}
