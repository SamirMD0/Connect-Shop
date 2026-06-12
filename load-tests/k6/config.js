export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

const SAFE_LOCAL_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'host.docker.internal',
];

export function warnIfUnsafeTarget() {
  const hostMatch = BASE_URL.match(/^https?:\/\/([^/:]+)/i);
  const hostname = hostMatch ? hostMatch[1].toLowerCase() : '';
  const isLocal = SAFE_LOCAL_HOSTS.includes(hostname) || hostname.endsWith('.local');

  if (!hostname) {
    console.warn(`[k6 safety] BASE_URL "${BASE_URL}" could not be parsed. The test may fail.`);
    return;
  }

  if (!isLocal) {
    console.warn(
      `[k6 safety] BASE_URL is ${BASE_URL}. Do not run load tests against production without explicit permission.`
    );
  }
}

export function apiUrl(path) {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function parseJson(response) {
  try {
    return response.json();
  } catch (_error) {
    return null;
  }
}

export function getFirstProductSlug(productListPayload) {
  if (!productListPayload || !Array.isArray(productListPayload.products)) {
    return null;
  }

  const firstWithSlug = productListPayload.products.find(
    (product) => product && typeof product.slug === 'string' && product.slug.length > 0
  );

  return firstWithSlug ? firstWithSlug.slug : null;
}
