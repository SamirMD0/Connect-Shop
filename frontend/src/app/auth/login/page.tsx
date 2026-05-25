'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { LoginButton } from '@/components/auth/LoginButton';
import { api, ApiError } from '@/lib/api';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        setError(validation.error.issues[0].message);
        return;
      }

      await api.post('/api/auth/login', validation.data);
      window.location.href = '/store';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-12 min-h-[70vh] flex justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Sign in</h1>
          <p className="text-text-muted mt-1">Access orders, wishlist, and checkout.</p>
        </div>
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        <LoginButton />
        <div className="flex justify-between text-sm">
          <Link className="text-accent" href="/auth/register">Create account</Link>
          <Link className="text-accent" href="/auth/forgot-password">Forgot password?</Link>
        </div>
      </form>
    </Container>
  );
}
