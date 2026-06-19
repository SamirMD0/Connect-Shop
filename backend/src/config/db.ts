// backend/src/config/db.ts
import { Pool, PoolClient } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';
import { logSlowQuery } from '../utils/performance';

// Single connection pool shared across the application
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,               // Maximum pool size
  idleTimeoutMillis: 30_000,  // Close idle clients after 30s
  connectionTimeoutMillis: 5_000, // Fail fast if a connection can't be acquired
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
});

// Log pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  logger.error({ err }, '❌ Unexpected PostgreSQL pool error');
});

/**
 * Verify the database is reachable on startup.
 * Throws if the connection cannot be established.
 */
export async function connectDB(): Promise<void> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() AS now, current_database() AS db');
    const { now, db } = result.rows[0] as { now: string; db: string };
    logger.info(`✅ PostgreSQL connected — database: "${db}" at ${now}`);
  } catch (err) {
    logger.error({ err }, '❌ Failed to connect to PostgreSQL');
    process.exit(1);
  } finally {
    client?.release();
  }
}

/**
 * Run a query using the shared pool.
 * Prefer this helper over importing pool directly for simple queries.
 */
export async function query<T extends Record<string, any> = Record<string, any>>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const start = performance.now();
  const result = await pool.query<T>(text, values);
  logSlowQuery(text, performance.now() - start, result.rowCount);
  return result.rows;
}

/**
 * Execute multiple statements inside a single transaction.
 * Automatically commits on success, rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
