import { formatDuration } from '../core/day.ts';
import type { SiteStat } from '../core/types.ts';
import { card, cn, fine, heading } from './ui.ts';

export function Sites(props: { sites: SiteStat[]; platform: string }) {
  const focused = props.sites.filter((site) => site.activeMs > 0);
  const background = props.sites.filter((site) => site.activeMs === 0 && site.open);

  return (
    <section className={card}>
      <h2 className={cn(heading, 'mb-2')}>Websites</h2>
      {props.platform === 'win32' ? (
        <p className={fine}>On Windows, Timebot records the site in front. Open background tabs are listed on Mac.</p>
      ) : (
        <p className={fine}>Focused time is the tab in front. Other open tabs are listed underneath.</p>
      )}
      {focused.length === 0 && background.length === 0 ? <p className="text-muted">No sites yet.</p> : null}
      <ul className="m-0 list-none p-0">
        {focused.map((site) => (
          <li key={site.domain} className="flex justify-between gap-3 border-t border-line py-2">
            <div className="flex min-w-0 flex-col">
              <strong>{site.domain}</strong>
              <span className="truncate text-[13px] text-muted">{site.titles[0]}</span>
            </div>
            <em className="text-[13px] font-normal not-italic text-muted">{formatDuration(site.activeMs)}</em>
          </li>
        ))}
      </ul>
      {background.length > 0 ? (
        <>
          <h3 className="mt-4 mb-2 font-serif text-lg font-medium">Also open</h3>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {background.map((site) => (
              <li key={site.domain} className="rounded-full border border-line px-2.5 py-1 text-[13px]">
                {site.domain}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
