// backend/src/db/paths.ts
import fs from 'fs';
import path from 'path';

/**
 * Resolve a SQL asset that lives alongside the database code.
 *
 * `tsc` does not emit `.sql`, so `npm run build` runs `scripts/copy-db-assets.mjs` to
 * place them in `dist/db`. The co-located copy is therefore tried first, which keeps a
 * production deployment self-contained — it never reaches back into `src`.
 *
 * Candidates, in order:
 *   1. `<dirname>/<name>`              — `dist/db` in production, `src/db` under tsx
 *   2. `<repo>/backend/src/db/<name>`  — `dist/db` falling back to source
 *   3. `<cwd>/src/db/<name>`           — invoked from the backend directory
 */
export function resolveDbAssetPath(name: string): string {
  const candidates = [
    path.join(__dirname, name),
    path.join(__dirname, '..', '..', 'src', 'db', name),
    path.resolve(process.cwd(), 'src', 'db', name),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));

  if (!found) {
    throw new Error(
      `Unable to locate database asset "${name}". Tried:\n${candidates.map((c) => `  • ${c}`).join('\n')}`
    );
  }

  return found;
}
