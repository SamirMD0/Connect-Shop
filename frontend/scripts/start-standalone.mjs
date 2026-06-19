import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const standaloneDir = join(projectRoot, '.next', 'standalone');
const serverPath = join(standaloneDir, 'server.js');

if (!existsSync(serverPath)) {
  console.error('Missing .next/standalone/server.js. Run npm run build before npm run start.');
  process.exit(1);
}

const staticSource = join(projectRoot, '.next', 'static');
const staticTarget = join(standaloneDir, '.next', 'static');
if (existsSync(staticSource)) {
  mkdirSync(dirname(staticTarget), { recursive: true });
  cpSync(staticSource, staticTarget, { recursive: true, force: true });
}

const publicSource = join(projectRoot, 'public');
const publicTarget = join(standaloneDir, 'public');
if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true, force: true });
}

const child = spawn(process.execPath, ['server.js'], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '3000',
    HOSTNAME: process.env.HOSTNAME || 'localhost',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
