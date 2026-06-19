import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { apiUrl, getFirstProductSlug, parseJson, warnIfUnsafeTarget } from './config.js';

const FRONTEND_URL = (__ENV.FRONTEND_URL || __ENV.WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const WEBSITE_LOAD_PROFILES = {
  smoke: {
    name: 'smoke',
    stages: [
      { duration: '10s', target: 1 },
      { duration: '15s', target: 2 },
      { duration: '20s', target: 5 },
      { duration: '10s', target: 0 },
    ],
    duration: '55s',
  },
  small: {
    name: 'small',
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 10 },
      { duration: '1m', target: 25 },
      { duration: '30s', target: 0 },
    ],
    duration: '3m',
  },
  medium: {
    name: 'medium',
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 100 },
      { duration: '1m', target: 250 },
      { duration: '30s', target: 0 },
    ],
    duration: '3m',
  },
};

const profileName = (__ENV.K6_PROFILE || 'smoke').toLowerCase();

function getThresholds(profile) {
  const isMedium = profile === 'medium';
  const publicPageP95 = isMedium ? 2000 : 1500;
  const productDetailP95 = isMedium ? 1500 : 1000;

  return {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${publicPageP95}`],
    checks: ['rate>0.95'],
    http_429_responses: ['count==0'],
    homepage_duration: [`p(95)<${publicPageP95}`],
    store_duration: [`p(95)<${publicPageP95}`],
    category_store_duration: [`p(95)<${publicPageP95}`],
    product_detail_duration: [`p(95)<${productDetailP95}`],
  };
}

export function getWebsiteLoadOptions(profile = profileName) {
  const selectedProfile = WEBSITE_LOAD_PROFILES[profile] || WEBSITE_LOAD_PROFILES.smoke;
  const selectedProfileName = WEBSITE_LOAD_PROFILES[profile] ? profile : 'smoke';

  if (!WEBSITE_LOAD_PROFILES[profile]) {
    console.warn(`[k6 website-load] Unknown K6_PROFILE "${profile}". Falling back to smoke.`);
  }

  return {
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    scenarios: {
      public_website_browsing: {
        executor: 'ramping-vus',
        startVUs: 1,
        stages: selectedProfile.stages,
        gracefulRampDown: '30s',
      },
    },
    thresholds: getThresholds(selectedProfileName),
  };
}

export const options = getWebsiteLoadOptions();

const homepageDuration = new Trend('homepage_duration', true);
const storeDuration = new Trend('store_duration', true);
const categoryStoreDuration = new Trend('category_store_duration', true);
const productDetailDuration = new Trend('product_detail_duration', true);
const rateLimitRemaining = new Trend('rate_limit_remaining');
const http429Responses = new Counter('http_429_responses');

function pageUrl(path) {
  return `${FRONTEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function warnIfUnsafeFrontendTarget() {
  const hostMatch = FRONTEND_URL.match(/^https?:\/\/([^/:]+)/i);
  const hostname = hostMatch ? hostMatch[1].toLowerCase() : '';
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'].includes(hostname)
    || hostname.endsWith('.local');

  if (!hostname) {
    console.warn(`[k6 safety] FRONTEND_URL "${FRONTEND_URL}" could not be parsed. The test may fail.`);
    return;
  }

  if (!isLocal) {
    console.warn(
      `[k6 safety] FRONTEND_URL is ${FRONTEND_URL}. Do not run load tests against production without explicit permission.`
    );
  }
}

function getHeader(response, headerName) {
  const lowerHeaderName = headerName.toLowerCase();
  const headerKey = Object.keys(response.headers || {}).find((key) => key.toLowerCase() === lowerHeaderName);
  return headerKey ? response.headers[headerKey] : undefined;
}

function recordRateLimitHeader(response, pageType) {
  const value = getHeader(response, 'ratelimit-remaining') || getHeader(response, 'x-ratelimit-remaining');
  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    rateLimitRemaining.add(numericValue, { page_type: pageType });
  }
}

function recordPageMetrics(response, pageType, durationTrend) {
  durationTrend.add(response.timings.duration, { page_type: pageType });
  recordRateLimitHeader(response, pageType);

  if (response.status === 429) {
    http429Responses.add(1, { page_type: pageType });
  }
}

function expectOkHtml(response, label) {
  return check(response, {
    [`${label} status is 200`]: (res) => res.status === 200,
    [`${label} returned HTML`]: (res) => String(res.headers['Content-Type'] || '').includes('text/html'),
    [`${label} body is not empty`]: (res) => typeof res.body === 'string' && res.body.length > 1000,
  });
}

function discoverFirstCategorySlug() {
  const categoriesResponse = http.get(apiUrl('/api/v1/categories'), {
    tags: { endpoint: 'categories', phase: 'setup' },
  });
  const categoriesPayload = parseJson(categoriesResponse);

  if (!categoriesPayload || !Array.isArray(categoriesPayload.categories)) {
    return null;
  }

  return categoriesPayload.categories.find(
    (category) => category && typeof category.slug === 'string' && category.slug.length > 0
  )?.slug || null;
}

export function setup() {
  warnIfUnsafeFrontendTarget();
  warnIfUnsafeTarget();

  const productsResponse = http.get(apiUrl('/api/v1/products?limit=12&sort=newest'), {
    tags: { endpoint: 'product_list', phase: 'setup' },
  });
  const productsPayload = parseJson(productsResponse);
  const firstProductSlug = getFirstProductSlug(productsPayload);
  const firstCategorySlug = discoverFirstCategorySlug();

  if (!firstProductSlug) {
    console.warn('[k6 website-load] No product slug found. Product detail page requests will be skipped.');
  }

  if (!firstCategorySlug) {
    console.warn('[k6 website-load] No category slug found. Category-filtered store requests will be skipped.');
  }

  return { firstProductSlug, firstCategorySlug };
}

export default function (data) {
  group('homepage', () => {
    const response = http.get(pageUrl('/'), {
      tags: { endpoint: 'homepage', page_type: 'homepage' },
    });
    recordPageMetrics(response, 'homepage', homepageDuration);
    expectOkHtml(response, 'homepage');
  });

  group('store', () => {
    const response = http.get(pageUrl('/store'), {
      tags: { endpoint: 'store', page_type: 'store' },
    });
    recordPageMetrics(response, 'store', storeDuration);
    expectOkHtml(response, 'store');
  });

  if (data.firstCategorySlug) {
    group('category store', () => {
      const response = http.get(pageUrl(`/store?category=${encodeURIComponent(data.firstCategorySlug)}`), {
        tags: { endpoint: 'category_store', page_type: 'category_store' },
      });
      recordPageMetrics(response, 'category_store', categoryStoreDuration);
      expectOkHtml(response, 'category store');
    });
  }

  if (data.firstProductSlug) {
    group('product detail', () => {
      const response = http.get(pageUrl(`/store/${encodeURIComponent(data.firstProductSlug)}`), {
        tags: { endpoint: 'product_detail', page_type: 'product_detail' },
      });
      recordPageMetrics(response, 'product_detail', productDetailDuration);
      expectOkHtml(response, 'product detail');
    });
  }

  sleep(1);
}
