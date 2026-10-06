'use client';

export function StorefrontUnavailable() {
  return (
    <section role="status" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-text-primary">Catalog temporarily unavailable</h1>
      <p className="mt-3 text-text-muted">We could not load the catalog. Please try again in a moment.</p>
      <button type="button" onClick={() => window.location.reload()}
        className="mt-6 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover">
        Retry
      </button>
    </section>
  );
}
