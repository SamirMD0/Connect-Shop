import { CART_STORAGE_KEY } from './constants';
import type { GuestCartItem } from './types';

export interface MergeLine { productId: string; variantId: string | null; quantity: number; expiresAt?: string }
export interface AcceptedMergeLine extends MergeLine { cartItemId: number }
export interface RejectedMergeLine extends MergeLine { reason: string; message: string }
export interface MergeResult { accepted: AcceptedMergeLine[]; rejected: RejectedMergeLine[]; replayed: boolean }
interface Attempt {
  key: string;
  ownerHash: string;
  source: GuestCartItem[];
  status: 'pending' | 'confirmed';
  rejected?: RejectedMergeLine[];
}
interface GuestState { version: 1; items: GuestCartItem[]; merge?: Attempt }
export interface PreparedMerge { key?: string; items?: MergeLine[]; remaining: number; rejected: RejectedMergeLine[]; retryOf?: string }
function newLineId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}
const lockName = CART_STORAGE_KEY + ':mutation';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const active = (items: GuestCartItem[]) => items.filter(item => !item.expires_at || Date.parse(item.expires_at) > Date.now());
const sku = (product: string, variant?: string | null) => product.toLowerCase() + ':' + (variant?.toLowerCase() || '');

function lines(value: unknown): GuestCartItem[] {
  if (!Array.isArray(value)) throw new Error('Saved guest cart could not be read. It has been preserved.');
  return value.map(item => {
    if (!item || typeof item.product_id !== 'string' || !uuid.test(item.product_id)
      || (item.variant_id != null && (typeof item.variant_id !== 'string' || !uuid.test(item.variant_id)))
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1
      || (item.expires_at != null && (typeof item.expires_at !== 'string' || !Number.isFinite(Date.parse(item.expires_at))))
      || (item.line_id != null && (typeof item.line_id !== 'string' || !uuid.test(item.line_id)))) {
      throw new Error('Saved guest cart could not be read. It has been preserved.');
    }
    return { product_id: item.product_id.toLowerCase(), variant_id: item.variant_id?.toLowerCase() || null,
      quantity: item.quantity, expires_at: item.expires_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      line_id: item.line_id || newLineId() };
  });
}
function read(): GuestState {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return { version: 1, items: [] };
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Saved guest cart could not be read. It has been preserved.'); }
  // Preserve carts saved by the previous frontend; assign stable line IDs once.
  if (Array.isArray(value)) return { version: 1, items: lines(value) };
  if (!value || value.version !== 1) throw new Error('Saved guest cart format is unsupported. It has been preserved.');
  const state: GuestState = { version: 1, items: lines(value.items) };
  if (value.merge) {
    const attempt = value.merge;
    if (!uuid.test(attempt.key) || !/^[0-9a-f]{64}$/.test(attempt.ownerHash)
      || !['pending', 'confirmed'].includes(attempt.status)) throw new Error('Saved cart transfer could not be read. It has been preserved.');
    state.merge = { key: attempt.key, ownerHash: attempt.ownerHash, source: lines(attempt.source), status: attempt.status,
      rejected: attempt.rejected || [] };
  }
  return state;
}
function write(state: GuestState) {
  // Cart subtraction and confirmation are a single atomic localStorage write.
  // Storage errors propagate: never send an attempt whose key is not durable.
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}
async function locked<T>(work: () => T | Promise<T>, requireCoordination = false): Promise<T> {
  if (navigator.locks?.request) return navigator.locks.request(lockName, work);
  if (requireCoordination) throw new Error('Guest cart transfer requires a browser with Web Locks on HTTPS or localhost. Your saved items are preserved.');
  return work(); // Existing guest cart operations still work in older browsers.
}
async function owner(userId: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId.toLowerCase()));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function getGuestCart(): Promise<GuestCartItem[]> {
  return locked(() => { const state = read(); state.items = active(state.items); write(state); return state.items; });
}
export async function mutateGuestCart(change: (items: GuestCartItem[]) => GuestCartItem[]): Promise<void> {
  return locked(() => {
    const state = read(); state.items = lines(change(active(state.items)));
    // Pending source is immutable even when quantities are edited in another
    // guest tab. New/re-added rows have new IDs and are never consumed by it.
    if (state.merge?.status === 'confirmed') delete state.merge;
    write(state);
  });
}
export async function prepareGuestMerge(userId: string, retryOf?: string): Promise<PreparedMerge> {
  if (!localStorage.getItem(CART_STORAGE_KEY) && !navigator.locks?.request) return { remaining: 0, rejected: [] };
  return locked(async () => {
    const ownerHash = await owner(userId); const state = read(); state.items = active(state.items);
    const attempt = state.merge;
    if (attempt?.status === 'pending' && attempt.ownerHash !== ownerHash) {
      throw new Error('A saved cart transfer is pending for another account. Sign back in to that account to confirm it.');
    }
    if (attempt?.status === 'confirmed' && attempt.ownerHash === ownerHash && retryOf !== attempt.key) {
      return { remaining: state.items.reduce((n, item) => n + item.quantity, 0), rejected: attempt.rejected || [], retryOf: attempt.key };
    }
    if (attempt?.status !== 'pending') {
      if (!state.items.length) return { remaining: 0, rejected: [] };
      if (state.items.length > 50) throw new Error('Transfer supports up to 50 saved cart lines. Reduce your guest cart and retry.');
      state.merge = { key: crypto.randomUUID(), ownerHash, source: state.items.map(item => ({ ...item })), status: 'pending' };
    }
    write(state); // Durable before the caller can POST; concurrent tabs see this key.
    return { key: state.merge!.key, items: state.merge!.source.map(item => ({ productId: item.product_id, variantId: item.variant_id || null,
      quantity: item.quantity, expiresAt: item.expires_at })), remaining: state.items.reduce((n, item) => n + item.quantity, 0), rejected: [] };
  }, true);
}
export async function confirmGuestMerge(key: string, result: MergeResult): Promise<PreparedMerge> {
  return locked(() => {
    const state = read(); const attempt = state.merge;
    // A delayed or repeated response must never consume another attempt's rows.
    if (!attempt || attempt.key !== key || attempt.status === 'confirmed') {
      return { remaining: active(state.items).reduce((n, item) => n + item.quantity, 0), rejected: attempt?.rejected || [], retryOf: attempt?.status === 'confirmed' ? attempt.key : undefined };
    }
    const expected = new Map<string, number>();
    for (const item of attempt.source) { const id = sku(item.product_id, item.variant_id); expected.set(id, (expected.get(id) || 0) + item.quantity); }
    if (!Array.isArray(result.accepted) || !Array.isArray(result.rejected)) throw new Error('Cart transfer result is incomplete. Retry to confirm it.');
    const seen = new Set<string>();
    for (const item of [...result.accepted, ...result.rejected]) {
      const id = sku(item.productId, item.variantId);
      if (seen.has(id) || expected.get(id) !== item.quantity) throw new Error('Cart transfer result does not match the saved attempt. Retry to confirm it.');
      seen.add(id);
    }
    if (seen.size !== expected.size) throw new Error('Cart transfer result is incomplete. Retry to confirm it.');
    const accepted = new Map(result.accepted.map(item => [sku(item.productId, item.variantId), item.quantity]));
    for (const source of attempt.source) {
      const id = sku(source.product_id, source.variant_id); const remaining = accepted.get(id) || 0;
      const transferred = Math.min(remaining, source.quantity); accepted.set(id, remaining - transferred);
      const current = state.items.find(item => item.line_id === source.line_id);
      if (current) current.quantity = Math.max(0, current.quantity - transferred);
    }
    state.items = active(state.items.filter(item => item.quantity > 0));
    state.merge = { ...attempt, status: 'confirmed', rejected: result.rejected };
    write(state);
    return { remaining: state.items.reduce((n, item) => n + item.quantity, 0), rejected: result.rejected, retryOf: key };
  }, true);
}
