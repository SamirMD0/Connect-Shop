import pino from 'pino';
import { env } from '../config/env';

const usePrettyTransport = env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== 'false';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-connect-shop-ssr-secret"]',
      'req.headers["x-csrf-token"]',
      'req.query.code',
      'req.query.state',
      'req.query.token',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  transport: usePrettyTransport ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  } : undefined,
});
