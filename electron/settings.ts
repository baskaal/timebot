import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeWatchFolders } from '../core/folders.ts';
import type { SettingsUpdate, SettingsView } from '../core/types.ts';

const DEFAULT_MODEL = 'gpt-5.6-luna';

export type SettingsData = {
  openaiApiKey: string;
  openaiModel: string;
  watchFolders: string[];
  pollMs: number;
  openAtLogin: boolean;
};

function existing(folders: string[]): string[] {
  return folders.filter((folder) => {
    try {
      return fs.statSync(folder).isDirectory();
    } catch {
      return false;
    }
  });
}

function defaultFolders(): string[] {
  const home = os.homedir();
  const projects = existing(['dev', 'code', 'Projects', 'src'].map((name) => path.join(home, name)));
  if (projects.length > 0) return projects;
  return existing(['Documents', 'Desktop'].map((name) => path.join(home, name)));
}

export class SettingsStore {
  private data: SettingsData;
  private file: string;

  constructor(
    private dir: string,
    private opts: { dataPath: string; packaged: boolean },
  ) {
    this.file = path.join(dir, 'settings.json');
    this.data = this.load();
  }

  get(): SettingsData {
    return { ...this.data, watchFolders: [...this.data.watchFolders] };
  }

  getKey(): string {
    return this.data.openaiApiKey;
  }

  view(): SettingsView {
    return {
      openaiModel: this.data.openaiModel,
      hasKey: this.data.openaiApiKey.length > 0,
      watchFolders: [...this.data.watchFolders],
      openAtLogin: this.data.openAtLogin,
      dataPath: this.opts.dataPath,
      packaged: this.opts.packaged,
    };
  }

  update(input: Partial<SettingsData>): SettingsView {
    this.data = {
      ...this.data,
      ...input,
      watchFolders: input.watchFolders ? [...input.watchFolders] : this.data.watchFolders,
    };
    this.save();
    return this.view();
  }

  apply(update: SettingsUpdate): { ok: true; settings: SettingsView } | { ok: false; error: string } {
    const model = update.openaiModel.trim() || this.data.openaiModel;
    if (model.length > 80 || /[\s\r\n]/.test(model)) {
      return { ok: false, error: 'Enter a model name such as gpt-5.6-luna.' };
    }
    const folders = normalizeWatchFolders(update.watchFolders, os.homedir());
    if (folders.error) return { ok: false, error: folders.error };
    for (const folder of folders.folders) {
      try {
        if (!fs.statSync(folder).isDirectory()) return { ok: false, error: `${folder} is not a folder.` };
      } catch {
        return { ok: false, error: `Can't find ${folder}.` };
      }
    }
    const next: SettingsData = {
      ...this.data,
      openaiModel: model,
      watchFolders: folders.folders,
      openAtLogin: update.openAtLogin,
    };
    if (update.replaceKey) next.openaiApiKey = update.openaiApiKey?.trim() ?? '';
    this.data = next;
    this.save();
    return { ok: true, settings: this.view() };
  }

  private load(): SettingsData {
    const fallback: SettingsData = {
      openaiApiKey: '',
      openaiModel: DEFAULT_MODEL,
      watchFolders: defaultFolders(),
      pollMs: 5000,
      openAtLogin: false,
    };
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<SettingsData>;
      const folders = Array.isArray(parsed.watchFolders)
        ? parsed.watchFolders.filter((item): item is string => typeof item === 'string')
        : [];
      return {
        openaiApiKey: typeof parsed.openaiApiKey === 'string' ? parsed.openaiApiKey : '',
        openaiModel:
          typeof parsed.openaiModel === 'string' && parsed.openaiModel.trim()
            ? parsed.openaiModel.trim()
            : DEFAULT_MODEL,
        watchFolders: folders.length > 0 ? folders : fallback.watchFolders,
        pollMs: typeof parsed.pollMs === 'number' ? Math.min(60_000, Math.max(2000, parsed.pollMs)) : 5000,
        openAtLogin: Boolean(parsed.openAtLogin),
      };
    } catch {
      return fallback;
    }
  }

  private save(): void {
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
    try {
      fs.chmodSync(this.file, 0o600);
    } catch {
      // Windows may ignore the Unix mode.
    }
  }
}
