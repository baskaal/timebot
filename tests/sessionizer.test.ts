import assert from 'node:assert/strict';
import test from 'node:test';
import { Sessionizer } from '../core/sessionizer.ts';

function tracker(): Sessionizer {
  return new Sessionizer({ pollMs: 5_000, gapMs: 15_000 });
}

test('merges the same app across window titles', () => {
  const session = tracker();
  const start = 1_000_000;
  session.push({ ts: start, app: 'Cursor', title: 'a.ts' });
  const next = session.push({ ts: start + 5_000, app: 'Cursor', title: 'b.ts' });
  assert.equal(next.closed, null);
  assert.equal(next.current?.titles.length, 2);
  assert.equal(next.current?.start, start);
});

test('splits when the app changes', () => {
  const session = tracker();
  const start = 1_000_000;
  session.push({ ts: start, app: 'Cursor', title: 'a.ts' });
  const next = session.push({ ts: start + 5_000, app: 'Slack', title: 'general' });
  assert.equal(next.closed?.app, 'Cursor');
  assert.equal(next.current?.app, 'Slack');
  assert.ok(next.closed && next.current && next.closed.end <= next.current.start);
});

test('splits browsers by site and merges page titles on one site', () => {
  const session = tracker();
  const start = 1_000_000;
  session.push({
    ts: start,
    app: 'Safari',
    title: 'Pull request',
    url: 'https://github.com/a',
    domain: 'github.com',
  });
  const same = session.push({
    ts: start + 5_000,
    app: 'Safari',
    title: 'Issues',
    url: 'https://github.com/b',
    domain: 'github.com',
  });
  assert.equal(same.closed, null);
  assert.equal(same.current?.titles.length, 2);
  const next = session.push({
    ts: start + 10_000,
    app: 'Safari',
    title: 'Inbox',
    url: 'https://mail.google.com',
    domain: 'mail.google.com',
  });
  assert.equal(next.closed?.domain, 'github.com');
  assert.equal(next.current?.domain, 'mail.google.com');
});

test('starts a new block after a gap and closes on the lock screen', () => {
  const session = tracker();
  const start = 1_000_000;
  session.push({ ts: start, app: 'Cursor', title: 'a.ts' });
  const later = session.push({ ts: start + 30_000, app: 'Cursor', title: 'a.ts' });
  assert.ok(later.closed);
  assert.notEqual(later.closed?.id, later.current?.id);
  const idle = session.push({ ts: start + 35_000, app: 'loginwindow', title: '' });
  assert.equal(idle.current, null);
  assert.equal(idle.closed?.app, 'Cursor');
});

test('upgrades a browser block once the url is known', () => {
  const session = tracker();
  const start = 1_000_000;
  session.push({ ts: start, app: 'Google Chrome', title: 'Example' });
  const next = session.push({
    ts: start + 5_000,
    app: 'Google Chrome',
    title: 'Example',
    url: 'https://example.com',
    domain: 'example.com',
  });
  assert.equal(next.closed, null);
  assert.equal(next.current?.domain, 'example.com');
  assert.equal(next.current?.start, start);
});
