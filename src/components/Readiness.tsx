import type { ReadinessItem } from '@/lib/readiness';
import { CheckIcon } from './Icons';

/** Completeness checklist with a progress bar. Measures information, never tax amounts. */
export function Readiness({ percent, items }: { percent: number; items: ReadinessItem[] }) {
  return (
    <section className="readiness" aria-labelledby="ready-h">
      <div className="readiness-head">
        <h2 id="ready-h">Ready to file</h2>
        <span className="readiness-pct">{percent}%</span>
      </div>
      <div
        className="readiness-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-labelledby="ready-h"
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <ul className="readiness-list">
        {items.map((i) => (
          <li key={i.id} className={i.done ? 'done' : ''}>
            <span className="tick" aria-hidden="true">
              {i.done && <CheckIcon />}
            </span>
            <span>
              <strong>{i.label}</strong>
              <span className="sr-only">{i.done ? ' (done)' : ' (to do)'}</span>
              <small>{i.detail}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
