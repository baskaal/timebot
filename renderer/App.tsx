import { useEffect, useState } from 'react';
import { formatDay, formatDuration, shiftDay, todayKey } from '../core/day.ts';
import type { Overview, SettingsView, TrackerStatus } from '../core/types.ts';
import { Activity } from './Activity.tsx';
import { client, isPreview } from './api.ts';
import { Files } from './Files.tsx';
import { liveBlocks } from './labels.ts';
import { Settings } from './Settings.tsx';
import { Sites } from './Sites.tsx';
import { SummaryCard } from './Summary.tsx';
import { Timeline } from './Timeline.tsx';
import { banner, btn, btnPrimary, btnText, cn } from './ui.ts';

export function App() {
  const [day, setDay] = useState(() => todayKey());
  const [now, setNow] = useState(() => Date.now());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [status, setStatus] = useState<TrackerStatus | null>(null);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const preview = isPreview();

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
    void client().getSettings().then((next) => {
      if (!cancel) setSettings(next);
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
      if (event.key === 'Escape') setSettingsOpen(false);
      if (settingsOpen) return;
      if (event.key === 'ArrowLeft') setDay((current) => shiftDay(current, -1));
      if (event.key === 'ArrowRight' && day < todayKey(now)) setDay((current) => shiftDay(current, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [day, now, settingsOpen]);

  const blocks = overview ? liveBlocks(overview, now, Boolean(status?.paused)) : [];
  const atToday = day >= todayKey(now);
  const mac = window.timebot?.platform === 'darwin';

  async function togglePause() {
    const next = await client().setPaused(!status?.paused);
    setSettings(next);
    setStatus(await client().getStatus());
  }

  async function summarize() {
    setSummaryBusy(true);
    setSummaryError('');
    const result = await client().summarize(day);
    setSummaryBusy(false);
    if (!result.ok) {
      setSummaryError(result.error);
      if (result.error.toLowerCase().includes('api key')) setSettingsOpen(true);
      return;
    }
    setOverview(await client().getOverview(day));
  }

  return (
    <div className="mx-auto w-[min(1180px,calc(100%-40px))] pb-12 pt-[22px] max-[980px]:w-[min(1180px,calc(100%-24px))]">
      <header
        className={cn(
          'mb-[18px] grid grid-cols-[1fr_auto_1fr] items-center gap-[18px] max-[980px]:grid-cols-1',
          mac && 'pl-[72px]',
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className="relative size-9 shrink-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,transparent_0_3px,var(--color-copper)_4px_6px,transparent_7px),radial-gradient(circle_at_50%_50%,var(--color-card)_0_10px,var(--color-copper)_11px_14px,transparent_15px)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] before:absolute before:left-[17px] before:top-2 before:h-2.5 before:w-0.5 before:origin-bottom before:bg-copper before:content-[''] after:absolute after:left-[17px] after:top-[11px] after:h-[7px] after:w-0.5 after:origin-bottom after:rotate-[55deg] after:bg-copper after:content-['']"
            aria-hidden="true"
          />
          <div>
            <h1 className="font-serif text-[28px] font-medium italic tracking-[-0.03em]">timebot</h1>
            <p className="mt-0.5 text-[13px] text-muted" aria-live="polite">
              {status?.paused
                ? 'Paused'
                : status?.lastSample
                  ? `Tracking · ${status.lastSample.app}`
                  : 'Starting'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-center">
          <button
            type="button"
            className={cn(btn, 'size-9 p-0 text-[22px]')}
            aria-label="Previous day"
            onClick={() => setDay((current) => shiftDay(current, -1))}
          >
            ‹
          </button>
          <div>
            <strong className="block font-serif text-lg font-medium">{formatDay(day)}</strong>
            {day !== todayKey(now) ? (
              <button type="button" className={cn(btnText, 'text-xs')} onClick={() => setDay(todayKey(now))}>
                Today
              </button>
            ) : (
              <span className="text-xs text-muted">Today</span>
            )}
          </div>
          <button
            type="button"
            className={cn(btn, 'size-9 p-0 text-[22px]')}
            aria-label="Next day"
            disabled={atToday}
            onClick={() => setDay((current) => shiftDay(current, 1))}
          >
            ›
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 max-[980px]:justify-start">
          <button type="button" className={btn} onClick={() => void togglePause()}>
            {status?.paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className={btnPrimary} onClick={() => void summarize()} disabled={summaryBusy}>
            {summaryBusy ? 'Writing…' : 'Summarize'}
          </button>
          <button type="button" className={btn} onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      {preview ? (
        <p className={banner}>Preview data for the layout. Launch the Electron app to track this computer.</p>
      ) : null}
      {status?.permissionHint ? <p className={cn(banner, 'border-copper/45')}>{status.permissionHint}</p> : null}
      {status?.lastError && !status.permissionHint ? (
        <p className={cn(banner, 'border-copper/45')}>{status.lastError}</p>
      ) : null}
      {loadError ? <p className={cn(banner, 'border-copper/45')}>{loadError}</p> : null}
      {notice ? <p className={banner}>{notice}</p> : null}

      {!overview ? (
        <p className={banner}>Loading this day…</p>
      ) : (
        <main>
          <section className="mb-3.5 mt-2 flex gap-[18px] text-muted">
            <span>
              <strong className="mr-1.5 font-serif text-[22px] font-medium text-ink">
                {formatDuration(overview.totals.trackedMs)}
              </strong>
              tracked
            </span>
            <span>
              <strong className="mr-1.5 font-serif text-[22px] font-medium text-ink">
                {formatDuration(overview.totals.webMs)}
              </strong>
              on the web
            </span>
            <span>
              <strong className="mr-1.5 font-serif text-[22px] font-medium text-ink">{overview.totals.fileCount}</strong>
              file saves
            </span>
          </section>
          <Timeline
            blocks={blocks}
            files={overview.files}
            range={overview.range}
            now={now}
            showNow={day === todayKey(now) && !status?.paused}
            selectedId={selectedId}
            onSelectBlock={setSelectedId}
            onSelectFile={setSelectedId}
          />
          <div className="mt-4 grid grid-cols-[1.3fr_0.9fr] gap-4 max-[980px]:grid-cols-1">
            <Activity blocks={blocks} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="flex flex-col gap-4">
              <SummaryCard
                summary={overview.summary}
                busy={summaryBusy}
                error={summaryError}
                onSummarize={() => void summarize()}
              />
              <Sites sites={overview.sites} platform={status?.platform ?? 'darwin'} />
            </div>
          </div>
          <Files files={overview.files} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="mt-4 text-[13px] text-muted">
            Closing the window keeps Timebot running. Quit from the Timebot menu.
          </p>
        </main>
      )}

      {settingsOpen && settings ? (
        <Settings
          settings={settings}
          preview={preview}
          onClose={() => setSettingsOpen(false)}
          onPickFolder={() => client().pickFolder()}
          onShowData={async () => {
            const result = await client().showDataFolder();
            setNotice(preview ? `Data would live in ${result.path}` : `Opened ${result.path}`);
          }}
          onClearHistory={async () => {
            await client().clearHistory();
            setOverview(await client().getOverview(day));
            setNotice('Local history erased.');
          }}
          onSave={async (input) => {
            const result = await client().saveSettings(input);
            if (!result.ok) return result.error;
            setSettings(result.settings);
            setStatus(await client().getStatus());
            return null;
          }}
        />
      ) : null}
    </div>
  );
}
