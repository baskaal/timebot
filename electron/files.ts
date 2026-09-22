import fs from 'node:fs';
import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import { normalizeNewlines } from '../core/diffText.ts';
import { interpretSave, manyFilesEvent, shouldIgnoreWatchPath, shouldTrackFile } from '../core/files.ts';
import type { FileEvent } from '../core/types.ts';
import type { Snapshots } from './snapshots.ts';

const MAX_BYTES = 200_000;

export function watchFolders(options: {
  folders: string[];
  home: string;
  snapshots: Snapshots;
  onEvent: (event: FileEvent) => void;
}): FSWatcher | null {
  const folders = options.folders.filter((folder) => {
    try {
      return fs.statSync(folder).isDirectory();
    } catch {
      return false;
    }
  });
  if (folders.length === 0) return null;

  let burst = 0;
  let burstStart = 0;
  let skippedBurst = false;
  const pending = new Map<string, NodeJS.Timeout>();

  const watcher = watch(folders, {
    ignoreInitial: true,
    followSymlinks: false,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    atomic: true,
    ignorePermissionErrors: true,
    ignored: (filePath: string) => {
      if (shouldIgnoreWatchPath(filePath, options.home)) return true;
      const base = path.basename(filePath);
      if (!path.extname(base) && !base.includes('.')) return false;
      return !shouldTrackFile(filePath, options.home);
    },
  });

  const readOne = async (filePath: string, change: 'add' | 'change' | 'unlink') => {
    try {
      if (!shouldTrackFile(filePath, options.home)) return;
      if (change === 'unlink') {
        const previous = options.snapshots.read(filePath);
        const event = interpretSave({ filePath, change, previous, next: null, ts: Date.now() });
        options.snapshots.remove(filePath);
        if (event) options.onEvent(event);
        return;
      }
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) return;
      if (stat.size > MAX_BYTES) {
        const event = interpretSave({
          filePath,
          change,
          previous: null,
          next: null,
          ts: Date.now(),
          tooBig: true,
        });
        if (event) options.onEvent(event);
        return;
      }
      const buffer = await fs.promises.readFile(filePath);
      if (buffer.includes(0)) return;
      const next = normalizeNewlines(buffer.toString('utf8'));
      const previous = options.snapshots.read(filePath);
      const event = interpretSave({ filePath, change, previous, next, ts: Date.now() });
      options.snapshots.write(filePath, next);
      if (event) options.onEvent(event);
    } catch (error) {
      console.error('Timebot file watch', error);
    }
  };

  const handle = (filePath: string, change: 'add' | 'change' | 'unlink') => {
    const now = Date.now();
    if (now - burstStart > 10_000) {
      burst = 0;
      burstStart = now;
      skippedBurst = false;
    }
    burst += 1;
    if (burst > 40) {
      if (!skippedBurst) {
        skippedBurst = true;
        options.onEvent(manyFilesEvent(now));
      }
      return;
    }
    const existing = pending.get(filePath);
    if (existing) clearTimeout(existing);
    pending.set(
      filePath,
      setTimeout(() => {
        pending.delete(filePath);
        void readOne(filePath, change);
      }, 200),
    );
  };

  watcher.on('add', (filePath) => handle(filePath, 'add'));
  watcher.on('change', (filePath) => handle(filePath, 'change'));
  watcher.on('unlink', (filePath) => handle(filePath, 'unlink'));
  watcher.on('error', (error) => console.error('Timebot watcher', error));
  return watcher;
}
