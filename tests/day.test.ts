import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPeriod, isoWeek, periodDays, shiftPeriod, startOfWeek } from '../core/day.ts';

test('names a day, an ISO week, and a month', () => {
  assert.equal(isoWeek('2026-01-01'), 1);
  assert.equal(formatPeriod('2026-09-22', 'week'), `Week ${isoWeek('2026-09-22')}`);
  assert.equal(
    formatPeriod('2026-09-22', 'month'),
    new Date(2026, 8, 1).toLocaleDateString([], { month: 'long' }),
  );
});

test('weeks run Monday through Sunday and months stay inside the month', () => {
  assert.equal(startOfWeek('2026-09-22'), '2026-09-21');
  assert.deepEqual(periodDays('2026-09-22', 'week').slice(0, 2), ['2026-09-21', '2026-09-22']);
  assert.equal(periodDays('2026-09-22', 'week').at(-1), '2026-09-27');
  assert.equal(periodDays('2026-09-22', 'month').length, 30);
  assert.equal(shiftPeriod('2026-01-31', 'month', 1), '2026-02-28');
});
