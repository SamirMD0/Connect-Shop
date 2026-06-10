// backend/src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import xss from 'xss-clean';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from './utils/logger';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrf';
import { sanitizeInput } from './middleware/sanitize';
import { errorHandler } from './utils/errors';
import { setupSentryExpressErrorHandler } from './config/sentry';

// Route imports
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import adminRoutes from './routes/admin.routes';
import carouselRoutes from './routes/carousel.routes';
import categoriesRoutes from './routes/categories.routes';
import brandsRoutes from './routes/brands.routes';
import reviewRoutes from './routes/review.routes';
import wishlistRoutes from './routes/wishlist.routes';
import usersRoutes from './routes/users.routes';
import homepageRoutes from './routes/homepage.routes';

const app = express();

// Trust the first deployment proxy (Render/load balancer) so req.ip and
// rate-limit keys use the client IP instead of the immediate proxy address.
app.set('trust proxy', 1);

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());                          // Secure HTTP headers
app.use(cors(corsOptions));                 // Strict CORS
app.use(generalLimiter);                    // Rate limiting (100/15min)

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(pinoHttp({
  logger,
  genReqId: function (req, res) {
    const id = String(req.id || req.headers['x-request-id'] || randomUUID());
    res.setHeader('X-Request-ID', id);
    return id;
  }
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use('/api/v1/admin/uploads/image', express.json({ limit: '7mb' }));
app.use(express.json({ limit: '10kb' }));   // Limit body size to prevent abuse
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser(env.SESSION_SECRET));  // Signed cookies
app.use(sanitizeInput);                      // Normalize and strip control characters from all input
app.use(xss());                             // Sanitize data against XSS
app.use(csrfProtection);                    // CSRF protection for unsafe cookie-authenticated requests

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'ElecSHOP API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/brands', brandsRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/carousel', carouselRoutes);
app.use('/api/v1/homepage', homepageRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/users', usersRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
setupSentryExpressErrorHandler(app);
app.use(errorHandler);

export default app;
