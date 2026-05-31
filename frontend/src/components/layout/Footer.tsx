import Link from 'next/link';
import Image from 'next/image';
import { Container } from './Container';
import { APP_NAME } from '@/lib/constants';
import { businessContact, createWhatsAppUrl } from '@/lib/business-config';
import { Mail, MapPin, MessageCircle, Phone, Zap } from 'lucide-react';
import type { JSX } from 'react';

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
      { label: 'Shopping Cart', href: '/cart' },
      { label: 'Wishlist', href: '#' },
      { label: 'Track Order', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Careers', href: '#' },
      { label: 'Press', href: '#' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  const accountLinks = footerLinks.find(section => section.title === 'Account')?.links || [];
  const quickLinks = [
    ...footerLinks.find(section => section.title === 'Shop')?.links.slice(0, 3) || [],
    ...footerLinks.find(section => section.title === 'Company')?.links.slice(0, 2) || [],
  ];
  const paymentMethods = [
    { src: '/nextmerce/payment/payment-01.svg', alt: 'visa card', width: 66, height: 22 },
    { src: '/nextmerce/payment/payment-02.svg', alt: 'paypal', width: 18, height: 21 },
    { src: '/nextmerce/payment/payment-03.svg', alt: 'master card', width: 33, height: 24 },
    { src: '/nextmerce/payment/payment-04.svg', alt: 'apple pay', width: 53, height: 22 },
    { src: '/nextmerce/payment/payment-05.svg', alt: 'google pay', width: 56, height: 22 },
  ];

  return (
    <footer className="mt-auto overflow-hidden bg-white">
      <Container className="max-w-[1170px]">
        <div className="flex flex-wrap gap-10 pb-10 pt-14 sm:pt-16 xl:flex-nowrap xl:justify-between xl:gap-16 xl:pb-15 xl:pt-20">
          <div className="w-full max-w-[330px]">
            <Link href="/" className="mb-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3C50E0] text-white">
                <Zap className="h-6 w-6" fill="white" />
              </span>
              <span className="text-2xl font-bold leading-none text-[#0B1B48]">{APP_NAME}</span>
            </Link>

            <h2 className="mb-7 text-base font-medium text-[#0B1B48]">Help & Support</h2>

            <ul className="flex flex-col gap-3 text-sm leading-6 text-slate-600">
              <li className="flex gap-4">
                <MapPin className="mt-0.5 h-6 w-6 shrink-0 text-[#3C50E0]" />
                {businessContact.address}
              </li>
              <li>
                <a href={`tel:${businessContact.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-4 transition-colors hover:text-[#3C50E0]">
                  <Phone className="h-6 w-6 shrink-0 text-[#3C50E0]" />
                  {businessContact.phone}
                </a>
              </li>
              <li>
                <a
                  href={createWhatsAppUrl('Hello, I need help with an order.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 transition-colors hover:text-[#3C50E0]"
                >
                  <MessageCircle className="h-6 w-6 shrink-0 text-[#25D366]" />
                  WhatsApp support
                </a>
              </li>
              <li>
                <a href={`mailto:${businessContact.email}`} className="flex items-center gap-4 transition-colors hover:text-[#3C50E0]">
                  <Mail className="h-6 w-6 shrink-0 text-[#3C50E0]" />
                  {businessContact.email}
                </a>
              </li>
            </ul>

            <div className="mt-7 flex items-center gap-4 text-slate-500">
              {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="flex transition-colors hover:text-[#3C50E0]"
                  aria-label={social}
                >
                  <SocialIcon name={social} />
                </a>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <h2 className="mb-7 text-base font-medium text-[#0B1B48]">Account</h2>

            <ul className="flex flex-col gap-3.5 text-sm text-slate-600">
              <li>
                <Link className="transition-colors hover:text-[#3C50E0]" href="/account">
                  My Account
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-[#3C50E0]" href="/auth/login">
                  Login / Register
                </Link>
              </li>
              {accountLinks.map(link => (
                <li key={link.label}>
                  <Link className="transition-colors hover:text-[#3C50E0]" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full sm:w-auto">
            <h2 className="mb-7 text-base font-medium text-[#0B1B48]">Quick Link</h2>

            <ul className="flex flex-col gap-3 text-sm text-slate-600">
              <li>
                <Link className="transition-colors hover:text-[#3C50E0]" href="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-[#3C50E0]" href="/terms">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-[#3C50E0]" href="/return-policy">
                  Return Policy
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-[#3C50E0]" href="/faq">
                  FAQ
                </Link>
              </li>
              {quickLinks.map(link => (
                <li key={`${link.label}-${link.href}`}>
                  <Link className="transition-colors hover:text-[#3C50E0]" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full sm:w-auto">
            <h2 className="mb-7 text-base font-medium text-[#0B1B48] lg:text-right">
              Download App
            </h2>

            <p className="mb-4 text-sm text-slate-600 lg:text-right">
              Save $3 With App & New User only
            </p>

            <ul className="flex flex-col gap-3 lg:items-end">
              <li>
                <a
                  className="inline-flex items-center gap-3 rounded-md bg-[#0B1B48] py-[9px] pl-4 pr-7 text-white transition-opacity hover:opacity-95"
                  href="#"
                >
                  <svg className="fill-current" width="34" height="35" viewBox="0 0 34 35" fill="none">
                    <path d="M29.5529 12.3412C29.3618 12.4871 25.9887 14.3586 25.9887 18.5198C25.9887 23.3331 30.2809 25.0358 30.4093 25.078C30.3896 25.1818 29.7275 27.41 28.1463 29.6804C26.7364 31.6783 25.264 33.6731 23.024 33.6731C20.7841 33.6731 20.2076 32.3918 17.6217 32.3918C15.1018 32.3918 14.2058 33.7152 12.1569 33.7152C10.1079 33.7152 8.6783 31.8664 7.03456 29.5961C5.13062 26.93 3.59229 22.7882 3.59229 18.8572C3.59229 12.552 7.756 9.20804 11.8538 9.20804C14.0312 9.20804 15.8462 10.6157 17.2133 10.6157C18.5144 10.6157 20.5436 9.12373 23.0207 9.12373C23.9595 9.12373 27.3327 9.20804 29.5529 12.3412ZM21.8447 6.45441C22.8692 5.25759 23.5939 3.59697 23.5939 1.93635C23.5939 1.70607 23.5741 1.47254 23.5313 1.28442C21.8645 1.34605 19.8815 2.37745 18.6857 3.74292C17.7469 4.79379 16.8707 6.45441 16.8707 8.13773C16.8707 8.39076 16.9135 8.64369 16.9333 8.72476C17.0387 8.74426 17.21 8.76694 17.3813 8.76694C18.8768 8.76694 20.7577 7.78094 21.8447 6.45441Z" />
                  </svg>

                  <span>
                    <span className="block text-xs">Download on the</span>
                    <span className="block font-medium">App Store</span>
                  </span>
                </a>
              </li>

              <li>
                <a
                  className="inline-flex items-center gap-3 rounded-md bg-[#3C50E0] py-[9px] pl-4 pr-8 text-white transition-opacity hover:opacity-95"
                  href="#"
                >
                  <svg className="fill-current" width="34" height="35" viewBox="0 0 34 35" fill="none">
                    <path d="M5.45764 1.03125L19.9718 15.5427L23.7171 11.7973C18.5993 8.69224 11.7448 4.52679 8.66206 2.65395L6.59681 1.40278C6.23175 1.18039 5.84088 1.06062 5.45764 1.03125ZM3.24214 2.76868C3.21276 2.92814 3.1875 3.08837 3.1875 3.26041V31.939C3.1875 32.0593 3.21169 32.1713 3.22848 32.2859L17.9939 17.5205L3.24214 2.76868ZM26.1785 13.2916L21.9496 17.5205L26.1047 21.6756C28.3062 20.3412 29.831 19.4147 30.0003 19.3126C30.7486 18.8552 31.1712 18.1651 31.1586 17.4112C31.1474 16.6713 30.7247 16.0098 30.0057 15.6028C29.8449 15.5104 28.3408 14.6022 26.1785 13.2916ZM19.9718 19.4983L5.50135 33.9688C5.78248 33.9198 6.06327 33.836 6.33182 33.6737C6.70387 33.4471 16.7548 27.3492 23.6433 23.1699L19.9718 19.4983Z" />
                  </svg>

                  <span>
                    <span className="block text-xs">Get in On</span>
                    <span className="block font-medium">Google Play</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <div className="bg-[#F6F7FB] py-5 xl:py-7">
        <Container className="max-w-[1170px]">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <p className="font-medium text-[#0B1B48]">
              &copy; {year}. All rights reserved by {APP_NAME}.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <p className="font-medium text-[#0B1B48]">We Accept:</p>

              <div className="flex flex-wrap items-center gap-5 sm:gap-6">
                {paymentMethods.map(payment => (
                  <a key={payment.src} href="#" aria-label={`payment system with ${payment.alt}`}>
                    <Image
                      src={payment.src}
                      alt={payment.alt}
                      width={payment.width}
                      height={payment.height}
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    twitter: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    facebook: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  };
  return icons[name] || null;
}
