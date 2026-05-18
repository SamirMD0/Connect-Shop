'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await api.post('/api/auth/forgot-password', { email });
    setDone(true);
    setLoading(false);
  }

  return (
    <Container className="py-12 min-h-[70vh] flex justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <h1 className="text-3xl font-bold text-text-primary">Reset password</h1>
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {done && <p className="text-sm text-text-muted">If an account exists, a reset link has been sent.</p>}
        <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
      </form>
    </Container>
  );
}
