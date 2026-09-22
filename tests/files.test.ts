import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretSave, isSecretPath, shouldTrackFile } from '../core/files.ts';
import { redact } from '../core/redact.ts';

test('redacts keys and leaves ordinary prose alone', () => {
  const text = redact('edited main.ts and set token=sk-proj-abcdefghijklmnopqrstuvwxyz');
  assert.equal(text.includes('sk-proj-'), false);
  assert.match(text, /edited main.ts/);
  assert.match(text, /\[redacted\]/);
});

test('diffs a save and skips secrets, binaries of the wrong type, and unchanged files', () => {
  const changed = interpretSave({
    filePath: '/Users/me/dev/app/main.ts',
    change: 'change',
    previous: 'const a = 1\n',
    next: 'const a = 2\nconst key = "sk-abcdefghijklmnopqrstuvwxyz"\n',
    ts: 10,
  });
  assert.ok(changed?.diff?.includes('+ const a = 2'));
  assert.equal(changed?.diff?.includes('sk-abc'), false);
  assert.equal(changed && changed.added > 0, true);

  assert.equal(
    interpretSave({
      filePath: '/Users/me/dev/app/.env',
      change: 'change',
      previous: 'A=1\n',
      next: 'A=2\n',
      ts: 10,
    }),
    null,
  );
  assert.equal(isSecretPath('/Users/me/dev/app/.env.local'), true);
  assert.equal(shouldTrackFile('/Users/me/dev/app/node_modules/left-pad/index.js'), false);
  assert.equal(shouldTrackFile('/Users/me/dev/app/photo.png'), false);
  assert.equal(
    interpretSave({
      filePath: '/Users/me/dev/app/main.ts',
      change: 'change',
      previous: 'same\n',
      next: 'same\n',
      ts: 10,
    }),
    null,
  );
});
