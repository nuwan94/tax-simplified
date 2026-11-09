'use client';

import { monthLabel } from '@/lib/fx';
import { AmountCell, Cell, SectionHead } from './Fields';
import { Hint, WithHint } from './Hint';
import { PlusIcon, XIcon } from './Icons';
import { MONTHS, emptyPayRow, workedMonths, type EmployerRow, type PayRow, type TaxForm } from './useTaxForm';

const money = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Salary: one card per employer, entered from a T-10 certificate or month by month from payslips. */
export function SalarySection({ f, onRemove }: { f: TaxForm; onRemove?: () => void }) {
  return (
    <section className="part" aria-labelledby="sec-salary">
      <SectionHead id="sec-salary" title="Salary" topic="employment" meta="Schedule 1" onRemove={onRemove} />
      {f.employers.map((r, i) => (
        <EmployerCard key={r.key} f={f} r={r} i={i} />
      ))}
      <button type="button" className="btn-secondary" onClick={f.addEmployer}>
        <PlusIcon /> Add another employer
      </button>
    </section>
  );
}

function EmployerCard({ f, r, i }: { f: TaxForm; r: EmployerRow; i: number }) {
  const upd = (patch: Partial<EmployerRow>) => f.updateEmployer(r.key, patch);
  const sum = f.payslips[r.key];
  return (
    <div className="entry-card">
      <div className="entry-card-head">
        <strong>{r.name.trim() || `Employer ${i + 1}`}</strong>
        {i > 0 && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remove employer ${i + 1}`}
            onClick={() => f.removeEmployer(r.key)}
          >
            <XIcon />
          </button>
        )}
      </div>

      <Cell label="Employer">
        <input
          type="text"
          autoComplete="off"
          placeholder="Company name"
          value={r.name}
          onChange={(e) => upd({ name: e.target.value })}
          aria-label={`Employer ${i + 1} name`}
        />
      </Cell>

      <fieldset className="inline-q">
        <legend>
          <WithHint text="Enter from" topic="payslips" />
        </legend>
        <div className="seg" role="radiogroup" aria-label="Enter from">
          {(['payslips', 't10'] as const).map((s) => (
            <label key={s} className={r.source === s ? 'on' : ''}>
              <input type="radio" name={`${r.key}-src`} checked={r.source === s} onChange={() => upd({ source: s })} />
              {s === 't10' ? 'T-10' : 'Payslips'}
            </label>
          ))}
        </div>
      </fieldset>

      {r.source === 't10' ? (
        <div className="pair-2">
          <AmountCell
            label="Gross remuneration"
            value={r.gross}
            error={f.errors[`${r.key}.gross`]}
            onChange={(v) => upd({ gross: v })}
          />
          <AmountCell
            label="APIT deducted"
            topic="apit"
            value={r.apit}
            error={f.errors[`${r.key}.apit`]}
            onChange={(v) => upd({ apit: v })}
          />
        </div>
      ) : (
        <>
          <label className="check">
            <input type="checkbox" checked={r.pegged} onChange={(e) => upd({ pegged: e.target.checked })} />
            <span>
              Salary pegged to US dollars <Hint topic="pegged" />
            </span>
          </label>

          <PayChanges f={f} r={r} />

          <div className="pay-wrap">
            <PayMonths f={f} r={r} primary={i === 0} />
          </div>

          {sum && sum.rows.length > 0 && (
            <div className="pay-total">
              <div>
                <span>Gross pay for the year</span>
                <span className="num">{money(sum.gross)}</span>
              </div>
              <div>
                <span>APIT deducted</span>
                <span className="num">{money(sum.apit)}</span>
              </div>
              {sum.rows.length < 12 && (
                <p className="pay-flag">
                  {sum.rows.length} {sum.rows.length === 1 ? 'month' : 'months'}
                </p>
              )}
              {(sum.estimatedApitMonths > 0 || sum.estimatedPayMonths > 0) && (
                <p className="pay-flag">Grey figures are estimates.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Pay rate over the year: the starting pay, then each raise or promotion, and the last month worked. */
function PayChanges({ f, r }: { f: TaxForm; r: EmployerRow }) {
  const upd = (patch: Partial<EmployerRow>) => f.updateEmployer(r.key, patch);
  const setChange = (ci: number, patch: Partial<EmployerRow['changes'][number]>) =>
    upd({ changes: r.changes.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });
  const used = new Set(r.changes.map((c) => c.from));
  const start = r.changes[0]?.from ?? MONTHS[0]!;
  const nextFree = MONTHS.find((m) => m > (r.changes.at(-1)?.from ?? '') && m <= r.lastMonth && !used.has(m));
  // the first row can start any month; later changes fall after it and by the last month worked
  const choices = (ci: number) => (ci === 0 ? MONTHS : MONTHS.filter((m) => m > start && m <= r.lastMonth));
  const unit = r.pegged && r.basicIn === 'USD' ? '$' : 'Rs';

  return (
    <div className="pay-changes">
      <div className="pay-changes-head">
        <span className="mini-head">{r.pegged ? 'Basic salary' : 'Monthly pay'}</span>
        {r.pegged && (
          <>
            <div className="seg small" role="radiogroup" aria-label="Basic salary in">
              {(['LKR', 'USD'] as const).map((c) => (
                <label key={c} className={r.basicIn === c ? 'on' : ''}>
                  <input
                    type="radio"
                    name={`${r.key}-basic-in`}
                    checked={r.basicIn === c}
                    onChange={() => upd({ basicIn: c })}
                  />
                  {c === 'LKR' ? 'Rs' : 'USD'}
                </label>
              ))}
            </div>
            <label className="mini-field inline">
              <span>Peg</span>
              <input
                type="text"
                inputMode="decimal"
                value={r.peg}
                onChange={(e) => upd({ peg: e.target.value })}
                aria-label="Peg rate, rupees per US dollar"
                aria-invalid={!!f.errors[`${r.key}.peg`]}
              />
            </label>
          </>
        )}
      </div>

      {r.changes.map((c, ci) => {
        const err = f.errors[`${r.key}.c.${ci}`];
        return (
          <div key={ci} className={`pay-change${err ? ' has-error' : ''}`}>
            <label className="mini-field">
              <span>{ci === 0 ? 'From' : 'Changed in'}</span>
              <select value={c.from} onChange={(e) => setChange(ci, { from: e.target.value })}>
                {choices(ci).map((m) => (
                  <option key={m} value={m} disabled={m !== c.from && used.has(m)}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mini-field grow">
              <span>{unit}</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={c.amount}
                onChange={(e) => setChange(ci, { amount: e.target.value })}
                aria-label={`${r.pegged ? 'Basic salary' : 'Monthly pay'} from ${monthLabel(c.from)}`}
                aria-invalid={!!err}
              />
            </label>
            {ci > 0 && (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove pay change in ${monthLabel(c.from)}`}
                onClick={() => upd({ changes: r.changes.filter((_, j) => j !== ci) })}
              >
                <XIcon />
              </button>
            )}
            {err && <span className="field-error">{err}</span>}
          </div>
        );
      })}

      <div className="pay-changes-foot">
        {nextFree && (
          <button
            type="button"
            className="link-btn"
            onClick={() => upd({ changes: [...r.changes, { from: nextFree, amount: '' }] })}
          >
            + Pay change
          </button>
        )}
        <label className="mini-field inline">
          <span>Until</span>
          <select value={r.lastMonth} onChange={(e) => upd({ lastMonth: e.target.value })}>
            {MONTHS.filter((m) => m >= start).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** One payslip row per month worked. Grey placeholders are worked out; typing replaces them. */
function PayMonths({ f, r, primary }: { f: TaxForm; r: EmployerRow; primary: boolean }) {
  const sum = f.payslips[r.key];
  const byMonth = new Map(sum?.rows.map((x) => [x.month, x]));
  const cols = r.pegged ? (['basic', 'allowance', 'extra', 'apit'] as const) : (['regular', 'extra', 'apit'] as const);
  const LABEL: Record<keyof PayRow, string> = {
    usd: 'USD',
    basic: 'Basic',
    allowance: 'Allowances',
    regular: 'Monthly pay',
    extra: 'Bonus, arrears',
    apit: 'APIT',
  };

  return (
    <div className={`pay-months ${r.pegged ? 'pegged' : ''}`} role="table" aria-label="Payslips by month">
      <div className="pay-row pay-head" role="row">
        <span role="columnheader">Month</span>
        {cols.map((c) => (
          <span key={c} role="columnheader" className="num">
            {c === 'extra' ? <WithHint text={LABEL[c]} topic="bonus" /> : LABEL[c]}
          </span>
        ))}
        <span role="columnheader" className="num">
          Gross
        </span>
      </div>
      {workedMonths(r).map((m) => {
        const row = { ...emptyPayRow(), ...r.months[m] };
        const res = byMonth.get(m);
        const placeholder: Partial<Record<keyof PayRow, string>> = res
          ? {
              basic: res.basic !== undefined ? money(res.basic) : '',
              allowance: res.allowance !== undefined ? money(res.allowance) : '',
              regular: money(res.regular),
              apit: primary ? money(res.expectedApit) : '',
            }
          : {};
        return (
          <div key={m} className="pay-row" role="row">
            <span role="cell" className="pay-month">
              <b>{monthLabel(m)}</b>
            </span>
            {cols.map((c) => {
              const err = f.errors[`${r.key}.p.${m}.${c}`];
              const flag = c === 'apit' && res?.apitDiffers ? `Expected ${money(res.expectedApit)}` : '';
              return (
                <label key={c} role="cell" className={`pay-cell${err ? ' has-error' : ''}`}>
                  <span className="pay-label">{LABEL[c]}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={row[c]}
                    placeholder={placeholder[c] ?? ''}
                    onChange={(e) => f.updatePayMonth(r.key, m, { [c]: e.target.value })}
                    aria-label={`${LABEL[c]}, ${monthLabel(m)}`}
                    aria-invalid={!!err}
                  />
                  {(err || flag) && <span className={err ? 'field-error' : 'pay-warn'}>{err || flag}</span>}
                </label>
              );
            })}
            <span role="cell" className="num pay-gross">
              <span className="pay-label">Gross</span>
              {res ? money(res.gross) : '–'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
