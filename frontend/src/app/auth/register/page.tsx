'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/register', form);
      window.location.href = '/account';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-12 min-h-[70vh] flex justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Create account</h1>
          <p className="text-text-muted mt-1">Save addresses and track orders faster.</p>
        </div>
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="w-full px-4 py-3 rounded-xl border border-slate-200" type="password" placeholder="Password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Create account</Button>
        <p className="text-sm text-text-muted">Already registered? <Link className="text-accent" href="/auth/login">Sign in</Link></p>
      </form>
    </Container>
  );
}
