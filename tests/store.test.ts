import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { rejectWatchFolder } from '../core/folders.ts';
import { parseActive, parseTabs } from '../core/parse.ts';
import { Store } from '../core/store.ts';
import { cleanUrl } from '../core/url.ts';
import type { Block } from '../core/types.ts';

test('cleans urls and drops non-web pages', () => {
  const cleaned = cleanUrl('https://www.Example.com/docs/?token=abc&q=time#part');
  assert.equal(cleaned.domain, 'example.com');
  assert.match(cleaned.url ?? '', /token=REDACTED/);
  assert.equal(cleanUrl('chrome://newtab').url, undefined);
});

test('parses active windows and tab lists', () => {
  const sep = String.fromCharCode(31);
  const rec = String.fromCharCode(30);
  const active = parseActive(`Safari${sep}Inbox${sep}https://mail.google.com${sep}Inbox\n`);
  assert.equal(active.app, 'Safari');
  assert.equal(active.url, 'https://mail.google.com');
  const tabs = parseTabs(`Google Chrome${sep}https://github.com${sep}Repo${rec}Safari${sep}${sep}blank${rec}`);
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0]?.url, 'https://github.com');
});

test('rejects home, library, and the drive root', () => {
  const home = path.resolve('/Users/timebot-test');
  assert.match(rejectWatchFolder(home, home) ?? '', /home folder/);
  assert.match(rejectWatchFolder(path.join(home, 'Library', 'Mail'), home) ?? '', /Library/);
  assert.equal(rejectWatchFolder(path.join(home, 'dev'), home), null);
  assert.ok(rejectWatchFolder(path.parse(home).root, home));
});

test('store keeps recent history and drops expired records', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'timebot-'));
  const file = path.join(dir, 'data.json');
  const now = Date.now();
  const recent: Block = {
    id: 'recent',
    key: 'app|Cursor',
    kind: 'app',
    app: 'Cursor',
    title: 'now',
    titles: ['now'],
    start: now - 60_000,
    end: now,
  };
  const old: Block = {
    id: 'old',
    key: 'app|Slack',
    kind: 'app',
    app: 'Slack',
    title: 'old',
    titles: ['old'],
    start: now - 10 * 24 * 60 * 60_000,
    end: now - 9 * 24 * 60 * 60_000,
  };
  const store = new Store(file, 3 * 24 * 60 * 60_000);
  store.upsertBlock(recent);
  store.upsertBlock(old);
  store.flushSync();
  const reloaded = new Store(file, 3 * 24 * 60 * 60_000);
  assert.deepEqual(reloaded.blocks().map((block) => block.id), ['recent']);
  reloaded.clearHistory();
  assert.equal(new Store(file, 3 * 24 * 60 * 60_000).blocks().length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});
