import { randomUUID } from 'node:crypto';
import { isBrowser, isIdleApp } from './apps.ts';
import type { Block, Sample } from './types.ts';

export function sampleKey(sample: Sample): string | null {
  if (!sample.app || isIdleApp(sample.app)) return null;
  if (isBrowser(sample.app)) {
    if (sample.domain) return `web|${sample.app}|${sample.domain}`;
    return `web|${sample.app}|${sample.title}`;
  }
  return `app|${sample.app}`;
}

function addTitle(titles: string[], title: string): string[] {
  const clean = title.trim();
  if (!clean || titles.includes(clean) || titles.length >= 8) return titles;
  return [...titles, clean];
}

export class Sessionizer {
  private current: Block | null = null;
  private lastTs = 0;

  constructor(private opts: { pollMs: number; gapMs: number }) {}

  setTiming(pollMs: number): void {
    this.opts = { pollMs, gapMs: Math.max(pollMs * 3, 15_000) };
  }

  resume(block: Block | null, now = Date.now()): void {
    if (!block) return;
    if (now - block.end > this.opts.gapMs) return;
    this.current = { ...block, titles: [...block.titles] };
    this.lastTs = Math.max(block.start, block.end - this.opts.pollMs);
  }

  push(sample: Sample): { closed: Block | null; current: Block | null } {
    const key = sampleKey(sample);
    if (!key) return { closed: this.closeAt(sample.ts), current: null };

    if (
      this.current &&
      this.current.kind === 'web' &&
      !this.current.domain &&
      sample.domain &&
      sample.app === this.current.app &&
      sample.ts - this.lastTs <= this.opts.gapMs
    ) {
      this.current = this.extend(this.current, sample, key);
      this.lastTs = sample.ts;
      return { closed: null, current: this.current };
    }

    if (this.current && this.current.key === key && sample.ts - this.lastTs <= this.opts.gapMs) {
      this.current = this.extend(this.current, sample, key);
      this.lastTs = sample.ts;
      return { closed: null, current: this.current };
    }

    const closed = this.closeAt(sample.ts);
    this.current = {
      id: randomUUID(),
      key,
      kind: isBrowser(sample.app) ? 'web' : 'app',
      app: sample.app,
      title: sample.title || sample.domain || sample.app,
      titles: sample.title ? [sample.title] : [],
      url: sample.url,
      domain: sample.domain,
      start: sample.ts,
      end: sample.ts + this.opts.pollMs,
    };
    this.lastTs = sample.ts;
    return { closed, current: this.current };
  }

  flush(): Block | null {
    const closed = this.current;
    this.current = null;
    return closed;
  }

  private extend(block: Block, sample: Sample, key: string): Block {
    return {
      ...block,
      key,
      end: sample.ts + this.opts.pollMs,
      title: sample.title || block.title,
      titles: addTitle(block.titles, sample.title),
      url: sample.url || block.url,
      domain: sample.domain || block.domain,
    };
  }

  private closeAt(ts: number): Block | null {
    if (!this.current) return null;
    const closed = {
      ...this.current,
      end: Math.max(this.current.start + 1000, Math.min(this.current.end, ts)),
    };
    this.current = null;
    return closed;
  }
}
