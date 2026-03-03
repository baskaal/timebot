import { useEffect } from 'react';
import { formatDuration, formatTime } from '../core/day.ts';
import type { Block, FileEvent } from '../core/types.ts';
import { blockText } from './labels.ts';
import { card, cn, fine } from './ui.ts';

export type EventFilter = 'all' | 'app' | 'web' | 'file';

type DayEvent =
  | { type: 'app' | 'web'; id: string; ts: number; block: Block }
  | { type: 'file'; id: string; ts: number; file: FileEvent & { displayPath: string } };

const filters: Array<{ id: EventFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'app', label: 'App usage' },
  { id: 'web', label: 'Website usage' },
  { id: 'file', label: 'File save' },
];

const rowButton =
  'grid w-full grid-cols-[88px_72px_minmax(0,1fr)_auto] items-center gap-2 rounded-none border-0 bg-transparent px-0 py-3 text-left';

function typeName(type: 'app' | 'web' | 'file') {
  return filters.find((item) => item.id === type)?.label ?? type;
}

const typeStyle = {
  app: 'bg-copper/15 text-copper',
  web: 'bg-teal/15 text-teal',
  file: 'bg-indigo/15 text-indigo',
};

const filterStyle: Record<EventFilter, { idle: string; active: string }> = {
  all: {
    idle: 'border-ink/40 text-ink',
    active: 'border-ink bg-ink text-paper',
  },
  app: {
    idle: 'border-copper text-copper',
    active: 'border-copper bg-copper text-[#fff8f2] dark:text-[#141210]',
  },
  web: {
    idle: 'border-teal text-teal',
    active: 'border-teal bg-teal text-[#fff8f2] dark:text-[#141210]',
  },
  file: {
    idle: 'border-indigo text-indigo',
    active: 'border-indigo bg-indigo text-[#fff8f2] dark:text-[#141210]',
  },
};

function TypeLabel(props: { type: 'app' | 'web' | 'file' }) {
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', typeStyle[props.type])}>
      {typeName(props.type)}
    </span>
  );
}

function dayEvents(blocks: Block[], files: Array<FileEvent & { displayPath: string }>): DayEvent[] {
  const visits: DayEvent[] = blocks.map((block) => ({ type: block.kind, id: block.id, ts: block.start, block }));
  const saves: DayEvent[] = files.map((file) => ({ type: 'file', id: file.id, ts: file.ts, file }));
  return [...visits, ...saves].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

export function EventFilters(props: { value: EventFilter; onChange: (value: EventFilter) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2" role="group" aria-label="Event type">
      {filters.map((item) => {
        const active = props.value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-[13px]',
              active ? filterStyle[item.id].active : cn('bg-transparent', filterStyle[item.id].idle),
            )}
            onClick={() => props.onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Events(props: {
  blocks: Block[];
  files: Array<FileEvent & { displayPath: string }>;
  filter: EventFilter;
  onFilter: (filter: EventFilter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  empty?: string;
}) {
  const events = dayEvents(props.blocks, props.files);
  const visible = props.filter === 'all' ? events : events.filter((event) => event.type === props.filter);

  useEffect(() => {
    if (!props.selectedId) return;
    const block = props.blocks.find((item) => item.id === props.selectedId);
    const file = props.files.find((item) => item.id === props.selectedId);
    const type = block?.kind ?? (file ? 'file' : null);
    if (!type || props.filter === 'all' || type === props.filter) return;
    props.onFilter(type);
  }, [props.selectedId]);

  useEffect(() => {
    if (!props.selectedId) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`event-${props.selectedId}`)?.scrollIntoView({
      block: 'nearest',
      behavior: motion ? 'auto' : 'smooth',
    });
  }, [props.selectedId, props.filter]);

  return (
    <section className={cn(card, 'flex min-h-0 w-full flex-1 flex-col rounded-none')} aria-label="Events">
      {visible.length === 0 ? (
        <p className="mt-3 text-muted">
          {props.empty && props.filter === 'all'
            ? props.empty
            : props.filter === 'file'
              ? 'No file saves in the watched folders.'
              : props.filter === 'web'
                ? 'No website usage yet.'
                : props.filter === 'app'
                  ? 'No app usage yet.'
                  : 'Nothing recorded yet. Use your computer and events will show up here.'}
        </p>
      ) : (
        <div className="-mx-[18px] min-h-0 flex-1 overflow-y-auto px-[18px]">
          <div className="flex flex-col">
          {visible.map((event) => {
            const selected = props.selectedId === event.id;
            return (
              <article
                key={event.id}
                id={`event-${event.id}`}
                className={cn('border-t border-line', selected && '-mx-[18px] bg-[rgb(196_98_45/0.08)] px-[18px]')}
              >
                {event.type === 'file' ? (
                  <FileRow file={event.file} selected={selected} onSelect={() => props.onSelect(event.id)} />
                ) : (
                  <VisitRow block={event.block} selected={selected} onSelect={() => props.onSelect(event.id)} />
                )}
              </article>
            );
          })}
          </div>
        </div>
      )}
    </section>
  );
}

function VisitRow(props: { block: Block; selected: boolean; onSelect: () => void }) {
  const text = blockText(props.block);
  return (
    <>
      <button type="button" className={rowButton} onClick={props.onSelect}>
        <span className="text-muted tabular-nums">{formatTime(props.block.start)}</span>
        <span className="text-muted tabular-nums">{formatDuration(props.block.end - props.block.start)}</span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <strong className="truncate font-semibold">{text.title}</strong>
          {text.subtitle ? <em className="truncate text-[13px] font-normal not-italic text-muted">{text.subtitle}</em> : null}
        </span>
        <TypeLabel type={props.block.kind} />
      </button>
      {props.selected && props.block.url ? (
        <a className="mb-3 -mt-1 ml-0 block break-all text-[13px] text-teal min-[981px]:ml-[168px]" href={props.block.url}>
          {props.block.url}
        </a>
      ) : null}
    </>
  );
}

function FileRow(props: { file: FileEvent & { displayPath: string }; selected: boolean; onSelect: () => void }) {
  const file = props.file;
  return (
    <>
      <button type="button" className={rowButton} onClick={props.onSelect}>
        <span className="text-muted tabular-nums">{formatTime(file.ts)}</span>
        <span className="text-muted tabular-nums">
          {file.change === 'unlink' ? 'deleted' : `+${file.added} −${file.removed}`}
        </span>
        <span className="min-w-0 truncate font-semibold">{file.displayPath}</span>
        <TypeLabel type="file" />
      </button>
      {props.selected ? (
        <div className="mb-3">
          {file.note ? <p className={cn(fine, 'mb-2')}>{file.note}</p> : null}
          {file.diff ? (
            <pre className="max-h-[220px] overflow-auto rounded-xl bg-black/4 p-2.5 font-mono text-xs leading-snug dark:bg-white/6">
              {file.diff.split('\n').map((line, index) => (
                <div
                  key={index}
                  className={cn(line.startsWith('+') && 'bg-add-bg text-add', line.startsWith('-') && 'bg-del-bg text-del')}
                >
                  {line}
                </div>
              ))}
            </pre>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
