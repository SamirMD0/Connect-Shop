'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary">
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-danger/10 text-2xl font-bold text-danger" aria-hidden="true">!</div>
            <h1 className="mt-6 text-3xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">The page could not be loaded. Try again, or return to the storefront.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">
                Try again
              </button>
              <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-elevated">
                Go home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
