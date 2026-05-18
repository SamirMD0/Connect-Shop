'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verifying email...');

  useEffect(() => {
    api.post('/api/auth/verify-email', { token: searchParams.get('token') })
      .then(() => setStatus('Email verified.'))
      .catch(() => setStatus('Verification link is invalid or expired.'));
  }, [searchParams]);

  return (
    <Container className="py-12 min-h-[70vh]">
      <h1 className="text-3xl font-bold text-text-primary mb-3">{status}</h1>
      <Link className="text-accent" href="/account">Go to account</Link>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><VerifyEmailContent /></Suspense>;
}
