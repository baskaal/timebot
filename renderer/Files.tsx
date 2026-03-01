import { useEffect } from 'react';
import { formatTime } from '../core/day.ts';
import type { FileEvent } from '../core/types.ts';
import { card, cn, fine, heading } from './ui.ts';

export function Files(props: {
  files: Array<FileEvent & { displayPath: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  useEffect(() => {
    if (!props.selectedId) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`file-${props.selectedId}`)?.scrollIntoView({
      block: 'nearest',
      behavior: motion ? 'auto' : 'smooth',
    });
  }, [props.selectedId]);

  return (
    <section className={cn(card, 'mt-4')}>
      <h2 className={cn(heading, 'mb-2')}>Files saved</h2>
      {props.files.length === 0 ? <p className="text-muted">No text files saved in the watched folders.</p> : null}
      <div>
        {props.files.map((file) => {
          const open = props.selectedId === file.id;
          return (
            <article
              key={file.id}
              id={`file-${file.id}`}
              className={cn('border-t border-line', open && '-mx-[18px] bg-[rgb(60_77_137/0.05)] px-[18px]')}
            >
              <button
                type="button"
                className="grid w-full grid-cols-[88px_1fr_auto] gap-2.5 rounded-none border-0 bg-transparent px-0 py-2.5 text-left"
                onClick={() => props.onSelect(file.id)}
              >
                <span>{formatTime(file.ts)}</span>
                <strong>{file.displayPath}</strong>
                <em className="font-normal not-italic">
                  {file.change === 'unlink' ? 'deleted' : `+${file.added} −${file.removed}`}
                </em>
              </button>
              {open ? (
                <div>
                  {file.note ? <p className={cn(fine, 'mb-2')}>{file.note}</p> : null}
                  {file.diff ? (
                    <pre className="mb-3 max-h-[220px] overflow-auto rounded-xl bg-black/4 p-2.5 font-mono text-xs leading-snug dark:bg-white/6">
                      {file.diff.split('\n').map((line, index) => (
                        <div
                          key={index}
                          className={cn(
                            line.startsWith('+') && 'bg-add-bg text-add',
                            line.startsWith('-') && 'bg-del-bg text-del',
                          )}
                        >
                          {line}
                        </div>
                      ))}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
