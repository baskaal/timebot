export function dayKey(ts: number): string {
  const date = new Date(ts);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayKey(now = Date.now()): string {
  return dayKey(now);
}

export function dayBounds(day: string): { start: number; end: number } {
  const [year, month, date] = day.split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, date || 1).getTime();
  const end = new Date(year, (month || 1) - 1, (date || 1) + 1).getTime();
  return { start, end };
}

export function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return dayKey(new Date(year, (month || 1) - 1, (date || 1) + delta).getTime());
}

export function formatDay(day: string): string {
  return new Date(dayBounds(day).start).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export type Span = 'day' | 'week' | 'month';

export function startOfWeek(day: string): string {
  const date = new Date(dayBounds(day).start);
  return shiftDay(day, -((date.getDay() + 6) % 7));
}

export function startOfMonth(day: string): string {
  const [year, month] = day.split('-').map(Number);
  return dayKey(new Date(year, (month || 1) - 1, 1).getTime());
}

export function periodDays(day: string, span: Span): string[] {
  if (span === 'day') return [day];
  if (span === 'week') {
    const start = startOfWeek(day);
    return Array.from({ length: 7 }, (_, index) => shiftDay(start, index));
  }
  const start = startOfMonth(day);
  const [year, month] = start.split('-').map(Number);
  const count = new Date(year, month || 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => shiftDay(start, index));
}

export function shiftPeriod(day: string, span: Span, delta: number): string {
  if (span === 'day') return shiftDay(day, delta);
  if (span === 'week') return shiftDay(day, delta * 7);
  const [year, month, date] = day.split('-').map(Number);
  const shifted = new Date(year, (month || 1) - 1 + delta, 1);
  const last = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(date || 1, last));
  return dayKey(shifted.getTime());
}

export function isoWeek(day: string): number {
  const start = new Date(dayBounds(day).start);
  const thursday = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
}

export function formatPeriod(day: string, span: Span): string {
  if (span === 'day') return formatDay(day);
  if (span === 'week') return `Week ${isoWeek(day)}`;
  return new Date(dayBounds(startOfMonth(day)).start).toLocaleDateString([], { month: 'long' });
}

export function periodHasEvents(day: string, span: Span, eventDays: ReadonlySet<string>, now = Date.now()): boolean {
  const today = todayKey(now);
  return periodDays(day, span).some((item) => item <= today && eventDays.has(item));
}

export function adjacentPeriod(
  day: string,
  span: Span,
  delta: -1 | 1,
  eventDays: ReadonlySet<string>,
  now = Date.now(),
): string | null {
  const today = todayKey(now);
  const available = [...eventDays].filter((item) => item <= today).sort();
  const earliest = available[0];
  const latest = available[available.length - 1];
  if (!earliest || !latest) return null;
  let cursor = day;
  for (let step = 0; step < 500; step += 1) {
    cursor = shiftPeriod(cursor, span, delta);
    const bounds = periodDays(cursor, span);
    const start = bounds[0] ?? cursor;
    const end = bounds[bounds.length - 1] ?? cursor;
    if (delta > 0 && (start > today || start > latest)) return null;
    if (delta < 0 && end < earliest) return null;
    if (periodHasEvents(cursor, span, eventDays, now)) return cursor;
  }
  return null;
}

export function anchorForSpan(day: string, span: Span, eventDays: ReadonlySet<string>, now = Date.now()): string {
  if (periodHasEvents(day, span, eventDays, now)) return day;
  const today = todayKey(now);
  const available = [...eventDays].filter((item) => item <= today).sort();
  if (available.length === 0) return day;
  const target = day > today ? today : day;
  const targetTime = dayBounds(target).start;
  let best = available[0] ?? day;
  let bestDistance = Math.abs(dayBounds(best).start - targetTime);
  for (const item of available) {
    const distance = Math.abs(dayBounds(item).start - targetTime);
    if (distance < bestDistance || (distance === bestDistance && item > best)) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

export function periodContainsToday(day: string, span: Span, now = Date.now()): boolean {
  const today = todayKey(now);
  return periodDays(day, span).includes(today);
}

export type CalendarCell = { day: string; inPeriod: boolean };

export function calendarWeeks(day: string, span: Exclude<Span, 'day'>): CalendarCell[][] {
  const period = periodDays(day, span);
  const first = period[0] ?? day;
  const last = period[period.length - 1] ?? day;
  const gridStart = startOfWeek(first);
  const gridEnd = shiftDay(startOfWeek(last), 6);
  const cells: CalendarCell[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = shiftDay(cursor, 1)) {
    cells.push({ day: cursor, inPeriod: cursor >= first && cursor <= last });
  }
  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) {
    const seconds = Math.max(1, Math.round(ms / 1000));
    return `${seconds}s`;
  }
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function snapHourDown(ts: number): number {
  const date = new Date(ts);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

function snapHourUp(ts: number): number {
  const date = new Date(ts);
  if (date.getMinutes() || date.getSeconds() || date.getMilliseconds()) {
    date.setHours(date.getHours() + 1);
  }
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

export function viewRange(
  day: string,
  blocks: Array<{ start: number; end: number }>,
  files: Array<{ ts: number }>,
  now = Date.now(),
): { start: number; end: number } {
  const bounds = dayBounds(day);
  const stamps: number[] = [];
  for (const block of blocks) stamps.push(block.start, block.end);
  for (const file of files) stamps.push(file.ts);
  if (day === dayKey(now)) stamps.push(now);

  if (stamps.length === 0) {
    return { start: bounds.start + 8 * 3_600_000, end: bounds.start + 19 * 3_600_000 };
  }

  let min = Math.max(bounds.start, Math.min(...stamps) - 30 * 60_000);
  let max = Math.min(bounds.end, Math.max(...stamps) + 30 * 60_000);
  min = Math.max(bounds.start, snapHourDown(min));
  max = Math.min(bounds.end, snapHourUp(max));
  if (max - min < 3 * 3_600_000) max = Math.min(bounds.end, min + 3 * 3_600_000);
  if (max <= min) max = Math.min(bounds.end, min + 3_600_000);
  return { start: min, end: max };
}

export function overlap(start: number, end: number, dayStart: number, dayEnd: number): number {
  return Math.max(0, Math.min(end, dayEnd) - Math.max(start, dayStart));
}
