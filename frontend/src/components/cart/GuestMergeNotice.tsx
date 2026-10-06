'use client';

import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

export function GuestMergeNotice() {
  const { mergeError, mergeRejected, guestItemsRemaining, mergeLoading, retryGuestMerge } = useCart();
  const { user } = useAuth();
  if (!user || (!mergeError && !guestItemsRemaining && !mergeLoading)) return null;
  return (
    <div className="mb-6 rounded-lg border border-border bg-bg-surface p-4" role="status" aria-live="polite">
      <p className="font-semibold text-text-primary">{mergeLoading ? 'Transferring your saved cart…' : 'Saved guest cart transfer'}</p>
      {mergeError && <p className="mt-2 text-sm text-text-muted">{mergeError} Your saved transfer will be reused when you retry.</p>}
      {!mergeError && guestItemsRemaining > 0 && <p className="mt-2 text-sm text-text-muted">{guestItemsRemaining} saved items remain on this browser. Accepted items were transferred in full; unavailable items were kept.</p>}
      {mergeRejected.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-text-muted">
        {[...new Set(mergeRejected.map(item => item.message))].map(message => <li key={message}>{message}</li>)}
      </ul>}
      {!mergeLoading && <button type="button" onClick={() => void retryGuestMerge()} className="mt-3 text-sm font-semibold text-accent hover:underline">Retry transfer</button>}
    </div>
  );
}
