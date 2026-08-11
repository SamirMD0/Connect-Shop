// backend/src/server.ts
import './config/sentry';
import app from './app';
import { env } from './config/env';
import { connectDB, pool } from './config/db';
import { logger } from './utils/logger';
import { startMaintenanceScheduler } from './services/maintenance.service';
import { resolveDbAssetPath } from './db/paths';
import fs from 'fs';

/**
 * Initialize the database schema by running schema.sql and seed.sql.
 * Idempotent — all statements use IF NOT EXISTS / ON CONFLICT.
 *
 * Local/development convenience only. Production uses `npm run migrate:prod`,
 * which runs the schema and migrations in order before the server starts.
 */
async function initializeDatabase(): Promise<void> {
  try {
    const schemaSql = fs.readFileSync(resolveDbAssetPath('schema.sql'), 'utf-8');
    const seedSql = fs.readFileSync(resolveDbAssetPath('seed.sql'), 'utf-8');

    logger.info('📦 Running database schema initialization...');
    await pool.query(schemaSql);
    logger.info('✅ Database schema initialized');

    logger.info('🌱 Running database seed...');
    await pool.query(seedSql);
    logger.info('✅ Database seeded');
  } catch (err) {
    logger.error({ err }, '❌ Database initialization failed');
    throw err;
  }
}

/**
 * Start the application
 */
async function main(): Promise<void> {
  try {
    // 1. Verify database connectivity
    await connectDB();

    // 2. Run schema + seed (idempotent)
    if (process.env.INITIALIZE_DATABASE === 'true') {
      await initializeDatabase();
    }

    // 3. Start scheduled cleanup jobs
    const maintenanceTimer = startMaintenanceScheduler();

    // 4. Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info(`\n🚀 ElecSHOP API server listening on port ${env.PORT}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   Frontend:    ${env.FRONTEND_URL}`);
      logger.info(`   Health:      http://localhost:${env.PORT}/api/health\n`);
    });

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, () => {
        logger.info(`\n⏳ Received ${signal}. Shutting down gracefully...`);
        if (server) {
          server.close(async () => {
            clearInterval(maintenanceTimer);
            await pool.end();
            logger.info('👋 Server shut down.');
            process.exit(0);
          });

          // Force shutdown after 10 seconds
          setTimeout(() => {
            logger.error('⚠️  Forced shutdown after timeout');
            process.exit(1);
          }, 10_000);
        } else {
          process.exit(0);
        }
      });
    });
  } catch (err) {
    logger.error({ err }, '💥 Fatal startup error');
    process.exit(1);
  }
}

main();
