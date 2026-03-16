export type Block = {
  id: string;
  key: string;
  kind: 'app' | 'web';
  app: string;
  title: string;
  titles: string[];
  url?: string;
  domain?: string;
  start: number;
  end: number;
};

export type Sample = {
  ts: number;
  app: string;
  title: string;
  url?: string;
  domain?: string;
};

export type FileChange = 'add' | 'change' | 'unlink';

export type FileEvent = {
  id: string;
  ts: number;
  path: string;
  name: string;
  ext: string;
  change: FileChange;
  diff?: string;
  added: number;
  removed: number;
  note?: string;
};

export type PageHit = {
  day: string;
  url: string;
  domain: string;
  title: string;
  browser: string;
  firstSeen: number;
  lastSeen: number;
  open: boolean;
};

export type SummaryRecord = {
  day: string;
  content: string;
  createdAt: number;
  model: string;
};

export type SiteStat = {
  domain: string;
  browsers: string[];
  activeMs: number;
  open: boolean;
  titles: string[];
  urls: string[];
  lastSeen: number;
};

export type Overview = {
  day: string;
  blocks: Block[];
  files: Array<FileEvent & { displayPath: string }>;
  sites: SiteStat[];
  summary: SummaryRecord | null;
  totals: {
    trackedMs: number;
    webMs: number;
    appMs: number;
    fileCount: number;
  };
  range: { start: number; end: number };
};

export type TrackerStatus = {
  platform: string;
  permissionHint: string | null;
  lastError: string | null;
  lastSample: {
    app: string;
    title: string;
    url?: string;
    domain?: string;
    ts: number;
  } | null;
  watchFolders: string[];
  fileWatching: boolean;
};

export type SettingsView = {
  openaiModel: string;
  hasKey: boolean;
  watchFolders: string[];
  openAtLogin: boolean;
  dataPath: string;
  packaged: boolean;
};

export type SettingsUpdate = {
  openaiModel: string;
  openaiApiKey?: string;
  replaceKey: boolean;
  watchFolders: string[];
  openAtLogin: boolean;
};

export type SaveResult =
  | { ok: true; settings: SettingsView }
  | { ok: false; error: string };

export type SummaryResult =
  | { ok: true; summary: SummaryRecord }
  | { ok: false; error: string };

export type TimebotApi = {
  platform: string;
  eventDays(): Promise<string[]>;
  getOverview(day: string): Promise<Overview>;
  summarize(day: string): Promise<SummaryResult>;
  getSettings(): Promise<SettingsView>;
  saveSettings(input: SettingsUpdate): Promise<SaveResult>;
  pickFolder(): Promise<string | null>;
  getStatus(): Promise<TrackerStatus>;
  showDataFolder(): Promise<{ path: string }>;
  clearHistory(): Promise<void>;
  onActivity(cb: () => void): () => void;
};
