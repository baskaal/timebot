import { categoryFor } from '../core/apps.ts';
import { formatTime } from '../core/day.ts';
import type { Block, FileEvent } from '../core/types.ts';
import { blockText } from './labels.ts';

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
    <div className="timeline-scroll" aria-label="Time blocks">
      <div className="timeline-canvas" style={{ width }}>
        {hours.map((hour) => (
          <div key={hour} className="hour" style={{ left: left(hour) }}>
            {formatTime(hour)}
          </div>
        ))}
        <div className="lane">
          {props.blocks.map((block) => {
            const text = blockText(block);
            const x = left(Math.max(block.start, props.range.start));
            const w = Math.max(14, left(Math.min(block.end, props.range.end)) - x);
            return (
              <button
                key={block.id}
                type="button"
                className={`block ${categoryFor(block.app, block.kind)} ${props.selectedId === block.id ? 'selected' : ''}`}
                style={{ left: x, width: w }}
                data-narrow={w < 88 ? 'true' : 'false'}
                title={`${text.title} ${text.subtitle}`}
                onClick={() => props.onSelectBlock(block.id)}
              >
                <span>{text.title}</span>
                {text.subtitle ? <small>{text.subtitle}</small> : null}
              </button>
            );
          })}
        </div>
        <div className="lane saves">
          {props.files.map((file) => (
            <button
              key={file.id}
              type="button"
              className={`tick ${props.selectedId === file.id ? 'selected' : ''}`}
              style={{ left: left(file.ts) }}
              title={file.name}
              aria-label={file.name}
              onClick={() => props.onSelectFile(file.id)}
            />
          ))}
        </div>
        {props.showNow && props.now >= props.range.start && props.now <= props.range.end ? (
          <div className="now" style={{ left: left(props.now) }} />
        ) : null}
      </div>
    </div>
  );
}
