import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@aejkatappaja/phantom-ui/ssr.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ToastProvider } from '@/context/ToastContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { PhantomUiProvider } from '@/components/phantom/PhantomUiProvider';
import { APP_NAME, SITE_URL } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} — Premium Electronics Store`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Shop smartphones, laptops, audio gear, appliances, gaming accessories, and more with cash-on-delivery support.',
  keywords: [
    'electronics store',
    'online electronics shop',
    'smartphones',
    'laptops',
    'cash on delivery',
    APP_NAME,
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Premium Electronics Store`,
    description:
      'Browse electronics, appliances, accessories, and cash-on-delivery products from a small-business ecommerce store.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Premium Electronics Store`,
    description:
      'Browse electronics, appliances, accessories, and cash-on-delivery products from a small-business ecommerce store.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-bg-primary">
      <body className={`${inter.variable} flex min-h-screen flex-col bg-bg-primary font-sans antialiased`} suppressHydrationWarning>
        <PhantomUiProvider />
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <ToastProvider>
                <Navbar />
                <main className="w-full flex-1">{children}</main>
                <Footer />
                <WhatsAppButton />
              </ToastProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
