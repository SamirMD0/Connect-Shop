'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { LoginButton } from '@/components/auth/LoginButton';
import { api, ApiError } from '@/lib/api';
import { z } from 'zod';
import { Lock, Mail, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

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
    <Container className="py-12">
      <div className="grid min-h-[70vh] overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[1fr_460px]">
        <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Connect-Shop account</p>
            <h1 className="mt-5 max-w-lg text-4xl font-bold tracking-tight">
              Sign in for saved carts, faster checkout, and order tracking.
            </h1>
          </div>
          <div className="grid gap-4">
            {[
              { icon: ShoppingBag, title: 'Saved cart', text: 'Keep your current cart synced across devices.' },
              { icon: Truck, title: 'Delivery updates', text: 'Track order status and return requests.' },
              { icon: ShieldCheck, title: 'Secure account', text: 'Your existing auth flow stays unchanged.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-2xl bg-white/10 p-4">
                <item.icon className="mt-0.5 h-5 w-5 text-accent-glow" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center p-6 sm:p-10">
          <form onSubmit={submit} className="w-full space-y-5">
            <div>
              <h2 className="text-3xl font-bold text-text-primary">Sign in</h2>
              <p className="text-text-muted mt-1">Access orders, wishlist, and checkout.</p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Email</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input className="input-field pl-11" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input className="input-field pl-11" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </label>
            {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
            <LoginButton />
            <div className="flex justify-between text-sm">
              <Link className="font-medium text-accent" href="/auth/register">Create account</Link>
              <Link className="font-medium text-accent" href="/auth/forgot-password">Forgot password?</Link>
            </div>
          </form>
        </div>
      </div>
    </Container>
  );
}
