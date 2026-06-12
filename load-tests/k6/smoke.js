import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { apiUrl, getFirstProductSlug, parseJson, warnIfUnsafeTarget } from './config.js';

export const options = {
  vus: Number(__ENV.K6_VUS || 2),
  duration: __ENV.K6_DURATION || '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    checks: ['rate>0.95'],
  },
};

export function setup() {
  warnIfUnsafeTarget();

  const productsResponse = http.get(apiUrl('/api/v1/products?limit=12&sort=newest'), {
    tags: { endpoint: 'product_list', phase: 'setup' },
  });
  const productsPayload = parseJson(productsResponse);
  const firstProductSlug = getFirstProductSlug(productsPayload);

  if (!firstProductSlug) {
    console.warn('[k6 smoke] No product slug found. Product detail check will be skipped.');
  }

  return { firstProductSlug };
}

export default function (data) {
  group('health', () => {
    const response = http.get(apiUrl('/api/health'), {
      tags: { endpoint: 'health' },
    });
    const payload = parseJson(response);

    check(response, {
      'health status is 200': (res) => res.status === 200,
      'health response is successful': () => payload !== null && payload.success === true,
    });
  });

  group('product list', () => {
    const response = http.get(apiUrl('/api/v1/products?limit=12&sort=newest'), {
      tags: { endpoint: 'product_list' },
    });
    const payload = parseJson(response);

    check(response, {
      'product list status is 200': (res) => res.status === 200,
      'product list response is successful': () => payload !== null && payload.success === true,
      'product list includes products array': () => payload !== null && Array.isArray(payload.products),
    });
  });

  if (data.firstProductSlug) {
    group('product detail', () => {
      const response = http.get(apiUrl(`/api/v1/products/${encodeURIComponent(data.firstProductSlug)}`), {
        tags: { endpoint: 'product_detail' },
      });
      const payload = parseJson(response);

      check(response, {
        'product detail status is 200': (res) => res.status === 200,
        'product detail response is successful': () => payload !== null && payload.success === true,
        'product detail includes product': () => payload !== null && payload.product !== null && typeof payload.product === 'object',
      });
    });
  }

  sleep(1);
}

