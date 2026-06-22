import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <SearchX className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Page not found</h1>
        <p className="mt-3 text-text-muted">
          The page you are looking for may have moved or is no longer available.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/store" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">
            Shop products
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-elevated">
            Go home
          </Link>
        </div>
      </div>
    </Container>
  );
}
