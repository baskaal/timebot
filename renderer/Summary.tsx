import type { SummaryRecord } from '../core/types.ts';
import { btnPrimary, card, cn, fine, heading } from './ui.ts';

function SummaryBody(props: { content: string }) {
  return (
    <div className="font-serif text-[17px]">
      {props.content.split('\n').map((line, index) => {
        const bullet = /^\s*(?:[-*]|\d+\.)\s+(.*)/.exec(line);
        if (!line.trim()) return <div key={index} className="h-2" />;
        if (bullet) {
          return (
            <p key={index} className="mb-2 ml-1 leading-[1.45] before:text-copper before:content-['–\00a0']">
              {bullet[1]}
            </p>
          );
        }
        if (line.trim() === 'Done') return <h3 key={index} className="mb-2 font-serif text-xl font-medium">Done</h3>;
        return <p key={index} className="mb-2 leading-[1.45]">{line}</p>;
      })}
    </div>
  );
}

export function SummaryCard(props: {
  summary: SummaryRecord | null;
  busy: boolean;
  error: string;
  onSummarize: () => void;
}) {
  return (
    <section className={card}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className={heading}>Summary</h2>
        <button type="button" className={btnPrimary} onClick={props.onSummarize} disabled={props.busy}>
          {props.busy ? 'Writing…' : props.summary ? 'Rewrite' : 'Write summary'}
        </button>
      </div>
      <p className={cn(fine, 'mb-2')}>
        Sends this day’s redacted log to OpenAI when you click. Nothing is sent on its own.
      </p>
      {props.error ? <p className="mb-2 text-del">{props.error}</p> : null}
      {props.summary ? (
        <>
          <SummaryBody content={props.summary.content} />
          <p className={fine}>
            {props.summary.model} · {new Date(props.summary.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
        </>
      ) : (
        <p className="text-muted">A short journal of the blocks, sites, and file edits above.</p>
      )}
    </section>
  );
}
