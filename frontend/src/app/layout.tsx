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
import { businessBrand } from '@/lib/business-config';
import { getStoreSettings } from '@/lib/store-settings.server';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: businessBrand.title,
    template: `%s | ${APP_NAME}`,
  },
  description: businessBrand.description,
  keywords: businessBrand.keywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: APP_NAME,
    title: businessBrand.title,
    description: businessBrand.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: businessBrand.title,
    description: businessBrand.description,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();
  return (
    <html lang="en" className="bg-bg-primary" style={businessBrand.colors as React.CSSProperties}>
      <body className={`${inter.variable} flex min-h-screen flex-col bg-bg-primary font-sans antialiased`} suppressHydrationWarning>
        <StoreSettingsProvider initialSettings={settings}>
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
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
