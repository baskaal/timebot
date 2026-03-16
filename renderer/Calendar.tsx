import { calendarWeeks, formatDuration, todayKey } from '../core/day.ts';
import type { Overview } from '../core/types.ts';
import { liveBlocks } from './labels.ts';
import { cn } from './ui.ts';

const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
  new Date(2026, 8, 21 + index).toLocaleDateString([], { weekday: 'short' }),
);

function minutesLabel(ms: number): string {
  if (ms <= 0) return '0m';
  return formatDuration(ms);
}

function dayStats(record: Overview | undefined, now: number) {
  if (!record) return { saves: 0, appMs: 0, webMs: 0 };
  let appMs = 0;
  let webMs = 0;
  for (const block of liveBlocks(record, now)) {
    const ms = Math.max(0, block.end - block.start);
    if (block.kind === 'web') webMs += ms;
    else appMs += ms;
  }
  return { saves: record.files.length, appMs, webMs };
}

export function Calendar(props: {
  span: 'week' | 'month';
  anchor: string;
  records: Overview[] | null;
  now: number;
  error?: string;
  onOpenDay: (day: string) => void;
}) {
  const weeks = calendarWeeks(props.anchor, props.span);
  const byDay = new Map((props.records ?? []).map((record) => [record.day, record]));
  const today = todayKey(props.now);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pb-[18px]" aria-label={props.span === 'month' ? 'Month' : 'Week'}>
      {props.error ? <p className="mb-3 text-muted">{props.error}</p> : null}
      <div
        className="grid h-full min-h-[28rem] grid-cols-7 gap-x-2 gap-y-2"
        style={{ gridTemplateRows: `auto repeat(${weeks.length}, minmax(${props.span === 'week' ? '16rem' : '7.5rem'}, 1fr))` }}
      >
        {weekdayLabels.map((label) => (
          <div key={label} className="text-center text-[13px] text-muted">
            {label}
          </div>
        ))}
        {weeks.flatMap((week) =>
          week.map((cell) => {
            const dateNumber = Number(cell.day.slice(8));
            const isToday = cell.day === today;
            if (!cell.inPeriod) {
              return (
                <div key={cell.day} className="rounded-[14px] px-3 py-2 text-muted/45">
                  <span className="font-serif text-lg">{dateNumber}</span>
                </div>
              );
            }
            const stats = dayStats(byDay.get(cell.day), props.now);
            const rows = [
              stats.saves > 0 ? { label: 'File saves', value: String(stats.saves), tone: 'text-indigo' } : null,
              stats.appMs > 0 ? { label: 'Apps', value: minutesLabel(stats.appMs), tone: 'text-copper' } : null,
              stats.webMs > 0 ? { label: 'Websites', value: minutesLabel(stats.webMs), tone: 'text-teal' } : null,
            ].filter((row) => row !== null);
            if (rows.length === 0) {
              return (
                <div
                  key={cell.day}
                  className="flex h-full min-h-0 min-w-0 flex-col rounded-[14px] border border-line/70 bg-transparent px-3 py-2.5 text-left text-muted opacity-45 shadow-none"
                >
                  <span className="font-serif text-lg leading-none">{dateNumber}</span>
                </div>
              );
            }
            return (
              <button
                key={cell.day}
                type="button"
                className={cn(
                  'flex h-full min-h-0 min-w-0 cursor-pointer flex-col rounded-[14px] border bg-card px-3 py-2.5 text-left shadow-card',
                  isToday ? 'border-copper' : 'border-line',
                )}
                onClick={() => props.onOpenDay(cell.day)}
              >
                <span className={cn('font-serif text-lg leading-none', isToday && 'text-copper')}>{dateNumber}</span>
                <dl className="mt-3 flex flex-col gap-1 text-[13px]">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-2">
                      <dt className="min-w-0 truncate text-muted">{row.label}</dt>
                      <dd className={cn('shrink-0 tabular-nums', row.tone)}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}
