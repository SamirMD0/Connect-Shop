'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { LoginButton } from '@/components/auth/LoginButton';
import { api, ApiError } from '@/lib/api';
import { z } from 'zod';
import { Lock, Mail, ShieldCheck, User, WalletCards } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(255),
  email: z.string().trim().email('Enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validation = registerSchema.safeParse(form);
      if (!validation.success) {
        setError(validation.error.issues[0].message);
        return;
      }

      await api.post('/api/auth/register', validation.data);
      window.location.href = '/account';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-12">
      <div className="grid min-h-[70vh] overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[460px_1fr]">
        <div className="flex items-center p-6 sm:p-10">
          <form onSubmit={submit} className="w-full space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Create account</h1>
              <p className="text-text-muted mt-1">Save addresses and track orders faster.</p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Full name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input className="input-field !pl-12" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input className="input-field !pl-12" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input className="input-field !pl-12" type="password" placeholder="At least 8 characters" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            </label>
            {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <LoginButton className="w-full" />
            <p className="text-sm text-text-muted">Already registered? <Link className="font-medium text-accent" href="/auth/login">Sign in</Link></p>
          </form>
        </div>
        <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Faster checkout</p>
            <h2 className="mt-5 max-w-lg text-4xl font-bold tracking-tight">
              Keep account benefits without changing the existing auth system.
            </h2>
          </div>
          <div className="grid gap-4">
            {[
              { icon: ShieldCheck, title: 'Verified account', text: 'Use the same secure registration endpoint.' },
              { icon: WalletCards, title: 'COD-ready checkout', text: 'Save details for cash on delivery and manual payment flows.' },
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
      </div>
    </Container>
  );
}
