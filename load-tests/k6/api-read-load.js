import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { apiUrl, getFirstProductSlug, parseJson, warnIfUnsafeTarget } from './config.js';

const targetVus = Number(__ENV.K6_VUS || 10);
const holdDuration = __ENV.K6_DURATION || '30s';

export const options = {
  scenarios: {
    public_read_browsing: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: targetVus },
        { duration: holdDuration, target: targetVus },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
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
    console.warn('[k6 read-load] No product slug found. Product detail requests will be skipped.');
  }

  return { firstProductSlug };
}

function expectOkJson(response, payload, label) {
  return check(response, {
    [`${label} status is 200`]: (res) => res.status === 200,
    [`${label} response is JSON`]: () => payload !== null,
    [`${label} response is successful`]: () => payload !== null && payload.success === true,
  });
}

export default function (data) {
  group('health', () => {
    const response = http.get(apiUrl('/api/health'), {
      tags: { endpoint: 'health' },
    });
    expectOkJson(response, parseJson(response), 'health');
  });

  group('homepage', () => {
    const response = http.get(apiUrl('/api/v1/homepage'), {
      tags: { endpoint: 'homepage' },
    });
    expectOkJson(response, parseJson(response), 'homepage');
  });

  group('product list', () => {
    const response = http.get(apiUrl('/api/v1/products?limit=12&sort=newest'), {
      tags: { endpoint: 'product_list' },
    });
    const payload = parseJson(response);

    expectOkJson(response, payload, 'product list');
    check(response, {
      'product list includes products array': () => payload !== null && Array.isArray(payload.products),
    });
  });

  if (data.firstProductSlug) {
    group('product detail', () => {
      const response = http.get(apiUrl(`/api/v1/products/${encodeURIComponent(data.firstProductSlug)}`), {
        tags: { endpoint: 'product_detail' },
      });
      const payload = parseJson(response);

      expectOkJson(response, payload, 'product detail');
      check(response, {
        'product detail includes product': () => payload !== null && payload.product !== null && typeof payload.product === 'object',
      });
    });
  }

  group('categories', () => {
    const response = http.get(apiUrl('/api/v1/categories'), {
      tags: { endpoint: 'categories' },
    });
    const payload = parseJson(response);

    expectOkJson(response, payload, 'categories');
    check(response, {
      'categories response includes categories array': () => payload !== null && Array.isArray(payload.categories),
    });
  });

  group('brands', () => {
    const response = http.get(apiUrl('/api/v1/brands'), {
      tags: { endpoint: 'brands' },
    });
    const payload = parseJson(response);

    expectOkJson(response, payload, 'brands');
    check(response, {
      'brands response includes brands array': () => payload !== null && Array.isArray(payload.brands),
    });
  });

  sleep(1);
}

