'use client';

import { AmountCell, Cell, SectionHead } from './Fields';
import { Hint, WithHint } from './Hint';
import type { Section } from '@/lib/profiles';
import { PlusIcon, XIcon } from './Icons';
import { MONTHS, fmt, rules, usdRates, type TaxForm } from './useTaxForm';
import { monthLabel, type Conversion } from '@/lib/fx';

/** Twelve month cells in US dollars, each converted at that month's CBSL average. */
function MonthlyUsd(props: {
  rowKey: string;
  values: Record<string, string>;
  errors: Record<string, string>;
  conversion: Conversion | undefined;
  onChange: (month: string, v: string) => void;
}) {
  const { rowKey, values, errors, conversion, onChange } = props;
  const lkrFor = (m: string) => conversion?.lines.find((l) => l.month === m)?.lkr;
  return (
    <div className="months">
      <div className="months-grid">
        {MONTHS.map((m) => {
          const rate = usdRates.monthly[m]!.average;
          const err = errors[`${rowKey}.m.${m}`];
          const lkr = lkrFor(m);
          return (
            <label key={m} className={`month${err ? ' has-error' : ''}`}>
              <span className="month-name">{monthLabel(m)}</span>
              <span className="amount">
                <span className="amount-prefix" aria-hidden="true">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={values[m] ?? ''}
                  onChange={(e) => onChange(m, e.target.value)}
                  aria-label={`US dollars received in ${monthLabel(m)}`}
                  aria-invalid={!!err}
                />
              </span>
              <span className="month-conv">
                {err ? (
                  <span className="field-error">{err}</span>
                ) : (
                  <>
                    × {rate.toFixed(2)}
                    {lkr !== undefined && <b>Rs {fmt(lkr)}</b>}
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <p className="months-total">
        <span>
          Total{' '}
          <b className="num">
            USD {(conversion?.totalForeign ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </b>{' '}
          = <b className="num">Rs {fmt(conversion?.totalLkr ?? 0)}</b>
        </span>
        <small>
          At each month&rsquo;s CBSL average rate <Hint topic="fxMonthly" />
        </small>
      </p>
    </div>
  );
}

const removeIf = (f: TaxForm, s: Section) => (f.isExtra(s) ? () => f.removeSection(s) : undefined);

/** Freelance and foreign income: one entry card per client or platform. */
export function FreelanceSection({ f }: { f: TaxForm }) {
  const capPct = Math.round(rules.foreignSourceIncome.maxRate * 100);
  const netOf = (key: string) => f.biz.find((b) => b.id === key);

  return (
    <section className="part" aria-labelledby="sec-freelance">
      <SectionHead
        id="sec-freelance"
        title="Freelance or foreign income"
        topic="freelance"
        meta="Schedule 2"
        onRemove={removeIf(f, 'freelance')}
      />

      {f.businessRows.map((r, i) => {
        const parsed = netOf(r.key);
        const net = parsed ? Math.max(0, parsed.gross - parsed.expenses) : 0;
        return (
          <div key={r.key} className="entry-card">
            <div className="entry-card-head">
              <strong>Income {i + 1}</strong>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove freelance income ${i + 1}`}
                onClick={() => f.removeBusiness(r.key)}
              >
                <XIcon />
              </button>
            </div>

            <Cell label="Client, platform or work">
              <input
                type="text"
                autoComplete="off"
                placeholder="For example Upwork, or Acme Ltd"
                value={r.name}
                onChange={(e) => f.updateBusiness(r.key, { name: e.target.value })}
                aria-label={`Freelance income ${i + 1} description`}
              />
            </Cell>

            <fieldset className="inline-q">
              <legend>
                <WithHint text="Where is the client?" topic="clientLocation" />
              </legend>
              <div className="seg" role="radiogroup" aria-label="Where is the client?">
                {(['foreign', 'local'] as const).map((o) => (
                  <label key={o} className={r.origin === o ? 'on' : ''}>
                    <input
                      type="radio"
                      name={`${r.key}-origin`}
                      checked={r.origin === o}
                      onChange={() => f.updateBusiness(r.key, { origin: o })}
                    />
                    {o === 'foreign' ? 'Abroad' : 'In Sri Lanka'}
                  </label>
                ))}
              </div>
            </fieldset>

            {r.origin === 'foreign' && (
              <fieldset className="inline-q">
                <legend>
                  <WithHint text="Received in foreign currency through a Sri Lankan bank?" topic="remitted" />
                </legend>
                <div className="seg" role="radiogroup" aria-label="Received through a Sri Lankan bank?">
                  {[true, false].map((v) => (
                    <label key={String(v)} className={r.remitted === v ? 'on' : ''}>
                      <input
                        type="radio"
                        name={`${r.key}-remitted`}
                        checked={r.remitted === v}
                        onChange={() => f.updateBusiness(r.key, { remitted: v })}
                      />
                      {v ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="inline-q">
              <legend>
                <WithHint text="Enter the income in" topic="fxMonthly" />
              </legend>
              <div className="seg" role="radiogroup" aria-label="Enter the income in">
                {(['USD', 'LKR'] as const).map((c) => (
                  <label key={c} className={r.currency === c ? 'on' : ''}>
                    <input
                      type="radio"
                      name={`${r.key}-ccy`}
                      checked={r.currency === c}
                      onChange={() => f.updateBusiness(r.key, { currency: c })}
                    />
                    {c === 'USD' ? 'US dollars, by month' : 'Rupees, yearly total'}
                  </label>
                ))}
              </div>
            </fieldset>

            {r.currency === 'USD' && (
              <MonthlyUsd
                rowKey={r.key}
                values={r.monthly}
                errors={f.errors}
                conversion={f.conversions[r.key]}
                onChange={(m, v) => f.updateBusiness(r.key, { monthly: { ...r.monthly, [m]: v } })}
              />
            )}

            <div className={r.currency === 'USD' ? 'pair-2' : 'triple'}>
              {r.currency === 'LKR' && (
                <AmountCell
                  label="Income for the year"
                  value={r.gross}
                  error={f.errors[`${r.key}.gross`]}
                  onChange={(v) => f.updateBusiness(r.key, { gross: v })}
                />
              )}
              <AmountCell
                label="Expenses"
                topic="expenses"
                value={r.expenses}
                error={f.errors[`${r.key}.expenses`]}
                onChange={(v) => f.updateBusiness(r.key, { expenses: v })}
              />
              <AmountCell
                label={r.origin === 'local' ? 'WHT deducted by client' : 'Tax paid abroad'}
                topic={r.origin === 'local' ? 'wht' : 'foreignTax'}
                value={r.tax}
                error={f.errors[`${r.key}.tax`]}
                onChange={(v) => f.updateBusiness(r.key, { tax: v })}
              />
            </div>

            {parsed && (
              <p className="entry-net">
                Net income <span className="num">{fmt(net)}</span>
                <span className={`rate-tag ${r.origin === 'foreign' && r.remitted ? 'cap' : ''}`}>
                  {r.origin === 'foreign' && r.remitted ? `Capped at ${capPct}%` : 'Normal rates'}
                </span>
              </p>
            )}
          </div>
        );
      })}

      <button type="button" className="btn-secondary" onClick={f.addBusiness}>
        <PlusIcon /> Add another client
      </button>
    </section>
  );
}

/** Quarterly instalments the person already paid. */
export function PaidSection({ f }: { f: TaxForm }) {
  return (
    <section className="part" aria-labelledby="sec-paid">
      <SectionHead id="sec-paid" title="Tax already paid" meta="Schedule 9" onRemove={removeIf(f, 'paid')} />
      <div className="single-field">
        <AmountCell
          label="Quarterly instalments paid for 2025/26"
          topic="instalments"
          value={f.instalments}
          error={f.errors.instalments}
          onChange={f.setInstalments}
        />
      </div>
    </section>
  );
}
