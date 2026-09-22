import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const entryPoints = readdirSync('tests')
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => `tests/${file}`);

await build({
  entryPoints,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist-tests',
  target: 'node20',
});

const files = readdirSync('dist-tests')
  .filter((file) => file.endsWith('.test.js'))
  .map((file) => `dist-tests/${file}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
