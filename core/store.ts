import fs from 'node:fs';
import path from 'node:path';
import { dayBounds } from './day.ts';
import type { Block, FileEvent, PageHit, SummaryRecord } from './types.ts';

type Database = {
  version: 1;
  blocks: Block[];
  files: FileEvent[];
  pages: PageHit[];
  summaries: SummaryRecord[];
};

function emptyDb(): Database {
  return { version: 1, blocks: [], files: [], pages: [], summaries: [] };
}

export class Store {
  private db: Database = emptyDb();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private file: string,
    private retainMs = 90 * 24 * 3_600_000,
  ) {
    this.load();
  }

  blocks(): Block[] {
    return this.db.blocks.map((block) => ({ ...block, titles: [...block.titles] }));
  }

  files(): FileEvent[] {
    return this.db.files.map((file) => ({ ...file }));
  }

  pages(): PageHit[] {
    return this.db.pages.map((page) => ({ ...page }));
  }

  summaryFor(day: string): SummaryRecord | null {
    return this.db.summaries.find((summary) => summary.day === day) ?? null;
  }

  latestBlock(): Block | null {
    let best: Block | null = null;
    for (const block of this.db.blocks) {
      if (!best || block.end > best.end) best = block;
    }
    return best ? { ...best, titles: [...best.titles] } : null;
  }

  upsertBlock(block: Block): void {
    const index = this.db.blocks.findIndex((item) => item.id === block.id);
    const copy = { ...block, titles: [...block.titles] };
    if (index >= 0) this.db.blocks[index] = copy;
    else this.db.blocks.push(copy);
    this.scheduleSave();
  }

  addFile(event: FileEvent): void {
    this.db.files.push({ ...event });
    this.scheduleSave();
  }

  upsertPage(page: PageHit): void {
    const existing = this.db.pages.find((item) => item.day === page.day && item.url === page.url);
    if (existing) {
      existing.lastSeen = page.lastSeen;
      if (page.title) existing.title = page.title;
      if (page.open) existing.open = true;
      if (page.browser) existing.browser = page.browser;
      this.scheduleSave();
      return;
    }
    const count = this.db.pages.filter((item) => item.day === page.day).length;
    if (count >= 500) return;
    this.db.pages.push({ ...page });
    this.scheduleSave();
  }

  saveSummary(summary: SummaryRecord): void {
    const index = this.db.summaries.findIndex((item) => item.day === summary.day);
    if (index >= 0) this.db.summaries[index] = { ...summary };
    else this.db.summaries.push({ ...summary });
    this.scheduleSave();
  }

  clearHistory(): void {
    this.db = emptyDb();
    this.flushSync();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.file)) return;
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<Database>;
      if (parsed.version !== 1 || !Array.isArray(parsed.blocks)) {
        this.backupCorrupt();
        return;
      }
      this.db = {
        version: 1,
        blocks: parsed.blocks,
        files: Array.isArray(parsed.files) ? parsed.files : [],
        pages: Array.isArray(parsed.pages) ? parsed.pages : [],
        summaries: Array.isArray(parsed.summaries) ? parsed.summaries : [],
      };
      this.prune();
    } catch {
      this.backupCorrupt();
    }
  }

  private backupCorrupt(): void {
    try {
      if (fs.existsSync(this.file)) fs.renameSync(this.file, `${this.file}.corrupt`);
    } catch {
      // Keep the in-memory database empty if the old file cannot be moved.
    }
    this.db = emptyDb();
  }

  private prune(now = Date.now()): void {
    const cutoff = now - this.retainMs;
    this.db.blocks = this.db.blocks.filter((block) => block.end >= cutoff);
    this.db.files = this.db.files.filter((file) => file.ts >= cutoff);
    this.db.pages = this.db.pages.filter((page) => page.lastSeen >= cutoff);
    this.db.summaries = this.db.summaries.filter((summary) => dayBounds(summary.day).end >= cutoff);
  }

  private scheduleSave(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushSync();
    }, 1500);
  }

  flushSync(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.prune();
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db));
    fs.renameSync(tmp, this.file);
  }
}
