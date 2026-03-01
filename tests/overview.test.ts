import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOverview } from '../core/overview.ts';
import { buildSummaryPrompt } from '../core/prompt.ts';
import type { Block, FileEvent, PageHit } from '../core/types.ts';

const day = '2026-09-22';
const morning = new Date(2026, 8, 22, 9, 0, 0).getTime();

function block(partial: Partial<Block> & Pick<Block, 'id' | 'start' | 'end' | 'app' | 'kind'>): Block {
  return {
    key: partial.key ?? partial.id,
    title: partial.title ?? partial.app,
    titles: partial.titles ?? [partial.title ?? partial.app],
    ...partial,
  };
}

test('builds a day from blocks, saves, and open tabs', () => {
  const blocks = [
    block({ id: 'edit', kind: 'app', app: 'Cursor', title: 'main.ts', start: morning, end: morning + 60 * 60_000 }),
    block({
      id: 'web',
      kind: 'web',
      app: 'Safari',
      title: 'Repo',
      domain: 'github.com',
      url: 'https://github.com/example',
      start: morning + 60 * 60_000,
      end: morning + 90 * 60_000,
    }),
  ];
  const files: FileEvent[] = [
    {
      id: 'f',
      ts: morning + 30 * 60_000,
      path: '/Users/me/dev/app/main.ts',
      name: 'main.ts',
      ext: '.ts',
      change: 'change',
      added: 2,
      removed: 1,
      diff: '+ const ready = true\n- const ready = false\n+ token=sk-proj-abcdefghijklmnopqrstuvwxyz',
    },
    {
      id: 'other-day',
      ts: morning + 48 * 60 * 60_000,
      path: '/Users/me/dev/app/later.ts',
      name: 'later.ts',
      ext: '.ts',
      change: 'change',
      added: 1,
      removed: 0,
    },
  ];
  const pages: PageHit[] = [
    {
      day,
      url: 'https://mail.google.com/mail',
      domain: 'mail.google.com',
      title: 'Inbox',
      browser: 'Google Chrome',
      firstSeen: morning,
      lastSeen: morning + 60 * 60_000,
      open: true,
    },
  ];
  const overview = buildOverview({
    day,
    blocks,
    files,
    pages,
    summary: null,
    home: '/Users/me',
    now: morning + 2 * 60 * 60_000,
  });
  assert.equal(overview.blocks.length, 2);
  assert.equal(overview.files.length, 1);
  assert.equal(overview.files[0]?.displayPath, '~/dev/app/main.ts');
  assert.equal(overview.totals.trackedMs, 90 * 60_000);
  assert.equal(overview.totals.webMs, 30 * 60_000);
  assert.equal(overview.sites.some((site) => site.domain === 'mail.google.com' && site.open), true);
  assert.equal(overview.sites.find((site) => site.domain === 'github.com')?.activeMs, 30 * 60_000);

  const prompt = buildSummaryPrompt(overview);
  assert.match(prompt, /github.com/);
  assert.match(prompt, /main.ts/);
  assert.equal(prompt.includes('sk-proj-'), false);
});
