'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const success = searchParams.get('success');
    if (success === 'true' && user) {
      router.replace('/store');
    } else if (!loading) {
      // Wait a moment for cookie to propagate, then check again
      const timer = setTimeout(() => {
        if (user) {
          router.replace('/store');
        } else {
          router.replace('/');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-text-muted text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Completing sign in">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
