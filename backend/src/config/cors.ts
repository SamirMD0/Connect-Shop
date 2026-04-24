// backend/src/config/cors.ts
import { CorsOptions } from 'cors';
import { env } from './env';

/**
 * Strict CORS policy:
 *  - Only the frontend origin is whitelisted
 *  - credentials: true allows cookies to be sent cross-origin
 *  - Only the methods our API actually uses are permitted
 *  - Preflight responses are cached for 10 minutes
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    // only in development mode
    if (!origin) {
      if (env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS: Missing Origin header'), false);
    }

    if (origin === env.FRONTEND_URL) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS: Origin "${origin}" is not allowed`),
      false
    );
  },

  // Must be true to allow the browser to send httpOnly cookies
  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ],

  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],

  // Cache preflight response for 10 minutes (600 seconds)
  maxAge: 600,
};
