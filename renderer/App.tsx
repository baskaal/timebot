import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adjacentPeriod, anchorForSpan, formatPeriod, periodContainsToday, periodDays, periodHasEvents, todayKey, type Span } from '../core/day.ts';
import type { Overview } from '../core/types.ts';
import { client } from './api.ts';
import { Calendar } from './Calendar.tsx';
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
  const [eventDays, setEventDays] = useState<string[] | null>(null);
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
      const [nextRecords, daysWithEvents] = await Promise.all([
        Promise.all(days.map((day) => client().getOverview(day))),
        client().eventDays(),
      ]);
      if (cancel || requested !== `${span}:${anchor}`) return;
      setRecords(nextRecords);
      setEventDays(daysWithEvents);
    };
    void client().eventDays().then((days) => {
      if (!cancel) setEventDays(days);
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
    if (!eventDays) return;
    const known = new Set(eventDays);
    setAnchor((current) => anchorForSpan(current, span, known));
  }, [eventDays, span]);

  const knownDays = eventDays ? new Set(eventDays) : null;
  const previous = knownDays ? adjacentPeriod(anchor, span, -1, knownDays, now) : null;
  const next = knownDays ? adjacentPeriod(anchor, span, 1, knownDays, now) : null;
  const atToday = periodContainsToday(anchor, span, now);
  const todayReachable = knownDays ? periodHasEvents(todayKey(now), span, knownDays, now) : false;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowLeft' && previous) setAnchor(previous);
      if (event.key === 'ArrowRight' && next) setAnchor(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous]);

  const blocks = (records ?? []).flatMap((record) => liveBlocks(record, now));
  const files = (records ?? []).flatMap((record) => record.files);

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
                onClick={() => {
                  if (!knownDays) {
                    setSpan(item.id);
                    return;
                  }
                  setAnchor((current) => anchorForSpan(current, item.id, knownDays));
                  setSpan(item.id);
                }}
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
            disabled={!previous}
            onClick={() => {
              if (previous) setAnchor(previous);
            }}
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <strong className="font-serif text-lg font-medium">{formatPeriod(anchor, span)}</strong>
          <button
            type="button"
            className={btnIcon}
            aria-label={`Next ${span}`}
            disabled={!next}
            onClick={() => {
              if (next) setAnchor(next);
            }}
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {atToday || !todayReachable ? null : (
            <button type="button" className={btnIcon} aria-label="Today" onClick={() => setAnchor(todayKey(now))}>
              <CalendarCheck size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
        {span === 'day' ? <EventFilters value={filter} onChange={setFilter} /> : <div />}
      </header>
      {span === 'day' ? (
        <Events
          blocks={blocks}
          files={files}
          showDate={false}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
          empty={loadError || (!records ? 'Loading…' : undefined)}
        />
      ) : (
        <Calendar
          span={span}
          anchor={anchor}
          records={records}
          now={now}
          error={loadError}
          onOpenDay={(day) => {
            setAnchor(day);
            setSpan('day');
          }}
        />
      )}
    </div>
  );
}
