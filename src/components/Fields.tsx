// Shared form cells for the ledger-style sections.

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
}) {
  const { label, value, onChange, error, hint } = props;
  return (
    <div className={`cell num${error ? ' has-error' : ''}`} role="cell">
      <span className="cell-label" aria-hidden="true">
        {label}
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
