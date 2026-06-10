import * as Sentry from '@sentry/nextjs';
import { getClientTracesSampleRate, sanitizeSentryEvent } from './sentry.shared';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: getClientTracesSampleRate(),
    beforeSend: sanitizeSentryEvent,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

