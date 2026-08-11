// backend/scripts/copy-db-assets.mjs
//
// `tsc` only emits JavaScript, so the SQL that drives schema setup and migrations
// would be missing from `dist`. Copy it in after compilation so the build output is
// self-contained and `dist/db/deploy.js` never has to reach back into `src`.
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDbDir = path.join(backendRoot, 'src', 'db');
const distDbDir = path.join(backendRoot, 'dist', 'db');

const FILES = ['schema.sql', 'seed.sql'];
const DIRECTORIES = ['migrations'];

async function main() {
  await mkdir(distDbDir, { recursive: true });

  for (const file of FILES) {
    await cp(path.join(srcDbDir, file), path.join(distDbDir, file));
  }

  for (const directory of DIRECTORIES) {
    await cp(path.join(srcDbDir, directory), path.join(distDbDir, directory), {
      recursive: true,
      filter: (source) => !source.endsWith('.ts') && !source.endsWith('.js'),
    });
  }

  const copied = await readdir(path.join(distDbDir, 'migrations'));
  const migrationCount = copied.filter((entry) => entry.endsWith('.sql')).length;

  console.log(
    `Copied ${FILES.length} SQL file(s) and ${migrationCount} migration(s) into dist/db`
  );
}

main().catch((err) => {
  console.error('Failed to copy database assets into dist:', err);
  process.exit(1);
});
