'use client';
import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { withPublicReadDeadline, PublicReadTimeoutError } from '@/lib/public-read';
import type { CheckoutQuote, QuoteRequest } from '@/lib/checkout-quote';

export function useCheckoutQuote(request: QuoteRequest, actor: string, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const body = JSON.stringify(request);
  const fingerprint = actor + ':' + body + ':' + revision;
  const [state, setState] = useState<{ fingerprint: string; quote: CheckoutQuote | null; error: string; loading: boolean }>();
  useEffect(() => {
    if (!enabled || !request.items.length || !request.shippingAddress.country) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ fingerprint, quote: null, error: '', loading: true });
      // This POST is a read-only private quote. Its deadline never applies to
      // order creation, checkout side effects or other write/auth operations.
      void withPublicReadDeadline(signal => api.post<{ quote: CheckoutQuote }>('/api/orders/quote', JSON.parse(body), { signal }), controller.signal, 8000)
        .then(result => { if (!controller.signal.aborted) setState({ fingerprint, quote: result.quote, error: '', loading: false }); })
        .catch(error => {
          if (!controller.signal.aborted) setState({ fingerprint, quote: null,
            error: error instanceof PublicReadTimeoutError ? 'Checkout totals took too long to respond. Retry to confirm them.' : getErrorMessage(error, 'Checkout totals are unavailable.'), loading: false });
        });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
    // body includes every item/location/coupon/payment value, including user row IDs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, actor, enabled, revision, fingerprint]);
  const current = state?.fingerprint === fingerprint ? state : undefined;
  return { quote: enabled ? current?.quote || null : null, error: current?.error || '',
    loading: enabled && (current?.loading ?? true), retry: () => setRevision(value => value + 1) };
}
