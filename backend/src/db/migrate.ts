import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../config/db';
import { logger } from '../utils/logger';

interface MigrationFile {
  id: string;
  path: string;
}

async function listMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDir = path.resolve(process.cwd(), 'src', 'db', 'migrations');
  const entries = await fs.readdir(migrationsDir);

  return entries
    .filter((entry) => /^\d+_.+\.sql$/.test(entry))
    .sort()
    .map((entry) => ({
      id: entry.replace(/\.sql$/, ''),
      path: path.join(migrationsDir, entry),
    }));
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrationIds(): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
}

async function applyMigration(migration: MigrationFile): Promise<void> {
  const sql = await fs.readFile(migration.path, 'utf8');
  const client = await pool.connect();

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
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  await ensureMigrationsTable();
  const [migrations, appliedIds] = await Promise.all([
    listMigrationFiles(),
    getAppliedMigrationIds(),
  ]);

  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));

  for (const migration of pending) {
    await applyMigration(migration);
  }

  logger.info({ applied: pending.length }, 'Database migrations complete');
  await pool.end();
}

void main().catch(async (err) => {
  logger.error({ err }, 'Database migration runner failed');
  await pool.end();
  process.exit(1);
});
