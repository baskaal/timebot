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
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <h1>timebot</h1>
            <p className="status" aria-live="polite">
              {status?.paused
                ? 'Paused'
                : status?.lastSample
                  ? `Tracking · ${status.lastSample.app}`
                  : 'Starting'}
            </p>
          </div>
        </div>
        <div className="daynav">
          <button type="button" aria-label="Previous day" onClick={() => setDay((current) => shiftDay(current, -1))}>
            ‹
          </button>
          <div>
            <strong>{formatDay(day)}</strong>
            {day !== todayKey(now) ? (
              <button type="button" className="texty" onClick={() => setDay(todayKey(now))}>
                Today
              </button>
            ) : (
              <span>Today</span>
            )}
          </div>
          <button
            type="button"
            aria-label="Next day"
            disabled={atToday}
            onClick={() => setDay((current) => shiftDay(current, 1))}
          >
            ›
          </button>
        </div>
        <div className="actions">
          <button type="button" onClick={() => void togglePause()}>
            {status?.paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="primary" onClick={() => void summarize()} disabled={summaryBusy}>
            {summaryBusy ? 'Writing…' : 'Summarize'}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      {preview ? (
        <p className="banner">Preview data for the layout. Launch the Electron app to track this computer.</p>
      ) : null}
      {status?.permissionHint ? <p className="banner warn">{status.permissionHint}</p> : null}
      {status?.lastError && !status.permissionHint ? <p className="banner warn">{status.lastError}</p> : null}
      {loadError ? <p className="banner warn">{loadError}</p> : null}
      {notice ? <p className="banner">{notice}</p> : null}

      {!overview ? (
        <p className="loading">Loading this day…</p>
      ) : (
        <main>
          <section className="stats">
            <span>
              <strong>{formatDuration(overview.totals.trackedMs)}</strong> tracked
            </span>
            <span>
              <strong>{formatDuration(overview.totals.webMs)}</strong> on the web
            </span>
            <span>
              <strong>{overview.totals.fileCount}</strong> file saves
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
          <div className="split">
            <Activity blocks={blocks} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="stack">
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
          <p className="footnote">Closing the window keeps Timebot running. Quit from the Timebot menu.</p>
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
