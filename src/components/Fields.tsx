// Shared form cells for the ledger-style sections.

import { Hint, WithHint } from './Hint';
import { XIcon } from './Icons';
import type { TopicId } from './explainers';

export function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cell" role="cell">
      <span className="cell-label" aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}

export function AmountCell(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  topic?: TopicId;
}) {
  const { label, value, onChange, error, hint, topic } = props;
  return (
    <div className={`cell num${error ? ' has-error' : ''}`} role="cell">
      <span className="cell-label">
        <span aria-hidden="true">{label}</span>
        {topic && <Hint topic={topic} />}
      </span>
      <span className="amount">
        <span className="amount-prefix" aria-hidden="true">
          Rs
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          aria-invalid={!!error}
        />
      </span>
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/** Heading strip for one section of the sheet. Sections the person added themselves can be removed. */
export function SectionHead(props: {
  id: string;
  title: string;
  topic?: TopicId;
  meta?: string;
  onRemove?: () => void;
}) {
  const { id, title, topic, meta, onRemove } = props;
  return (
    <header className="part-head">
      <h2 id={id}>{topic ? <WithHint text={title} topic={topic} /> : title}</h2>
      <span className="part-head-end">
        {meta && <span className="part-meta">{meta}</span>}
        {onRemove && (
          <button type="button" className="icon-btn" aria-label={`Remove ${title.toLowerCase()}`} onClick={onRemove}>
            <XIcon />
          </button>
        )}
      </span>
    </header>
  );
}
