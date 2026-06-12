import pino from 'pino';
import { env } from '../config/env';

const usePrettyTransport = env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== 'false';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: usePrettyTransport ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  } : undefined,
});
