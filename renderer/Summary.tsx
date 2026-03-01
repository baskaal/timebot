import type { SummaryRecord } from '../core/types.ts';

function SummaryBody(props: { content: string }) {
  return (
    <div className="prose">
      {props.content.split('\n').map((line, index) => {
        const bullet = /^\s*(?:[-*]|\d+\.)\s+(.*)/.exec(line);
        if (!line.trim()) return <div key={index} className="gap" />;
        if (bullet) return <p key={index} className="bullet">{bullet[1]}</p>;
        if (line.trim() === 'Done') return <h3 key={index}>Done</h3>;
        return <p key={index}>{line}</p>;
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
    <section className="card summary">
      <div className="card-head">
        <h2>Summary</h2>
        <button type="button" className="primary" onClick={props.onSummarize} disabled={props.busy}>
          {props.busy ? 'Writing…' : props.summary ? 'Rewrite' : 'Write summary'}
        </button>
      </div>
      <p className="fine">
        Sends this day’s redacted log to OpenAI when you click. Nothing is sent on its own.
      </p>
      {props.error ? <p className="error">{props.error}</p> : null}
      {props.summary ? (
        <>
          <SummaryBody content={props.summary.content} />
          <p className="fine">
            {props.summary.model} · {new Date(props.summary.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
        </>
      ) : (
        <p className="empty-copy">A short journal of the blocks, sites, and file edits above.</p>
      )}
    </section>
  );
}
