import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'crypto';

const PUBLIC_READ_METHODS = new Set(['GET', 'HEAD']);

export type PublicReadRouteFamily =
  | 'homepage'
  | 'product_list'
  | 'product_detail'
  | 'metadata'
  | 'fallback';

function normalizeRequestPath(req: Pick<Request, 'path' | 'originalUrl' | 'baseUrl'>): string {
  const rawPath = req.originalUrl || `${req.baseUrl || ''}${req.path || ''}`;
  const pathOnly = rawPath.split('?')[0] || '/';
  return pathOnly.length > 1 ? pathOnly.replace(/\/+$/, '') : pathOnly;
}

export function getPublicReadRouteFamily(
  req: Pick<Request, 'method' | 'path' | 'originalUrl' | 'baseUrl'>
): PublicReadRouteFamily | null {
  if (!PUBLIC_READ_METHODS.has(req.method.toUpperCase())) {
    return null;
  }

  const path = normalizeRequestPath(req);

  if (path === '/api/v1/homepage' || path === '/api/v1/homepage/full') {
    return 'homepage';
  }

  if (path.startsWith('/api/v1/homepage/')) {
    return 'fallback';
  }

  if (path === '/api/v1/products') {
    return 'product_list';
  }

  if (path === '/api/v1/products/categories') {
    return 'metadata';
  }

  if (path.startsWith('/api/v1/products/')) {
    return 'product_detail';
  }

  if (
    path === '/api/v1/categories'
    || path.startsWith('/api/v1/categories/')
    || path === '/api/v1/brands'
    || path.startsWith('/api/v1/brands/')
    || path === '/api/v1/carousel'
  ) {
    return 'metadata';
  }

  return null;
}

export function isPublicReadRequest(req: Pick<Request, 'method' | 'path' | 'originalUrl' | 'baseUrl'>): boolean {
  return getPublicReadRouteFamily(req) !== null;
}

function hashSecret(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function hasValidInternalSsrSecretValue(providedSecret: string | undefined, expectedSecret: string | undefined): boolean {
  if (!providedSecret || !expectedSecret) return false;

  return timingSafeEqual(hashSecret(providedSecret), hashSecret(expectedSecret));
}
