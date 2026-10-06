'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try { await api.post('/api/auth/forgot-password', { email }); setDone(true); }
    catch { setError('We could not submit your request. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <Container className="py-12 min-h-[70vh] flex justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <h1 className="text-3xl font-bold text-text-primary">Reset password</h1>
        <div>
          <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-text-primary">
            Email address
          </label>
          <input
            id="reset-email"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {done && <p className="text-sm text-text-muted" role="status">If an eligible account exists, we will attempt to send a reset link.</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
      </form>
    </Container>
  );
}
