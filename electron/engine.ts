import os from 'node:os';
import type { FSWatcher } from 'chokidar';
import { isBrowser, isIdleApp, normalizeApp } from '../core/apps.ts';
import { dayKey } from '../core/day.ts';
import { buildOverview } from '../core/overview.ts';
import { Sessionizer } from '../core/sessionizer.ts';
import type { Store } from '../core/store.ts';
import type { FileEvent, Overview, SummaryRecord, TrackerStatus } from '../core/types.ts';
import { cleanUrl } from '../core/url.ts';
import { watchFolders } from './files.ts';
import { readActiveWindow, readOpenTabs, readWindowsBrowserUrl } from './platform.ts';
import { permissionHint } from '../core/parse.ts';
import type { SettingsStore } from './settings.ts';
import type { Snapshots } from './snapshots.ts';

export class Engine {
  private sessionizer: Sessionizer;
  private timer: NodeJS.Timeout | null = null;
  private tabTimer: NodeJS.Timeout | null = null;
  private tabSoon: NodeJS.Timeout | null = null;
  private watcher: FSWatcher | null = null;
  private polling = false;
  private failures = 0;
  private untitled = 0;
  private stopped = false;
  private urlInFlight = false;
  private urlProbeAt = 0;
  private urlFailures = 0;
  private cachedUrl: { app: string; title: string; url: string; ts: number } | null = null;
  private emitTimer: NodeJS.Timeout | null = null;
  private status: TrackerStatus;

  constructor(
    private settingsStore: SettingsStore,
    private store: Store,
    private snapshots: Snapshots,
    private onUpdate: (status: TrackerStatus) => void,
  ) {
    const settings = settingsStore.get();
    this.sessionizer = new Sessionizer({
      pollMs: settings.pollMs,
      gapMs: Math.max(settings.pollMs * 3, 15_000),
    });
    if (!settings.paused) this.sessionizer.resume(store.latestBlock());
    this.status = {
      paused: settings.paused,
      platform: process.platform,
      permissionHint: null,
      lastError: null,
      lastSample: null,
      watchFolders: settings.watchFolders,
      fileWatching: false,
    };
  }

  start(): void {
    this.restartWatcher();
    if (!this.settingsStore.get().paused) this.startTimers();
    this.emit();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.stopTimers();
    const closed = this.sessionizer.flush();
    if (closed) this.store.upsertBlock(closed);
    void this.watcher?.close();
    this.watcher = null;
    if (this.emitTimer) clearTimeout(this.emitTimer);
    this.store.flushSync();
  }

  currentStatus(): TrackerStatus {
    return {
      ...this.status,
      watchFolders: [...this.status.watchFolders],
      lastSample: this.status.lastSample ? { ...this.status.lastSample } : null,
    };
  }

  eventDays(): string[] {
    return this.store.eventDays();
  }

  overview(day: string): Overview {
    return buildOverview({
      day,
      blocks: this.store.blocks(),
      files: this.store.files(),
      pages: this.store.pages(),
      summary: this.store.summaryFor(day),
      home: os.homedir(),
    });
  }

  setPaused(paused: boolean): void {
    this.settingsStore.update({ paused });
    this.status.paused = paused;
    if (paused) {
      const closed = this.sessionizer.flush();
      if (closed) this.store.upsertBlock(closed);
      this.stopTimers();
      void this.watcher?.close();
      this.watcher = null;
      this.status.fileWatching = false;
    } else {
      this.startTimers();
      this.restartWatcher();
    }
    this.emit();
  }

  applySettings(): void {
    const settings = this.settingsStore.get();
    this.sessionizer.setTiming(settings.pollMs);
    this.status.paused = settings.paused;
    this.status.watchFolders = settings.watchFolders;
    this.stopTimers();
    if (!settings.paused) this.startTimers();
    this.restartWatcher();
    this.emit();
  }

  clearHistory(): void {
    this.sessionizer.flush();
    this.store.clearHistory();
    this.emit();
  }

  saveSummary(summary: SummaryRecord): void {
    this.store.saveSummary(summary);
    this.emit();
  }

  private startTimers(): void {
    this.stopTimers();
    const pollMs = this.settingsStore.get().pollMs;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), pollMs);
    if (process.platform === 'darwin') {
      this.tabSoon = setTimeout(() => void this.pollTabs(), 4000);
      this.tabTimer = setInterval(() => void this.pollTabs(), 30_000);
    }
  }

  private stopTimers(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.tabTimer) clearInterval(this.tabTimer);
    if (this.tabSoon) clearTimeout(this.tabSoon);
    this.timer = null;
    this.tabTimer = null;
    this.tabSoon = null;
  }

  private restartWatcher(): void {
    void this.watcher?.close();
    this.watcher = null;
    const settings = this.settingsStore.get();
    this.status.watchFolders = settings.watchFolders;
    if (settings.paused) {
      this.status.fileWatching = false;
      return;
    }
    this.watcher = watchFolders({
      folders: settings.watchFolders,
      home: os.homedir(),
      snapshots: this.snapshots,
      onEvent: (event) => this.onFile(event),
    });
    this.status.fileWatching = this.watcher != null;
  }

  private onFile(event: FileEvent): void {
    this.store.addFile(event);
    this.emit();
  }

  private async poll(): Promise<void> {
    if (this.stopped || this.polling || this.settingsStore.get().paused) return;
    this.polling = true;
    try {
      const raw = await readActiveWindow();
      if (raw.error || !raw.app) {
        this.failures += 1;
        const hint = permissionHint(raw.error || '', process.platform);
        if (hint) this.status.permissionHint = hint;
        else if (this.failures >= 2) {
          this.status.lastError = (raw.error || 'Could not read the frontmost app.').split('\n')[0]?.slice(0, 240) ?? null;
        }
        if (this.failures === 1) console.warn(hint || this.status.lastError || raw.error);
        this.emit();
        return;
      }

      this.failures = 0;
      this.status.lastError = null;
      if (this.status.permissionHint && !this.status.permissionHint.includes('window titles')) {
        this.status.permissionHint = null;
      }
      const appName = normalizeApp(raw.app, raw.tabTitle || raw.title);
      let url = raw.url;
      const windowTitle = raw.title || '';
      if (!url && process.platform === 'win32' && isBrowser(appName)) {
        if (this.cachedUrl && this.cachedUrl.app === appName && this.cachedUrl.title === windowTitle && Date.now() - this.cachedUrl.ts < 20_000) {
          url = this.cachedUrl.url;
        }
        this.probeWindowsUrl(appName, windowTitle);
      }

      const cleaned = cleanUrl(url);
      const title = (raw.tabTitle || raw.title || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (title) {
        this.untitled = 0;
        if (this.status.permissionHint?.includes('window titles')) this.status.permissionHint = null;
      } else if (process.platform === 'darwin') {
        this.untitled += 1;
        if (this.untitled >= 3 && !this.status.permissionHint) {
          this.status.permissionHint =
            'Timebot can see the frontmost app, but not window titles. Allow Electron while developing, or Timebot once it is installed, under System Settings → Privacy & Security → Accessibility.';
        }
      }
      const ts = Date.now();
      if (isIdleApp(appName)) {
        const idle = this.sessionizer.push({ ts, app: appName, title: '' });
        if (idle.closed) this.store.upsertBlock(idle.closed);
        this.status.lastSample = { app: 'Idle', title: 'No active window', ts };
        this.emit();
        return;
      }

      const result = this.sessionizer.push({
        ts,
        app: appName,
        title,
        url: cleaned.url,
        domain: cleaned.domain,
      });
      if (result.closed) this.store.upsertBlock(result.closed);
      if (result.current) this.store.upsertBlock(result.current);
      if (cleaned.url && cleaned.domain) {
        this.store.upsertPage({
          day: dayKey(ts),
          url: cleaned.url,
          domain: cleaned.domain,
          title,
          browser: appName,
          firstSeen: ts,
          lastSeen: ts,
          open: true,
        });
      }
      this.status.lastSample = { app: appName, title, url: cleaned.url, domain: cleaned.domain, ts };
      this.emit();
    } finally {
      this.polling = false;
    }
  }

  private probeWindowsUrl(appName: string, title: string): void {
    if (this.urlInFlight || Date.now() < this.urlProbeAt) return;
    this.urlInFlight = true;
    this.urlProbeAt = Date.now() + 10_000;
    void readWindowsBrowserUrl().then((url) => {
      this.urlInFlight = false;
      if (!url) {
        this.urlFailures += 1;
        this.urlProbeAt = Date.now() + Math.min(60_000, 10_000 * this.urlFailures);
        return;
      }
      this.urlFailures = 0;
      this.cachedUrl = { app: appName, title, url, ts: Date.now() };
    });
  }

  private async pollTabs(): Promise<void> {
    if (this.stopped || this.settingsStore.get().paused) return;
    try {
      const tabs = await readOpenTabs();
      const ts = Date.now();
      const day = dayKey(ts);
      for (const tab of tabs) {
        const cleaned = cleanUrl(tab.url);
        if (!cleaned.url || !cleaned.domain) continue;
        this.store.upsertPage({
          day,
          url: cleaned.url,
          domain: cleaned.domain,
          title: tab.title.slice(0, 300),
          browser: normalizeApp(tab.browser),
          firstSeen: ts,
          lastSeen: ts,
          open: true,
        });
      }
      if (tabs.length > 0) this.emit();
    } catch (error) {
      console.error('Timebot tabs', error);
    }
  }

  private emit(): void {
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.onUpdate(this.currentStatus());
    }, 200);
  }
}
