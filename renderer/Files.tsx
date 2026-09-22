import { useEffect } from 'react';
import { formatTime } from '../core/day.ts';
import type { FileEvent } from '../core/types.ts';

export function Files(props: {
  files: Array<FileEvent & { displayPath: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  useEffect(() => {
    if (!props.selectedId) return;
    document.getElementById(`file-${props.selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [props.selectedId]);

  return (
    <section className="card">
      <h2>Files saved</h2>
      {props.files.length === 0 ? <p className="empty-copy">No text files saved in the watched folders.</p> : null}
      <div className="file-list">
        {props.files.map((file) => {
          const open = props.selectedId === file.id;
          return (
            <article key={file.id} id={`file-${file.id}`} className={open ? 'open' : ''}>
              <button type="button" className="file-row" onClick={() => props.onSelect(file.id)}>
                <span>{formatTime(file.ts)}</span>
                <strong>{file.displayPath}</strong>
                <em>
                  {file.change === 'unlink' ? 'deleted' : `+${file.added} −${file.removed}`}
                </em>
              </button>
              {open ? (
                <div className="file-body">
                  {file.note ? <p className="fine">{file.note}</p> : null}
                  {file.diff ? (
                    <pre>
                      {file.diff.split('\n').map((line, index) => (
                        <div key={index} className={line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : ''}>
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
