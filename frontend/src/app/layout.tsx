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
import { PhantomUiProvider } from '@/components/phantom/PhantomUiProvider';
import { APP_NAME } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Premium Electronics Store`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Shop the latest smartphones, laptops, audio gear, wearables, gaming accessories, and more. Premium electronics with free shipping.',
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
              </ToastProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
