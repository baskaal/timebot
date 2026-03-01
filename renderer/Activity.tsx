import { categoryFor } from '../core/apps.ts';
import { formatDuration, formatTime } from '../core/day.ts';
import type { Block } from '../core/types.ts';
import { blockText } from './labels.ts';

export function Activity(props: { blocks: Block[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (props.blocks.length === 0) {
    return (
      <section className="card">
        <h2>Time blocks</h2>
        <p className="empty-copy">Nothing in the foreground yet. Use your computer and the blocks will show up here.</p>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Time blocks">
      <h2>Time blocks</h2>
      <div className="rows">
        {props.blocks.map((block) => {
          const text = blockText(block);
          const selected = props.selectedId === block.id;
          return (
            <div key={block.id} className={`row ${selected ? 'selected' : ''}`}>
              <button type="button" onClick={() => props.onSelect(block.id)}>
                <span className="when">{formatTime(block.start)}</span>
                <span className="dur">{formatDuration(block.end - block.start)}</span>
                <span className="what">
                  <span className={`dot ${categoryFor(block.app, block.kind)}`} />
                  <strong>{text.title}</strong>
                  {text.subtitle ? <em>{text.subtitle}</em> : null}
                </span>
              </button>
              {selected && block.url ? (
                <a className="url" href={block.url}>
                  {block.url}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
