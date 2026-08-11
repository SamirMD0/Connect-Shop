// backend/src/db/deploy.ts
//
// Production database deployment step.
//
// Applies the base schema once, then any pending migrations, against the direct
// (non-pooled) connection. Because the Render Start Command runs on every process
// start — deploys, crash restarts, free-tier spin-up — the base schema is guarded by a
// sentinel so restarts do not repeatedly re-execute 1000+ lines of DDL, re-create
// constraints, or take table locks on a live database.
//
// Intended to run in the Render Start Command *before* the long-running server:
//
//   npm run migrate:prod && node dist/db/bootstrapSuperAdmin.js && npm start
//
// Exits 0 only when the schema is fully up to date, so a failure stops the
// deployment instead of starting the server against an invalid schema.
import { promises as fs } from 'fs';
import { Pool, PoolClient } from 'pg';
import { buildPoolConfig, describeConnectionTarget, isPooledEndpoint } from '../config/db';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ensureMigrationsTable, runMigrations } from './migrate';
import { resolveDbAssetPath } from './paths';

// Arbitrary but fixed key so overlapping deployments serialise instead of racing.
const DEPLOY_ADVISORY_LOCK_KEY = '4021789';

// Sentinel recorded in `schema_migrations` once — and only once — the base schema has
// been applied in full. It sorts before every real migration id and matches no
// migration file, so the normal runner never touches it.
const BASE_SCHEMA_ID = '000_base_schema';

// Waiting for another deployment's advisory lock is normal and can legitimately take
// as long as a full bootstrap, so it gets a far more generous budget than the
// table-level locks taken by DDL once we are the ones holding it.
const ADVISORY_LOCK_WAIT_MS = 180_000;
const DDL_LOCK_TIMEOUT_MS = 30_000;

/**
 * Has the base schema been applied in full?
 *
 * The sentinel is written in the same transaction as `schema.sql` itself, so a run
 * that dies part-way leaves neither the tables nor the marker behind. A partially
 * initialised database therefore reports `false` and gets a complete retry.
 */
async function isBaseSchemaApplied(client: PoolClient): Promise<boolean> {
  const result = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [
    BASE_SCHEMA_ID,
  ]);

  return (result.rowCount ?? 0) > 0;
}

/**
 * Apply `schema.sql` and record the sentinel atomically.
 *
 * PostgreSQL DDL is transactional, so wrapping the whole file in one transaction means
 * the database moves from "no base schema" to "base schema plus sentinel" in a single
 * step, with no observable state in between.
 */
async function applyBaseSchema(client: PoolClient): Promise<void> {
  const schemaSql = await fs.readFile(resolveDbAssetPath('schema.sql'), 'utf8');

  try {
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [BASE_SCHEMA_ID]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

async function main(): Promise<void> {
  const connectionString = env.DIRECT_DATABASE_URL ?? env.DATABASE_URL;
  const usingDirectUrl = env.DIRECT_DATABASE_URL !== undefined;

  if (isPooledEndpoint(connectionString)) {
    logger.warn(
      'Running database deployment through a pooled endpoint. Set DIRECT_DATABASE_URL to the direct connection string for reliable advisory locks and long-running DDL.'
    );
  }

  // statementTimeoutMs: 0 — schema and index DDL routinely runs longer than the
  // application query budget and must not be interrupted.
  const pool = new Pool(buildPoolConfig(connectionString, { statementTimeoutMs: 0 }));

  try {
    const client = await pool.connect();
    logger.info(
      { host: describeConnectionTarget(connectionString), usingDirectUrl },
      'Starting database deployment'
    );

    try {
      // DDL must not be cut short by the application statement timeout.
      await client.query('SET statement_timeout = 0');

      // Held for the whole run: base schema and migrations both happen under it, so a
      // concurrent deployment waits rather than interleaving with either half.
      await client.query(`SET lock_timeout = ${ADVISORY_LOCK_WAIT_MS}`);
      await client.query('SELECT pg_advisory_lock($1)', [DEPLOY_ADVISORY_LOCK_KEY]);
      await client.query(`SET lock_timeout = ${DDL_LOCK_TIMEOUT_MS}`);

      // The ledger must exist before the sentinel can be read or written.
      await ensureMigrationsTable(client);

      if (await isBaseSchemaApplied(client)) {
        logger.info('Base schema already applied; checking migrations only');
      } else {
        logger.info('Applying base schema');
        await applyBaseSchema(client);
        logger.info('Base schema applied');
      }

      const applied = await runMigrations(client);
      logger.info({ applied }, 'Database deployment complete');
    } finally {
      await client
        .query('SELECT pg_advisory_unlock($1)', [DEPLOY_ADVISORY_LOCK_KEY])
        .catch(() => undefined);
      client.release();
    }
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Database deployment failed');
    process.exit(1);
  });
