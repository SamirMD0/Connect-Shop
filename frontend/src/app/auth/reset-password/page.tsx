'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/reset-password', { token: searchParams.get('token'), password });
      router.replace('/auth/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-12 min-h-[70vh] flex justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <h1 className="text-3xl font-bold text-text-primary">Choose new password</h1>
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-text-primary">
            New password
          </label>
          <input
            id="new-password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            type="password"
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-describedby={error ? 'reset-password-error' : undefined}
          />
        </div>
        {error && <p id="reset-password-error" className="text-sm text-danger" role="alert">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Reset password</Button>
      </form>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordContent /></Suspense>;
}
