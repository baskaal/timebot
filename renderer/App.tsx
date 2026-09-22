import { useEffect, useState } from 'react';
import { formatDay, shiftDay, todayKey } from '../core/day.ts';
import type { Overview, TrackerStatus } from '../core/types.ts';
import { client } from './api.ts';
import { EventFilters, Events, type EventFilter } from './Events.tsx';
import { liveBlocks } from './labels.ts';
import { btnIcon } from './ui.ts';

function DayChevron(props: { direction: 'left' | 'right' }) {
  const right = props.direction === 'right';
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        d={right ? 'M9.5 6.5 14.5 12l-5 5.5' : 'M14.5 6.5 9.5 12l5 5.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  const [day, setDay] = useState(() => todayKey());
  const [now, setNow] = useState(() => Date.now());
  const [overview, setOverview] = useState<Overview | null>(null);
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
    setOverview(null);
    setLoadError('');
    void client()
      .getOverview(day)
      .then((next) => {
        if (!cancel) setOverview(next);
      })
      .catch((error: unknown) => {
        if (!cancel) setLoadError(error instanceof Error ? error.message : 'Could not load this day.');
      });
    return () => {
      cancel = true;
    };
  }, [day]);

  useEffect(() => {
    let cancel = false;
    const refresh = async () => {
      const requested = day;
      const [nextOverview, nextStatus] = await Promise.all([client().getOverview(requested), client().getStatus()]);
      if (cancel || requested !== day) return;
      setOverview(nextOverview);
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
  }, [day]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowLeft') setDay((current) => shiftDay(current, -1));
      if (event.key === 'ArrowRight' && day < todayKey(now)) setDay((current) => shiftDay(current, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [day, now]);

  const blocks = overview ? liveBlocks(overview, now, Boolean(status?.paused)) : [];
  const atToday = day >= todayKey(now);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden pt-4">
      <header className="mb-3 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-[18px]">
        <div />
        <div className="flex items-center gap-2 text-center">
          <button
            type="button"
            className={btnIcon}
            aria-label="Previous day"
            onClick={() => setDay((current) => shiftDay(current, -1))}
          >
            <DayChevron direction="left" />
          </button>
          <strong className="font-serif text-lg font-medium">{formatDay(day)}</strong>
          <button
            type="button"
            className={btnIcon}
            aria-label="Next day"
            disabled={atToday}
            onClick={() => setDay((current) => shiftDay(current, 1))}
          >
            <DayChevron direction="right" />
          </button>
        </div>
        <EventFilters value={filter} onChange={setFilter} />
      </header>
      <Events
        blocks={blocks}
        files={overview?.files ?? []}
        filter={filter}
        onFilter={setFilter}
        selectedId={selectedId}
        onSelect={setSelectedId}
        empty={loadError || (!overview ? 'Loading this day…' : undefined)}
      />
    </div>
  );
}
