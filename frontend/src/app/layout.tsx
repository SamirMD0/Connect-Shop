import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ToastProvider } from '@/context/ToastContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { APP_NAME } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - Premium Electronics Store`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Shop the latest smartphones, laptops, audio gear, wearables, gaming accessories, and more. Premium electronics with free shipping.',
  keywords: ['electronics', 'gadgets', 'smartphones', 'laptops', 'audio', 'gaming', 'online store'],
  authors: [{ name: APP_NAME }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} font-sans bg-bg-primary text-text-primary`} suppressHydrationWarning>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <ToastProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
              </ToastProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
