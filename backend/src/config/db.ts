// backend/src/config/db.ts
import { Pool, PoolClient, PoolConfig } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';
import { logSlowQuery } from '../utils/performance';

const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_BASE_DELAY_MS = 1_000;
const CONNECT_MAX_DELAY_MS = 8_000;

/**
 * Host only — never the full connection string, which contains the password.
 * Returns a placeholder rather than throwing on an unparsable value.
 */
export function describeConnectionTarget(connectionString: string): string {
  try {
    return new URL(connectionString).host;
  } catch {
    return '<unparsable connection string>';
  }
}

/**
 * A pooled endpoint (PgBouncer in transaction mode, which is what Neon's `-pooler`
 * host runs) only accepts the startup parameters it can track: client_encoding,
 * datestyle, timezone, standard_conforming_strings and application_name.
 *
 * `pg` puts `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`
 * and `options` into the startup packet (see `Client.getStartupConf`), so any of those
 * fails a pooled connection with "unsupported startup parameter".
 */
export function isPooledEndpoint(connectionString: string): boolean {
  try {
    return new URL(connectionString).hostname.includes('-pooler.');
  } catch {
    return false;
  }
}

/**
 * Whether the connection string asks for TLS. Channel binding is only meaningful —
 * and only possible — over a TLS stream, because it hashes the server certificate.
 */
export function usesTls(connectionString: string): boolean {
  try {
    const params = new URL(connectionString).searchParams;
    const sslmode = params.get('sslmode');

    if (sslmode) {
      return sslmode !== 'disable';
    }

    const ssl = params.get('ssl');
    return ssl === 'true' || ssl === '1';
  } catch {
    return false;
  }
}

// `enableChannelBinding` is implemented by pg (Client.getStartupConf's sibling SASL
// path) but is not yet declared in @types/pg.
type ExtendedPoolConfig = PoolConfig & { enableChannelBinding?: boolean };

export interface BuildPoolConfigOptions {
  /**
   * Query time limit in milliseconds. Defaults to `DB_STATEMENT_TIMEOUT_MS`.
   * Pass `0` for pools that run schema migrations, where DDL must not be cut short.
   */
  statementTimeoutMs?: number;
}

/**
 * Build the pg pool configuration for a connection string.
 *
 * TLS is configured exclusively through the connection string (`?sslmode=verify-full`),
 * so no `ssl` object is set here — that keeps certificate verification enabled and
 * avoids conflicting with URL parameters.
 */
export function buildPoolConfig(
  connectionString: string,
  options: BuildPoolConfigOptions = {}
): ExtendedPoolConfig {
  const timeoutMs = options.statementTimeoutMs ?? env.DB_STATEMENT_TIMEOUT_MS;

  const config: ExtendedPoolConfig = {
    connectionString,
    max: 20,                          // Maximum pool size
    idleTimeoutMillis: 30_000,        // Close idle clients after 30s
    connectionTimeoutMillis: 15_000,  // Allow for a serverless database waking from idle
    application_name: 'elecshop-api',
    // Negotiate SCRAM-SHA-256-PLUS when the server offers it. Requires a TLS stream,
    // so only enable it when the connection string actually asks for TLS.
    enableChannelBinding: usesTls(connectionString),
  };

  if (timeoutMs > 0) {
    // Client-side deadline. Never sent in the startup packet, so it works on pooled
    // and direct endpoints alike.
    config.query_timeout = timeoutMs;

    if (!isPooledEndpoint(connectionString)) {
      // True server-side cancellation. Only available where the startup parameter is
      // accepted, which excludes transaction-mode poolers.
      config.statement_timeout = timeoutMs;
    }
  }

  return config;
}

// Single connection pool shared across the application
export const pool = new Pool(buildPoolConfig(env.DATABASE_URL));

// Log pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  logger.error({ err }, '❌ Unexpected PostgreSQL pool error');
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify the database is reachable on startup.
 *
 * Retries a bounded number of times so a serverless database waking from idle does
 * not turn into a boot loop. Real errors are still surfaced and still stop the
 * process once the attempts are exhausted.
 */
export async function connectDB(): Promise<void> {
  const host = describeConnectionTarget(env.DATABASE_URL);

  for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt += 1) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT NOW() AS now, current_database() AS db');
      const { now, db } = result.rows[0] as { now: string; db: string };
      logger.info(`✅ PostgreSQL connected — database: "${db}" at ${now}`);
      return;
    } catch (err) {
      if (attempt === CONNECT_MAX_ATTEMPTS) {
        logger.error({ err, host, attempts: attempt }, '❌ Failed to connect to PostgreSQL');
        process.exit(1);
      }

      const delayMs = Math.min(CONNECT_BASE_DELAY_MS * 2 ** (attempt - 1), CONNECT_MAX_DELAY_MS);
      logger.warn(
        { err, host, attempt, maxAttempts: CONNECT_MAX_ATTEMPTS, delayMs },
        '⏳ PostgreSQL not reachable yet — retrying'
      );
      await sleep(delayMs);
    } finally {
      client?.release();
    }
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
 *
 * `SET LOCAL statement_timeout` gives genuine server-side cancellation and reverts at
 * COMMIT/ROLLBACK. Unlike the startup parameter it is accepted by transaction-mode
 * poolers, because the pooler guarantees one server connection for the transaction.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (env.DB_STATEMENT_TIMEOUT_MS > 0) {
      await client.query(`SET LOCAL statement_timeout = ${env.DB_STATEMENT_TIMEOUT_MS}`);
    }
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
