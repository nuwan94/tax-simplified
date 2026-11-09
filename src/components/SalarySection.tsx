'use client';

import { monthLabel } from '@/lib/fx';
import { peggedSplit } from '@/lib/payslips';
import { AmountCell, Cell, SectionHead } from './Fields';
import { Hint, WithHint } from './Hint';
import { PlusIcon, XIcon } from './Icons';
import { MONTHS, emptyPayRow, usdRates, type EmployerRow, type PayRow, type TaxForm } from './useTaxForm';

const money = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => {
  const n = Number(s.replace(/[\s,]/g, '').replace(/^rs\.?|^\$|^usd/i, ''));
  return Number.isFinite(n) ? n : 0;
};

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
        <strong>
          {r.name.trim() || `Employer ${i + 1}`}
          <span className="tag-line"> · {i === 0 ? 'main job' : 'second job'}</span>
        </strong>
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
          <WithHint text="What do you have from this employer?" topic="payslips" />
        </legend>
        <div className="seg" role="radiogroup" aria-label="What do you have from this employer?">
          {(['payslips', 't10'] as const).map((s) => (
            <label key={s} className={r.source === s ? 'on' : ''}>
              <input type="radio" name={`${r.key}-src`} checked={r.source === s} onChange={() => upd({ source: s })} />
              {s === 't10' ? 'T-10 certificate' : 'Monthly payslips'}
            </label>
          ))}
        </div>
      </fieldset>

      {r.source === 't10' ? (
        <div className="pair-2">
          <AmountCell
            label="Gross remuneration for the year"
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
              Part of my salary is pegged to US dollars <Hint topic="pegged" />
            </span>
          </label>

          <div className="pay-usual">
            {r.pegged && (
              <label className="mini-field">
                <span>Peg rate (Rs per $)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.peg}
                  onChange={(e) => upd({ peg: e.target.value })}
                  aria-invalid={!!f.errors[`${r.key}.peg`]}
                />
              </label>
            )}
            <label className="mini-field">
              <span>{r.pegged ? 'Usual salary in US dollars' : 'Usual monthly pay (Rs)'}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={r.pegged ? '$ 2,000' : 'Rs 250,000'}
                value={r.usual}
                onChange={(e) => upd({ usual: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => f.fillAllMonths(r.key)}
              disabled={!r.usual.trim()}
            >
              Fill empty months
            </button>
          </div>

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
                  {sum.rows.length} of 12 months entered. Add the rest for the full year, unless you started or left
                  this job during the year.
                </p>
              )}
              {sum.estimatedApitMonths > 0 && (
                <p className="pay-flag">
                  APIT for {sum.estimatedApitMonths} {sum.estimatedApitMonths === 1 ? 'month' : 'months'} is worked out
                  from the APIT tables. Type the payslip figure for an exact answer.
                </p>
              )}
              {sum.estimatedPayMonths > 0 && (
                <p className="pay-flag">
                  The allowance for {sum.estimatedPayMonths} {sum.estimatedPayMonths === 1 ? 'month' : 'months'} uses
                  the CBSL monthly average. Your employer&rsquo;s rate may differ a little.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Twelve payslip rows. Grey placeholders are worked out; typing replaces them. */
function PayMonths({ f, r, primary }: { f: TaxForm; r: EmployerRow; primary: boolean }) {
  const sum = f.payslips[r.key];
  const byMonth = new Map(sum?.rows.map((x) => [x.month, x]));
  const peg = num(r.peg);
  const cols = r.pegged
    ? (['usd', 'basic', 'allowance', 'extra', 'apit'] as const)
    : (['regular', 'extra', 'apit'] as const);
  const LABEL: Record<keyof PayRow, string> = {
    usd: 'USD salary',
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
      {MONTHS.map((m, idx) => {
        const row = { ...emptyPayRow(), ...r.months[m] };
        const res = byMonth.get(m);
        const usd = num(row.usd);
        const auto = r.pegged ? peggedSplit(usd, peg, usdRates.monthly[m]?.average ?? peg) : null;
        const placeholder: Partial<Record<keyof PayRow, string>> = {
          basic: auto && usd ? money(auto.basic) : '',
          allowance: auto && usd ? money(auto.allowance) : '',
          apit: res && primary ? money(res.expectedApit) : '',
        };
        const hasRegular = r.pegged ? !!(row.usd || row.basic) : !!row.regular;
        return (
          <div key={m} className="pay-row" role="row">
            <span role="cell" className="pay-month">
              <b>{monthLabel(m)}</b>
              {hasRegular && idx < MONTHS.length - 1 && (
                <button
                  type="button"
                  className="link-btn small"
                  onClick={() => f.copyPayDown(r.key, m)}
                  aria-label={`Copy ${monthLabel(m)} pay to the following empty months`}
                >
                  Copy down
                </button>
              )}
            </span>
            {cols.map((c) => {
              const err = f.errors[`${r.key}.p.${m}.${c}`];
              const flag =
                c === 'apit' && res?.apitDiffers
                  ? `Expected about ${money(res.expectedApit)}`
                  : c === 'apit' && res?.apitEstimated
                    ? 'Worked out'
                    : c === 'allowance' && res?.regularEstimated
                      ? 'CBSL estimate'
                      : '';
              return (
                <label key={c} role="cell" className={`pay-cell${err ? ' has-error' : ''}`}>
                  <span className="pay-label">{LABEL[c]}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={row[c]}
                    placeholder={placeholder[c] || (c === 'usd' ? '$' : '')}
                    onChange={(e) => f.updatePayMonth(r.key, m, { [c]: e.target.value })}
                    aria-label={`${LABEL[c]}, ${monthLabel(m)}`}
                    aria-invalid={!!err}
                  />
                  {(err || flag) && (
                    <span className={err ? 'field-error' : c === 'apit' && res?.apitDiffers ? 'pay-warn' : 'pay-note'}>
                      {err || flag}
                    </span>
                  )}
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
