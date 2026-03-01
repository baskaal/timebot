import type { Block } from '../core/types.ts';
import { todayKey } from '../core/day.ts';
import type { Overview } from '../core/types.ts';

export function blockText(block: Block): { title: string; subtitle: string } {
  if (block.kind === 'web') {
    return { title: block.domain || block.app, subtitle: block.title };
  }
  const subtitle =
    block.titles.length > 1
      ? block.titles.slice(-3).join(' · ')
      : block.title !== block.app
        ? block.title
        : '';
  return { title: block.app, subtitle };
}

export function liveBlocks(overview: Overview, now: number, paused: boolean): Block[] {
  if (paused || overview.day !== todayKey(now) || overview.blocks.length === 0) return overview.blocks;
  const last = overview.blocks[overview.blocks.length - 1];
  if (now < last.end || now - last.end > 20_000) return overview.blocks;
  return overview.blocks.map((block, index) =>
    index === overview.blocks.length - 1 ? { ...block, end: now } : block,
  );
}
