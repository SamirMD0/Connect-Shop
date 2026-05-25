'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../lib/api';
import { hasAdminAccess } from '../../lib/adminPermissions';
import { Button } from '../../components/ui/Button';
import { KeyRound, Menu, ShieldCheck } from 'lucide-react';

interface MfaSetup {
  success: boolean;
  secret: string;
  otpauthUrl: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const canAccessAdmin = hasAdminAccess(user?.role);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasAdminAccess(user.role)) {
        router.replace('/');
      }
    }
  }, [user, loading, router]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, []); // We actually just want to close it, maybe not on every render.
  
  // A better way is to pass onClose to AdminSidebar and have the sidebar close it on nav.

  if (loading || !user || !canAccessAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const needsMfa = !user.mfaEnabled || !user.mfaVerified;

  async function startMfaSetup() {
    setMfaError('');
    setMfaLoading(true);

    try {
      const setup = await api.post<MfaSetup>('/api/auth/mfa/setup');
      setMfaSetup(setup);
    } catch (error) {
      setMfaError(error instanceof ApiError ? error.message : 'Failed to start MFA setup');
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyMfa(event: React.FormEvent) {
    event.preventDefault();
    setMfaError('');
    setMfaLoading(true);

    try {
      await api.post('/api/auth/mfa/verify', { code: mfaCode });
      window.location.reload();
    } catch (error) {
      setMfaError(error instanceof ApiError ? error.message : 'Invalid MFA code');
    } finally {
      setMfaLoading(false);
    }
  }

  if (needsMfa) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
        <form
          onSubmit={verifyMfa}
          className="w-full max-w-md bg-[#12121a] border border-[#1e293b] rounded-xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin verification</h1>
              <p className="text-sm text-slate-400">Enter a 6-digit authenticator code.</p>
            </div>
          </div>

          {!user.mfaEnabled && (
            <div className="mb-5 rounded-lg border border-[#1e293b] bg-[#0a0a14] p-4">
              {mfaSetup ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Secret</p>
                    <code className="block break-all rounded bg-black/30 px-3 py-2 text-sm text-slate-100">
                      {mfaSetup.secret}
                    </code>
                  </div>
                  <a
                    href={mfaSetup.otpauthUrl}
                    className="inline-flex text-sm text-accent hover:text-accent-glow"
                  >
                    Open authenticator setup
                  </a>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={startMfaSetup} loading={mfaLoading} className="w-full">
                  <KeyRound className="w-4 h-4" />
                  Generate MFA secret
                </Button>
              )}
            </div>
          )}

          <label className="block text-sm font-medium text-slate-200 mb-2" htmlFor="mfa-code">
            Code
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-lg border border-[#1e293b] bg-[#0a0a14] px-4 py-3 text-white outline-none focus:border-accent"
          />

          {mfaError && <p className="mt-3 text-sm text-danger">{mfaError}</p>}

          <Button type="submit" variant="primary" loading={mfaLoading} className="w-full mt-5" disabled={mfaCode.length !== 6}>
            Verify
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a14]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#12121a] border-b border-[#1e293b] sticky top-0 z-30">
          <span className="font-bold text-lg text-white tracking-tight">
            Admin<span className="text-accent">Panel</span>
          </span>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white bg-[#1e293b] rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
