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
