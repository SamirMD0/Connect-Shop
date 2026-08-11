import { promises as fs } from 'fs';
import path from 'path';
import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import { logger } from '../utils/logger';
import { resolveDbAssetPath } from './paths';

interface MigrationFile {
  id: string;
  path: string;
}

async function listMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDir = resolveDbAssetPath('migrations');
  const entries = await fs.readdir(migrationsDir);

  return entries
    .filter((entry) => /^\d+_.+\.sql$/.test(entry))
    .sort()
    .map((entry) => ({
      id: entry.replace(/\.sql$/, ''),
      path: path.join(migrationsDir, entry),
    }));
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrationIds(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ id: string }>('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
}

async function applyMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  const sql = await fs.readFile(migration.path, 'utf8');

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
    await client.query('COMMIT');
    logger.info({ migration: migration.id }, 'Applied database migration');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, migration: migration.id }, 'Database migration failed');
    throw err;
  }
}

/**
 * Apply every migration that is not yet recorded in `schema_migrations`.
 *
 * Idempotent: already-applied migrations are skipped, so this is safe to run on
 * every deployment. Takes a caller-supplied client so callers can hold a session
 * scoped advisory lock across the whole run.
 *
 * @returns the number of migrations applied by this run.
 */
export async function runMigrations(client: PoolClient): Promise<number> {
  await ensureMigrationsTable(client);

  const [migrations, appliedIds] = await Promise.all([
    listMigrationFiles(),
    getAppliedMigrationIds(client),
  ]);

  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));

  for (const migration of pending) {
    await applyMigration(client, migration);
  }

  return pending.length;
}

async function main(): Promise<void> {
  const client = await pool.connect();

  try {
    const applied = await runMigrations(client);
    logger.info({ applied }, 'Database migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(async (err) => {
      logger.error({ err }, 'Database migration runner failed');
      await pool.end().catch(() => undefined);
      process.exit(1);
    });
}
