import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatPeriod, periodContainsToday, periodDays, shiftPeriod, todayKey, type Span } from '../core/day.ts';
import type { Overview, TrackerStatus } from '../core/types.ts';
import { client } from './api.ts';
import { EventFilters, Events, type EventFilter } from './Events.tsx';
import { liveBlocks } from './labels.ts';
import { btnIcon, cn } from './ui.ts';

const spans: Array<{ id: Span; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function App() {
  const [span, setSpan] = useState<Span>('day');
  const [anchor, setAnchor] = useState(() => todayKey());
  const [now, setNow] = useState(() => Date.now());
  const [records, setRecords] = useState<Overview[] | null>(null);
  const [status, setStatus] = useState<TrackerStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancel = false;
    setRecords(null);
    setLoadError('');
    const days = periodDays(anchor, span);
    void Promise.all(days.map((day) => client().getOverview(day)))
      .then((next) => {
        if (!cancel) setRecords(next);
      })
      .catch((error: unknown) => {
        if (!cancel) setLoadError(error instanceof Error ? error.message : 'Could not load this period.');
      });
    return () => {
      cancel = true;
    };
  }, [anchor, span]);

  useEffect(() => {
    let cancel = false;
    const refresh = async () => {
      const requested = `${span}:${anchor}`;
      const days = periodDays(anchor, span);
      const [nextRecords, nextStatus] = await Promise.all([
        Promise.all(days.map((day) => client().getOverview(day))),
        client().getStatus(),
      ]);
      if (cancel || requested !== `${span}:${anchor}`) return;
      setRecords(nextRecords);
      setStatus(nextStatus);
    };
    void client().getStatus().then((next) => {
      if (!cancel) setStatus(next);
    });
    const stop = client().onActivity(() => {
      void refresh();
    });
    return () => {
      cancel = true;
      stop();
    };
  }, [anchor, span]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowLeft') setAnchor((current) => shiftPeriod(current, span, -1));
      if (event.key === 'ArrowRight' && !periodContainsToday(anchor, span, now)) {
        setAnchor((current) => shiftPeriod(current, span, 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anchor, now, span]);

  const blocks = (records ?? []).flatMap((record) => liveBlocks(record, now, Boolean(status?.paused)));
  const files = (records ?? []).flatMap((record) => record.files);
  const atToday = periodContainsToday(anchor, span, now);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden pt-12">
      <header className="mb-3 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-[18px]">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
          {spans.map((item) => {
            const active = span === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1 text-[13px]',
                  active ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-transparent text-ink',
                )}
                onClick={() => setSpan(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-center">
          <button
            type="button"
            className={btnIcon}
            aria-label={`Previous ${span}`}
            onClick={() => setAnchor((current) => shiftPeriod(current, span, -1))}
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <strong className="font-serif text-lg font-medium">{formatPeriod(anchor, span)}</strong>
          <button
            type="button"
            className={btnIcon}
            aria-label={`Next ${span}`}
            disabled={atToday}
            onClick={() => setAnchor((current) => shiftPeriod(current, span, 1))}
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {atToday ? null : (
            <button type="button" className={btnIcon} aria-label="Today" onClick={() => setAnchor(todayKey(now))}>
              <CalendarCheck size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
        <EventFilters value={filter} onChange={setFilter} />
      </header>
      <Events
        blocks={blocks}
        files={files}
        showDate={span !== 'day'}
        filter={filter}
        onFilter={setFilter}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
        empty={loadError || (!records ? 'Loading…' : undefined)}
      />
    </div>
  );
}
