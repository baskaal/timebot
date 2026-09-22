import { categoryFor } from '../core/apps.ts';
import { formatTime } from '../core/day.ts';
import type { Block, FileEvent } from '../core/types.ts';
import { blockText } from './labels.ts';
import { blockTone, cn } from './ui.ts';

const HOUR_PX = 128;

export function Timeline(props: {
  blocks: Block[];
  files: FileEvent[];
  range: { start: number; end: number };
  now: number;
  showNow: boolean;
  selectedId: string | null;
  onSelectBlock: (id: string) => void;
  onSelectFile: (id: string) => void;
}) {
  const span = Math.max(1, props.range.end - props.range.start);
  const width = Math.max(720, (span / 3_600_000) * HOUR_PX);
  const left = (ts: number) => ((ts - props.range.start) / span) * width;
  const hours: number[] = [];
  const cursor = new Date(props.range.start);
  cursor.setMinutes(0, 0, 0);
  for (let ts = cursor.getTime(); ts <= props.range.end; ts += 3_600_000) {
    if (ts >= props.range.start - 1000) hours.push(ts);
  }

  return (
    <div className="overflow-x-auto rounded-[18px] border border-line bg-card shadow-card" aria-label="Time blocks">
      <div className="relative h-44 min-w-full" style={{ width }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="pointer-events-none absolute inset-y-0 border-l border-line pt-2.5 pl-2 text-xs text-muted"
            style={{ left: left(hour) }}
          >
            {formatTime(hour)}
          </div>
        ))}
        <div className="absolute inset-x-0 top-[38px] h-[78px]">
          {props.blocks.map((block) => {
            const text = blockText(block);
            const x = left(Math.max(block.start, props.range.start));
            const w = Math.max(14, left(Math.min(block.end, props.range.end)) - x);
            return (
              <button
                key={block.id}
                type="button"
                className={cn(
                  'absolute top-2 flex h-[62px] flex-col gap-0.5 overflow-hidden rounded-xl px-2.5 py-2 text-left',
                  blockTone[categoryFor(block.app, block.kind)],
                  props.selectedId === block.id && 'outline-2 outline-offset-2 outline-solid outline-ink',
                  w < 88 && '[&_span]:hidden [&_small]:hidden',
                )}
                style={{ left: x, width: w }}
                title={`${text.title} ${text.subtitle}`}
                onClick={() => props.onSelectBlock(block.id)}
              >
                <span className="truncate">{text.title}</span>
                {text.subtitle ? <small className="truncate text-[11px] opacity-85">{text.subtitle}</small> : null}
              </button>
            );
          })}
        </div>
        <div className="absolute inset-x-0 top-[124px] h-8">
          {props.files.map((file) => (
            <button
              key={file.id}
              type="button"
              className={cn(
                'absolute top-2 size-3 -ml-1.5 rounded-full border-2 border-card bg-indigo p-0',
                props.selectedId === file.id && 'outline-2 outline-solid outline-ink',
              )}
              style={{ left: left(file.ts) }}
              title={file.name}
              aria-label={file.name}
              onClick={() => props.onSelectFile(file.id)}
            />
          ))}
        </div>
        {props.showNow && props.now >= props.range.start && props.now <= props.range.end ? (
          <div className="pointer-events-none absolute top-7 bottom-3.5 w-0.5 bg-copper" style={{ left: left(props.now) }} />
        ) : null}
      </div>
    </div>
  );
}
