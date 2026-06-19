import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getFirstProductSlug, parseJson } from './config.js';

const API_BASE_URL = (__ENV.API_BASE_URL || __ENV.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const profileName = (__ENV.PROFILE || __ENV.K6_PROFILE || 'smoke').toLowerCase();

const LOAD_PROFILES = {
  smoke: {
    stages: [
      { duration: '10s', target: 1 },
      { duration: '15s', target: 2 },
      { duration: '20s', target: 5 },
      { duration: '10s', target: 0 },
    ],
  },
  small: {
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 10 },
      { duration: '1m', target: 25 },
      { duration: '30s', target: 0 },
    ],
  },
  medium: {
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 100 },
      { duration: '1m', target: 250 },
      { duration: '30s', target: 0 },
    ],
  },
};

const selectedProfileName = LOAD_PROFILES[profileName] ? profileName : 'smoke';
const selectedProfile = LOAD_PROFILES[selectedProfileName];
const publicApiP95 = selectedProfileName === 'medium' ? 2000 : 1500;

if (!LOAD_PROFILES[profileName]) {
  console.warn(`[k6 api-public-read] Unknown PROFILE "${profileName}". Falling back to smoke.`);
}

export const options = {
  summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    backend_public_read: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: selectedProfile.stages,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
    backend_http_429_responses: ['count==0'],
    backend_public_api_duration: [`p(95)<${publicApiP95}`],
  },
};

const backend429Responses = new Counter('backend_http_429_responses');
const backendPublicApiDuration = new Trend('backend_public_api_duration', true);
const homepageFullDuration = new Trend('backend_homepage_full_duration', true);
const productsDuration = new Trend('backend_products_duration', true);
const categoriesDuration = new Trend('backend_categories_duration', true);
const brandsDuration = new Trend('backend_brands_duration', true);
const carouselDuration = new Trend('backend_carousel_duration', true);
const productDetailDuration = new Trend('backend_product_detail_duration', true);
const categoryProductsDuration = new Trend('backend_category_products_duration', true);
const rateLimitRemaining = new Trend('rate_limit_remaining');
const rateLimitLimit = new Trend('rate_limit_limit');
const rateLimitReset = new Trend('rate_limit_reset');

function apiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function warnIfUnsafeApiTarget() {
  const hostMatch = API_BASE_URL.match(/^https?:\/\/([^/:]+)/i);
  const hostname = hostMatch ? hostMatch[1].toLowerCase() : '';
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'].includes(hostname)
    || hostname.endsWith('.local');

  if (!hostname) {
    console.warn(`[k6 safety] API_BASE_URL "${API_BASE_URL}" could not be parsed. The test may fail.`);
    return;
  }

  if (!isLocal) {
    console.warn(
      `[k6 safety] API_BASE_URL is ${API_BASE_URL}. Do not run load tests against production without explicit permission.`
    );
  }
}

function getHeader(response, headerName) {
  const lowerHeaderName = headerName.toLowerCase();
  const headerKey = Object.keys(response.headers || {}).find((key) => key.toLowerCase() === lowerHeaderName);
  return headerKey ? response.headers[headerKey] : undefined;
}

function addNumericHeader(response, headerName, trend, endpoint) {
  const value = getHeader(response, headerName);
  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    trend.add(numericValue, { endpoint });
  }
}

function recordApiMetrics(response, endpoint, durationTrend) {
  const tags = { endpoint };

  backendPublicApiDuration.add(response.timings.duration, tags);
  durationTrend.add(response.timings.duration, tags);
  addNumericHeader(response, 'ratelimit-remaining', rateLimitRemaining, endpoint);
  addNumericHeader(response, 'x-ratelimit-remaining', rateLimitRemaining, endpoint);
  addNumericHeader(response, 'ratelimit-limit', rateLimitLimit, endpoint);
  addNumericHeader(response, 'x-ratelimit-limit', rateLimitLimit, endpoint);
  addNumericHeader(response, 'ratelimit-reset', rateLimitReset, endpoint);
  addNumericHeader(response, 'x-ratelimit-reset', rateLimitReset, endpoint);

  if (response.status === 429) {
    backend429Responses.add(1, tags);
  }
}

function expectOkJson(response, payload, label) {
  return check(response, {
    [`${label} status is 200`]: (res) => res.status === 200,
    [`${label} response is JSON`]: () => payload !== null,
    [`${label} response is successful`]: () => payload !== null && payload.success === true,
  });
}

function getFirstCategorySlug(categoriesPayload) {
  if (!categoriesPayload || !Array.isArray(categoriesPayload.categories)) {
    return null;
  }

  return categoriesPayload.categories.find(
    (category) => category && typeof category.slug === 'string' && category.slug.length > 0
  )?.slug || null;
}

export function setup() {
  warnIfUnsafeApiTarget();

  const productsResponse = http.get(apiUrl('/api/v1/products?limit=12&sort=newest'), {
    tags: { endpoint: 'products', phase: 'setup' },
  });
  const productsPayload = parseJson(productsResponse);
  const firstProductSlug = getFirstProductSlug(productsPayload);

  const categoriesResponse = http.get(apiUrl('/api/v1/categories'), {
    tags: { endpoint: 'categories', phase: 'setup' },
  });
  const categoriesPayload = parseJson(categoriesResponse);
  const firstCategorySlug = getFirstCategorySlug(categoriesPayload);

  if (!firstProductSlug) {
    console.warn('[k6 api-public-read] No product slug found. Product detail API requests will be skipped.');
  }

  if (!firstCategorySlug) {
    console.warn('[k6 api-public-read] No category slug found. Category-filtered product API requests will be skipped.');
  }

  return { firstProductSlug, firstCategorySlug };
}

function requestPublicApi(path, endpoint, durationTrend, label) {
  const response = http.get(apiUrl(path), {
    tags: { endpoint },
  });
  const payload = parseJson(response);

  recordApiMetrics(response, endpoint, durationTrend);
  expectOkJson(response, payload, label);

  return { response, payload };
}

export default function (data) {
  group('homepage full', () => {
    requestPublicApi('/api/v1/homepage/full', 'homepage_full', homepageFullDuration, 'homepage full');
  });

  group('products', () => {
    const { payload } = requestPublicApi('/api/v1/products?limit=12&sort=newest', 'products', productsDuration, 'products');
    check(payload, {
      'products response includes products array': (body) => body !== null && Array.isArray(body.products),
    });
  });

  group('categories', () => {
    const { payload } = requestPublicApi('/api/v1/categories', 'categories', categoriesDuration, 'categories');
    check(payload, {
      'categories response includes categories array': (body) => body !== null && Array.isArray(body.categories),
    });
  });

  group('brands', () => {
    const { payload } = requestPublicApi('/api/v1/brands', 'brands', brandsDuration, 'brands');
    check(payload, {
      'brands response includes brands array': (body) => body !== null && Array.isArray(body.brands),
    });
  });

  group('carousel', () => {
    requestPublicApi('/api/v1/carousel', 'carousel', carouselDuration, 'carousel');
  });

  if (data.firstProductSlug) {
    group('product detail', () => {
      const { payload } = requestPublicApi(
        `/api/v1/products/${encodeURIComponent(data.firstProductSlug)}`,
        'product_detail',
        productDetailDuration,
        'product detail'
      );
      check(payload, {
        'product detail includes product': (body) => body !== null && body.product !== null && typeof body.product === 'object',
      });
    });
  }

  if (data.firstCategorySlug) {
    group('category products', () => {
      const { payload } = requestPublicApi(
        `/api/v1/products?limit=12&category=${encodeURIComponent(data.firstCategorySlug)}`,
        'category_products',
        categoryProductsDuration,
        'category products'
      );
      check(payload, {
        'category products response includes products array': (body) => body !== null && Array.isArray(body.products),
      });
    });
  }

  sleep(1);
}

