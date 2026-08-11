import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Vercel builds through its own deployment adapter and manages `output` itself, so
// setting `standalone` there is unsupported and leaves the build output in a shape its
// adapter does not expect. Standalone is still required by the self-hosted and Docker
// paths (scripts/start-standalone.mjs, frontend/Dockerfile), so it stays on elsewhere.
const isVercelBuild = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(isVercelBuild ? {} : { output: 'standalone' as const }),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

const sentrySourceMapsEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !sentrySourceMapsEnabled,
  },
  release: {
    create: sentrySourceMapsEnabled,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
