import { buildOverview } from '../core/overview.ts';
import { dayBounds, shiftDay, todayKey } from '../core/day.ts';
import type {
  Block,
  FileEvent,
  Overview,
  PageHit,
  SettingsUpdate,
  SettingsView,
  SummaryRecord,
  TimebotApi,
  TrackerStatus,
} from '../core/types.ts';

const HOME = '/Users/me';

function makeBlock(block: Omit<Block, 'titles'> & { titles?: string[] }): Block {
  return { ...block, titles: block.titles ?? (block.title ? [block.title] : []) };
}

function windowFor(day: string, now: number): { start: number; end: number } | null {
  const today = todayKey(now);
  const bounds = dayBounds(day);
  if (day === today) {
    const end = Math.min(now, bounds.end - 1);
    let start = end - 5 * 60 * 60_000;
    if (start < bounds.start) start = bounds.start;
    if (end - start < 45 * 60_000) return { start: bounds.start + 9 * 60 * 60_000, end: bounds.start + 14 * 60 * 60_000 };
    return { start, end };
  }
  if (day === shiftDay(today, -1)) {
    return { start: bounds.start + 10 * 60 * 60_000, end: bounds.start + 16 * 60 * 60_000 };
  }
  return null;
}

function buildDay(day: string, now: number, summary: SummaryRecord | null): Overview {
  const span = windowFor(day, now);
  if (!span) {
    return buildOverview({ day, blocks: [], files: [], pages: [], summary: null, home: HOME, now });
  }
  const at = (fraction: number) => Math.round(span.start + (span.end - span.start) * fraction);
  const today = day === todayKey(now);
  const blocks: Block[] = today
    ? [
        makeBlock({
          id: 'cursor-morning',
          key: 'app|Cursor',
          kind: 'app',
          app: 'Cursor',
          title: 'App.tsx — timebot',
          titles: ['sessionizer.ts — timebot', 'engine.ts — timebot', 'App.tsx — timebot'],
          start: at(0),
          end: at(0.36),
        }),
        makeBlock({
          id: 'chrome-github',
          key: 'web|Google Chrome|github.com',
          kind: 'web',
          app: 'Google Chrome',
          title: 'timebot/electron/engine.ts',
          titles: ['timebot/electron/engine.ts', 'Pull requests'],
          url: 'https://github.com/example/timebot',
          domain: 'github.com',
          start: at(0.36),
          end: at(0.52),
        }),
        makeBlock({
          id: 'cursor-mid',
          key: 'app|Cursor',
          kind: 'app',
          app: 'Cursor',
          title: 'styles.css — timebot',
          titles: ['Timeline.tsx — timebot', 'styles.css — timebot'],
          start: at(0.52),
          end: at(0.74),
        }),
        makeBlock({
          id: 'slack',
          key: 'app|Slack',
          kind: 'app',
          app: 'Slack',
          title: 'design — timebot',
          start: at(0.74),
          end: at(0.82),
        }),
        makeBlock({
          id: 'safari-docs',
          key: 'web|Safari|developer.mozilla.org',
          kind: 'web',
          app: 'Safari',
          title: 'File System Access API',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API',
          domain: 'developer.mozilla.org',
          start: at(0.82),
          end: at(1),
        }),
      ]
    : [
        makeBlock({
          id: 'y-cursor',
          key: 'app|Cursor',
          kind: 'app',
          app: 'Cursor',
          title: 'store.ts — timebot',
          start: at(0.1),
          end: at(0.62),
        }),
        makeBlock({
          id: 'y-chrome',
          key: 'web|Google Chrome|github.com',
          kind: 'web',
          app: 'Google Chrome',
          title: 'Issues',
          domain: 'github.com',
          url: 'https://github.com/example/timebot/issues',
          start: at(0.62),
          end: at(0.9),
        }),
      ];

  const files: FileEvent[] = today
    ? [
        {
          id: 'file-session',
          ts: at(0.18),
          path: `${HOME}/dev/timebot/core/sessionizer.ts`,
          name: 'sessionizer.ts',
          ext: '.ts',
          change: 'change',
          added: 14,
          removed: 4,
          diff: [
            '- if (this.current.key === key) {',
            '+ if (this.current && this.current.key === key && sample.ts - this.lastTs <= this.opts.gapMs) {',
            '+   this.current = this.extend(this.current, sample, key);',
            '+   return { closed: null, current: this.current };',
          ].join('\n'),
        },
        {
          id: 'file-styles',
          ts: at(0.61),
          path: `${HOME}/dev/timebot/renderer/styles.css`,
          name: 'styles.css',
          ext: '.css',
          change: 'change',
          added: 22,
          removed: 6,
          diff: ['- .block { height: 40px; }', '+ .block { height: 56px; border-radius: 12px; }', '+ .block.web { background: #2f6f69; }'].join('\n'),
        },
      ]
    : [
        {
          id: 'file-store',
          ts: at(0.4),
          path: `${HOME}/dev/timebot/core/store.ts`,
          name: 'store.ts',
          ext: '.ts',
          change: 'add',
          added: 40,
          removed: 0,
          note: 'Created',
          diff: '+ export class Store {\n+   upsertBlock(block: Block) {',
        },
      ];

  const pages: PageHit[] = today
    ? [
        {
          day,
          url: 'https://github.com/example/timebot',
          domain: 'github.com',
          title: 'timebot/electron/engine.ts',
          browser: 'Google Chrome',
          firstSeen: at(0.36),
          lastSeen: at(0.52),
          open: true,
        },
        {
          day,
          url: 'https://mail.google.com/mail',
          domain: 'mail.google.com',
          title: 'Inbox',
          browser: 'Google Chrome',
          firstSeen: at(0.4),
          lastSeen: at(0.95),
          open: true,
        },
        {
          day,
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API',
          domain: 'developer.mozilla.org',
          title: 'File System Access API',
          browser: 'Safari',
          firstSeen: at(0.82),
          lastSeen: at(1),
          open: true,
        },
      ]
    : [];

  return buildOverview({ day, blocks, files, pages, summary, home: HOME, now });
}

const SAMPLE_SUMMARY = `Most of the morning went into Timebot itself: splitting foreground time into blocks, then shaping the day view so a long Cursor session stays one block while browser time breaks up by site.

GitHub and MDN filled the gaps between editing. Slack was a short check-in, and two source files picked up real edits.

Done
- Merged app focus into time blocks and kept sites separate by domain
- Recorded diffs for sessionizer.ts and styles.css
- Checked the GitHub tree and the File System Access docs while Chrome and Safari were open`;

export function createDemoApi(): TimebotApi {
  const listeners = new Set<() => void>();
  let cleared = false;
  let summaryOverride: SummaryRecord | null | undefined;
  let settings: SettingsView = {
    openaiModel: 'gpt-5.6-luna',
    hasKey: false,
    watchFolders: ['/Users/me/dev', '/Users/me/Documents'],
    openAtLogin: false,
    dataPath: '/Users/me/Library/Application Support/timebot',
    packaged: false,
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const status = (): TrackerStatus => ({
    platform: 'darwin',
    permissionHint: null,
    lastError: null,
    lastSample: { app: 'Cursor', title: 'App.tsx — timebot', ts: Date.now() },
    watchFolders: settings.watchFolders,
    fileWatching: settings.watchFolders.length > 0,
  });

  const overviewFor = (day: string): Overview => {
    if (cleared) {
      return buildOverview({ day, blocks: [], files: [], pages: [], summary: null, home: HOME });
    }
    const today = todayKey();
    let summary: SummaryRecord | null = null;
    if (day === today) {
      summary =
        summaryOverride === undefined
          ? { day, content: SAMPLE_SUMMARY, createdAt: Date.now() - 20 * 60_000, model: settings.openaiModel }
          : summaryOverride;
    }
    return buildDay(day, Date.now(), summary);
  };

  return {
    platform: 'browser',
    eventDays: async () => (cleared ? [] : [shiftDay(todayKey(), -1), todayKey()]),
    getOverview: async (day) => overviewFor(day),
    summarize: async (day) => {
      if (!settings.hasKey) return { ok: false, error: 'Add an OpenAI API key in Settings.' };
      await new Promise((resolve) => setTimeout(resolve, 700));
      const summary: SummaryRecord = {
        day,
        createdAt: Date.now(),
        model: settings.openaiModel,
        content: `Rewritten just now from the sample day. Cursor still dominates, with GitHub and MDN as the sites in front, and edits in sessionizer.ts and styles.css.\n\nDone\n- Kept the day as time blocks\n- Included the two file saves\n- Left background mail as an open tab rather than focused time`,
      };
      summaryOverride = summary;
      emit();
      return { ok: true, summary };
    },
    getSettings: async () => settings,
    saveSettings: async (input: SettingsUpdate) => {
      settings = {
        ...settings,
        openaiModel: input.openaiModel.trim() || settings.openaiModel,
        hasKey: input.replaceKey ? Boolean(input.openaiApiKey?.trim()) : settings.hasKey,
        watchFolders: input.watchFolders.map((folder) => folder.trim()).filter(Boolean),
        openAtLogin: input.openAtLogin,
      };
      emit();
      return { ok: true, settings };
    },
    pickFolder: async () => '/Users/me/dev/notes',
    getStatus: async () => status(),
    showDataFolder: async () => ({ path: settings.dataPath }),
    clearHistory: async () => {
      cleared = true;
      summaryOverride = null;
      emit();
    },
    onActivity: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
