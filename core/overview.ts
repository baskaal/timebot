import { dayBounds, overlap, viewRange } from './day.ts';
import { toDisplayPath } from './paths.ts';
import type { Block, FileEvent, Overview, PageHit, SiteStat, SummaryRecord } from './types.ts';

function addUnique(list: string[], value: string | undefined, cap: number): void {
  const clean = value?.trim();
  if (!clean || list.includes(clean) || list.length >= cap) return;
  list.push(clean);
}

export function buildOverview(input: {
  day: string;
  blocks: Block[];
  files: FileEvent[];
  pages: PageHit[];
  summary: SummaryRecord | null;
  home: string;
  now?: number;
}): Overview {
  const now = input.now ?? Date.now();
  const bounds = dayBounds(input.day);
  const dayBlocks = input.blocks
    .filter((block) => overlap(block.start, block.end, bounds.start, bounds.end) > 0)
    .map((block) => ({
      ...block,
      titles: [...block.titles],
      start: Math.max(block.start, bounds.start),
      end: Math.min(block.end, bounds.end),
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);

  const files = input.files
    .filter((file) => file.ts >= bounds.start && file.ts < bounds.end)
    .sort((a, b) => a.ts - b.ts)
    .map((file) => ({
      ...file,
      displayPath: file.path ? toDisplayPath(file.path, input.home) : file.name,
    }));

  const sites = new Map<string, SiteStat>();
  const ensure = (domain: string): SiteStat => {
    let site = sites.get(domain);
    if (!site) {
      site = { domain, browsers: [], activeMs: 0, open: false, titles: [], urls: [], lastSeen: 0 };
      sites.set(domain, site);
    }
    return site;
  };

  let trackedMs = 0;
  let webMs = 0;
  let appMs = 0;
  for (const block of dayBlocks) {
    const ms = block.end - block.start;
    trackedMs += ms;
    if (block.kind === 'web') webMs += ms;
    else appMs += ms;
    if (block.kind === 'web' && block.domain) {
      const site = ensure(block.domain);
      site.activeMs += ms;
      addUnique(site.browsers, block.app, 4);
      addUnique(site.titles, block.title, 6);
      for (const title of block.titles) addUnique(site.titles, title, 6);
      addUnique(site.urls, block.url, 6);
      site.lastSeen = Math.max(site.lastSeen, block.end);
    }
  }

  for (const page of input.pages) {
    if (page.day !== input.day || !page.domain) continue;
    const site = ensure(page.domain);
    if (page.open) site.open = true;
    addUnique(site.browsers, page.browser, 4);
    addUnique(site.titles, page.title, 6);
    addUnique(site.urls, page.url, 6);
    site.lastSeen = Math.max(site.lastSeen, page.lastSeen);
  }

  const siteList = [...sites.values()].sort((a, b) => b.activeMs - a.activeMs || a.domain.localeCompare(b.domain));

  return {
    day: input.day,
    blocks: dayBlocks,
    files,
    sites: siteList,
    summary: input.summary && input.summary.day === input.day ? input.summary : null,
    totals: { trackedMs, webMs, appMs, fileCount: files.length },
    range: viewRange(input.day, dayBlocks, files, now),
  };
}
