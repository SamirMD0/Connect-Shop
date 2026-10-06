'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { formatStoreMoney, type StoreSettings } from '@/lib/store-settings';

const SettingsContext = createContext<StoreSettings | null>(null);
export function StoreSettingsProvider({ initialSettings, children }: { initialSettings: StoreSettings | null; children: ReactNode }) {
  const [settings, setSettings] = useState(initialSettings);
  useEffect(() => {
    if (initialSettings) return;
    const controller = new AbortController();
    void api.get<{ settings: StoreSettings }>('/api/store/config', { signal: controller.signal })
      .then(result => setSettings(result.settings)).catch(() => {});
    return () => controller.abort();
  }, [initialSettings]);
  return <SettingsContext.Provider value={settings}>
    {!settings && <p role="status" className="bg-bg-elevated px-4 py-2 text-center text-sm text-text-muted">Store currency is temporarily unavailable. Checkout will confirm the currency and totals.</p>}
    {children}
  </SettingsContext.Provider>;
}
export const useStoreSettings = () => useContext(SettingsContext);
export function useStoreMoney() {
  const settings = useStoreSettings();
  return (amount: number | string | null | undefined, currency = settings?.currency, compact = false) =>
    formatStoreMoney(amount, currency, settings?.locale || 'en-US', compact);
}
export function Money({ amount, currency, compact = false }: { amount: number | string | null | undefined; currency?: string; compact?: boolean }) {
  const money = useStoreMoney(); return <>{money(amount, currency, compact)}</>;
}

export function FreeShippingDescription() {
  const settings = useStoreSettings();
  return settings ? <>Orders <Money amount={settings.freeShippingThreshold} compact /> or more</> : <>Confirmed at checkout</>;
}
