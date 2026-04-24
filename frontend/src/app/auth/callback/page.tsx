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
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-text-muted text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
