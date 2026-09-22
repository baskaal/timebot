import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const mainOptions = {
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist-electron/main.cjs',
  external: ['electron'],
  target: 'node20',
  sourcemap: true,
};

export const preloadOptions = {
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist-electron/preload.cjs',
  external: ['electron'],
  target: 'node20',
  sourcemap: true,
};

export async function bundle() {
  await build(mainOptions);
  await build(preloadOptions);
}

export function startElectron() {
  const electronBinary = createRequire(import.meta.url)('electron');
  return spawn(electronBinary, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TIMEBOT_DEV: '1' },
  });
}
