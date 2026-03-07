import assert from 'node:assert/strict';
import test from 'node:test';
import { adjacentPeriod, anchorForSpan, calendarWeeks, formatPeriod, isoWeek, periodDays, shiftPeriod, startOfWeek } from '../core/day.ts';

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

test('a week is one row and a month pads to full Monday weeks', () => {
  const week = calendarWeeks('2026-09-22', 'week');
  assert.equal(week.length, 1);
  assert.deepEqual(
    week[0]?.map((cell) => cell.day),
    periodDays('2026-09-22', 'week'),
  );
  assert.ok(week[0]?.every((cell) => cell.inPeriod));

  const month = calendarWeeks('2026-09-22', 'month');
  assert.equal(month.length, 5);
  assert.deepEqual(month[0]?.[0], { day: '2026-08-31', inPeriod: false });
  assert.deepEqual(month[0]?.[1], { day: '2026-09-01', inPeriod: true });
  assert.deepEqual(month[4]?.[2], { day: '2026-09-30', inPeriod: true });
  assert.equal(month[4]?.[3]?.inPeriod, false);
  assert.equal(month[4]?.[6]?.day, '2026-10-04');
});

test('navigation skips periods that have no events', () => {
  const now = new Date(2026, 8, 22, 12).getTime();
  const days = new Set(['2026-09-01', '2026-09-22']);
  assert.equal(adjacentPeriod('2026-09-22', 'day', -1, days, now), '2026-09-01');
  assert.equal(adjacentPeriod('2026-09-01', 'day', -1, days, now), null);
  assert.equal(adjacentPeriod('2026-09-22', 'day', 1, days, now), null);
  assert.equal(adjacentPeriod('2026-09-01', 'day', 1, days, now), '2026-09-22');
  assert.equal(adjacentPeriod('2026-09-22', 'week', -1, days, now), '2026-09-01');
  assert.equal(adjacentPeriod('2026-09-22', 'month', -1, days, now), null);
  assert.equal(anchorForSpan('2026-09-20', 'day', days, now), '2026-09-22');
  assert.equal(anchorForSpan('2026-08-10', 'month', days, now), '2026-09-01');
  assert.equal(anchorForSpan('2026-09-22', 'week', days, now), '2026-09-22');
});
