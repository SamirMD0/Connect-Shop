// backend/src/db/deploy.ts
//
// Production database deployment step.
//
// Applies the idempotent base schema, then any pending migrations, against the
// direct (non-pooled) connection. Intended to run in the Render Start Command
// *before* the long-running server:
//
//   npm run migrate:prod && node dist/db/bootstrapSuperAdmin.js && npm start
//
// Exits 0 only when the schema is fully up to date, so a failure stops the
// deployment instead of starting the server against an invalid schema.
import { promises as fs } from 'fs';
import { Pool } from 'pg';
import { buildPoolConfig, describeConnectionTarget, isPooledEndpoint } from '../config/db';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { runMigrations } from './migrate';
import { resolveDbAssetPath } from './paths';

// Arbitrary but fixed key so overlapping deployments serialise instead of racing.
const DEPLOY_ADVISORY_LOCK_KEY = '4021789';

const LOCK_TIMEOUT_MS = 30_000;

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
      await client.query(`SET lock_timeout = ${LOCK_TIMEOUT_MS}`);
      await client.query('SELECT pg_advisory_lock($1)', [DEPLOY_ADVISORY_LOCK_KEY]);

      const schemaPath = resolveDbAssetPath('schema.sql');
      const schemaSql = await fs.readFile(schemaPath, 'utf8');
      logger.info('Applying base schema (idempotent)');
      await client.query(schemaSql);

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
