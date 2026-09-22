import { formatDuration } from '../core/day.ts';
import type { SiteStat } from '../core/types.ts';

export function Sites(props: { sites: SiteStat[]; platform: string }) {
  const focused = props.sites.filter((site) => site.activeMs > 0);
  const background = props.sites.filter((site) => site.activeMs === 0 && site.open);

  return (
    <section className="card">
      <h2>Websites</h2>
      {props.platform === 'win32' ? (
        <p className="fine">On Windows, Timebot records the site in front. Open background tabs are listed on Mac.</p>
      ) : (
        <p className="fine">Focused time is the tab in front. Other open tabs are listed underneath.</p>
      )}
      {focused.length === 0 && background.length === 0 ? (
        <p className="empty-copy">No sites yet.</p>
      ) : null}
      <ul className="site-list">
        {focused.map((site) => (
          <li key={site.domain}>
            <div>
              <strong>{site.domain}</strong>
              <span>{site.titles[0]}</span>
            </div>
            <em>{formatDuration(site.activeMs)}</em>
          </li>
        ))}
      </ul>
      {background.length > 0 ? (
        <>
          <h3>Also open</h3>
          <ul className="chips">
            {background.map((site) => (
              <li key={site.domain}>{site.domain}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
