import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import nextRootDirs from '@next/eslint-plugin-next/dist/utils/get-root-dirs.js';

const { getRootDirs } = nextRootDirs;
const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));

// The pinned npm override replaces the plugin's only fast-glob API, globSync.
// Exercise the plugin itself so changes to its API usage cannot pass silently.
const fixture = fs.mkdtempSync(path.join(scriptDirectory, '.eslint-roots-'));
for (const directory of ['apps/shop', 'apps/admin', 'packages/ui']) {
  fs.mkdirSync(path.join(fixture, directory), { recursive: true });
}
fs.writeFileSync(path.join(fixture, 'apps/readme.txt'), 'file, not a root directory');
after(() => fs.rmSync(fixture, { recursive: true, force: true }));

// Both absolute and relative roots are consumed via path.join by lint rules.
const normalize = (values) => values.map((value) => path.resolve(value).replace(/\\/g, '/')).sort();
const roots = (rootDir) => normalize(getRootDirs({
  cwd: fixture,
  settings: rootDir === undefined ? {} : { next: { rootDir } },
}));
const expected = (...directories) => normalize(directories.map((directory) => path.join(fixture, directory)));

test('default root remains the ESLint working directory', () => {
  assert.deepEqual(roots(), expected(''));
});

test('explicit root resolves a directory', () => {
  assert.deepEqual(roots(path.join(fixture, 'apps/shop')), expected('apps/shop'));
});

test('wildcard roots exclude files', () => {
  assert.deepEqual(roots(path.join(fixture, 'apps/*')), expected('apps/shop', 'apps/admin'));
});

test('brace patterns resolve both roots', () => {
  assert.deepEqual(roots(path.join(fixture, 'apps/{shop,admin}')), expected('apps/shop', 'apps/admin'));
});

test('array roots resolve multiple patterns and ignore non-string entries', () => {
  assert.deepEqual(roots([path.join(fixture, 'apps/*'), path.join(fixture, 'packages/*'), null]),
    expected('apps/shop', 'apps/admin', 'packages/ui'));
});

test('Windows-style separators are normalized', () => {
  assert.deepEqual(roots(path.join(fixture, 'apps/*').replace(/\//g, '\\')),
    expected('apps/shop', 'apps/admin'));
});

test('unmatched roots return an empty array', () => {
  assert.deepEqual(roots(path.join(fixture, 'missing/*')), []);
});
