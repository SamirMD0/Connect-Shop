'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const [mfaCopyMessage, setMfaCopyMessage] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const secretInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    async function renderQrCode() {
      if (!mfaSetup?.otpauthUrl) {
        setMfaQrCode('');
        return;
      }

      try {
        const qrCodeModule = await import('qrcode');
        const toDataURL = qrCodeModule.toDataURL || qrCodeModule.default?.toDataURL;

        if (!toDataURL) {
          setMfaQrCode('');
          return;
        }

        const dataUrl = await toDataURL(mfaSetup.otpauthUrl, {
          width: 192,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0B1B48',
            light: '#FFFFFF',
          },
        });

        if (!cancelled) {
          setMfaQrCode(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setMfaQrCode('');
        }
      }
    }

    void renderQrCode();

    return () => {
      cancelled = true;
    };
  }, [mfaSetup?.otpauthUrl]);

  if (loading || !user || !canAccessAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const needsMfa = !user.mfaEnabled || !user.mfaVerified;

  async function startMfaSetup() {
    setMfaError('');
    setMfaCopyMessage('');
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

  async function copyMfaSetup(value: string, label: string) {
    setMfaCopyMessage('');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setMfaCopyMessage(`${label} copied`);
    } catch {
      if (label === 'Secret') {
        secretInputRef.current?.focus();
        secretInputRef.current?.select();
      }
      setMfaCopyMessage('Copy failed. Select the secret and press Ctrl+C.');
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <form
          onSubmit={verifyMfa}
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-[#0B1B48] shadow-xl shadow-slate-200/80"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-accent flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin verification</h1>
              <p className="text-sm text-slate-500">Enter a 6-digit authenticator code.</p>
            </div>
          </div>

          {!user.mfaEnabled && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {mfaSetup ? (
                <div className="space-y-3">
                  {mfaQrCode && (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Step 1: Scan this QR code</p>
                      <div className="inline-flex rounded-xl bg-white p-3">
                        <img
                          src={mfaQrCode}
                          alt="Authenticator setup QR code"
                          width={192}
                          height={192}
                          className="h-48 w-48"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      {mfaQrCode ? 'Or add this secret manually' : 'Step 1: Add this secret to your authenticator app'}
                    </p>
                    <input
                      ref={secretInputRef}
                      readOnly
                      value={mfaSetup.secret}
                      onFocus={(event) => event.currentTarget.select()}
                      className="block w-full rounded border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-[#0B1B48] outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyMfaSetup(mfaSetup.secret, 'Secret')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-accent hover:text-accent"
                    >
                      Copy secret
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyMfaSetup(mfaSetup.otpauthUrl, 'Setup URI')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-accent hover:text-accent"
                    >
                      Copy setup URI
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, or 1Password. If scanning is unavailable, choose manual setup and paste the secret.
                  </p>
                  {mfaCopyMessage && <p className="text-xs text-accent">{mfaCopyMessage}</p>}
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={startMfaSetup} loading={mfaLoading} className="w-full">
                  <KeyRound className="w-4 h-4" />
                  Generate MFA secret
                </Button>
              )}
            </div>
          )}

          <label className="mb-2 block text-sm font-medium text-[#0B1B48]" htmlFor="mfa-code">
            Step 2: Enter the 6-digit code from your authenticator app
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[#0B1B48] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          <p className="mt-2 text-xs text-slate-500">
            This field only accepts numbers. Do not enter the secret letters here.
          </p>

          {mfaError && <p className="mt-3 text-sm text-danger">{mfaError}</p>}

          <Button type="submit" variant="primary" loading={mfaLoading} className="w-full mt-5" disabled={mfaCode.length !== 6}>
            Verify
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" 
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
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white p-4 lg:hidden">
          <span className="text-lg font-bold tracking-tight text-[#0B1B48]">
            Admin<span className="text-accent">Panel</span>
          </span>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:text-[#0B1B48]"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
