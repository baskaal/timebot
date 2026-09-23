import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from './bundle.mjs';
import { writeIcons } from './make-icon.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
writeIcons(path.join(root, 'assets'));
await bundle();
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const result = spawnSync(process.execPath, [vite, 'build'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
