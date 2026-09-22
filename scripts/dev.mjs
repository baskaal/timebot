import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mainOptions, preloadOptions, startElectron } from './bundle.mjs';
import { writeIcons } from './make-icon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
writeIcons(path.join(root, 'assets'));

let electron;
let stopping = false;
let ready = false;
let vite;

const wait = async (url) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const shutdown = (code) => {
  if (stopping) return;
  stopping = true;
  if (electron && !electron.killed) electron.kill();
  if (vite && !vite.killed) vite.kill();
  process.exit(code);
};

const queueRestart = () => {
  if (stopping || !ready) return;
  clearTimeout(queueRestart.timer);
  queueRestart.timer = setTimeout(() => {
    void restartElectron();
  }, 250);
};

const restartElectron = async () => {
  if (stopping) return;
  if (electron) {
    const old = electron;
    electron = null;
    old.kill();
    await new Promise((resolve) => old.once('exit', resolve));
  }
  if (stopping) return;
  const child = startElectron();
  electron = child;
  child.on('exit', (code) => {
    if (electron === child) shutdown(code ?? 0);
  });
};

const main = await context({
  ...mainOptions,
  plugins: [
    {
      name: 'restart',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) queueRestart();
        });
      },
    },
  ],
});
const preload = await context({
  ...preloadOptions,
  plugins: [
    {
      name: 'restart-preload',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) queueRestart();
        });
      },
    },
  ],
});

await main.rebuild();
await preload.rebuild();
await main.watch();
await preload.watch();

vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', '5173', '--strictPort'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
vite.on('exit', (code) => {
  if (!stopping) shutdown(code ?? 1);
});

await wait('http://127.0.0.1:5173');
ready = true;
queueRestart();

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
