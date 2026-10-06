import 'server-only';
import { cache } from 'react';
import { api } from './api';
import type { StoreSettings } from './store-settings';

// Request-scoped reuse only. This public configuration contains no auth data.
export const getStoreSettings = cache(async (): Promise<StoreSettings | null> => {
  try { return (await api.get<{ settings: StoreSettings }>('/api/store/config')).settings; }
  catch { return null; }
});
