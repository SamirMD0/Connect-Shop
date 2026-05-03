// backend/src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import xss from 'xss-clean';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './utils/errors';

// Route imports
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import adminRoutes from './routes/admin.routes';
import carouselRoutes from './routes/carousel.routes';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());                          // Secure HTTP headers
app.use(cors(corsOptions));                 // Strict CORS
app.use(generalLimiter);                    // Rate limiting (100/15min)

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));   // Limit body size to prevent abuse
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser(env.SESSION_SECRET));  // Signed cookies
app.use(xss());                             // Sanitize data against XSS

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
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
import { listCategories } from './controllers/products.controller';
app.get('/api/categories', listCategories);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/carousel', carouselRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
