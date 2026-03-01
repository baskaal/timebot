import { formatDuration, formatTime } from '../core/day.ts';
import type { Block } from '../core/types.ts';
import { blockText } from './labels.ts';
import { card, cn, heading } from './ui.ts';

export function Activity(props: { blocks: Block[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (props.blocks.length === 0) {
    return (
      <section className={card}>
        <h2 className={cn(heading, 'mb-2')}>Time blocks</h2>
        <p className="text-muted">Nothing in the foreground yet. Use your computer and the blocks will show up here.</p>
      </section>
    );
  }

  return (
    <section className={card} aria-label="Time blocks">
      <h2 className={cn(heading, 'mb-2')}>Time blocks</h2>
      <div className="flex flex-col">
        {props.blocks.map((block) => {
          const text = blockText(block);
          const selected = props.selectedId === block.id;
          return (
            <div
              key={block.id}
              className={cn('border-t border-line', selected && '-mx-[18px] bg-[rgb(196_98_45/0.08)] px-[18px]')}
            >
              <button
                type="button"
                className="grid w-full grid-cols-[88px_72px_1fr] items-start gap-2 rounded-none border-0 bg-transparent px-0 py-3 text-left"
                onClick={() => props.onSelect(block.id)}
              >
                <span className="text-muted tabular-nums">{formatTime(block.start)}</span>
                <span className="text-muted tabular-nums">{formatDuration(block.end - block.start)}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="font-semibold">{text.title}</strong>
                  {text.subtitle ? <em className="text-[13px] font-normal not-italic text-muted">{text.subtitle}</em> : null}
                </span>
              </button>
              {selected && block.url ? (
                <a className="mb-3 -mt-1 ml-0 block break-all text-[13px] text-teal min-[981px]:ml-[168px]" href={block.url}>
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
