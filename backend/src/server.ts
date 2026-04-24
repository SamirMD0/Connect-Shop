// backend/src/server.ts
import app from './app';
import { env } from './config/env';
import { connectDB, pool } from './config/db';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the database schema by running schema.sql and seed.sql.
 * Idempotent — all statements use IF NOT EXISTS / ON CONFLICT.
 */
async function initializeDatabase(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    const seedPath = path.join(__dirname, '..', 'src', 'db', 'seed.sql');

    // In dev mode with tsx, __dirname is the src folder directly
    const schemaPathAlt = path.join(__dirname, 'db', 'schema.sql');
    const seedPathAlt = path.join(__dirname, 'db', 'seed.sql');

    const schemaFile = fs.existsSync(schemaPath) ? schemaPath : schemaPathAlt;
    const seedFile = fs.existsSync(seedPath) ? seedPath : seedPathAlt;

    const schemaSql = fs.readFileSync(schemaFile, 'utf-8');
    const seedSql = fs.readFileSync(seedFile, 'utf-8');

    console.log('📦 Running database schema initialization...');
    await pool.query(schemaSql);
    console.log('✅ Database schema initialized');

    console.log('🌱 Running database seed...');
    await pool.query(seedSql);
    console.log('✅ Database seeded');
  } catch (err) {
    console.error('❌ Database initialization failed:', (err as Error).message);
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
    await initializeDatabase();

    // 3. Start HTTP server
    const server = app.listen(env.PORT, () => {
      console.log(`\n🚀 ElecSHOP API server listening on port ${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Frontend:    ${env.FRONTEND_URL}`);
      console.log(`   Health:      http://localhost:${env.PORT}/api/health\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n⏳ Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await pool.end();
        console.log('👋 Server shut down.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('💥 Fatal startup error:', err);
    process.exit(1);
  }
}

main();
