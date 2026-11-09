'use client';

import { AmountCell, Cell, SectionHead } from './Fields';
import { Hint, WithHint } from './Hint';
import type { Section } from '@/lib/profiles';
import { PlusIcon, XIcon } from './Icons';
import { MONTHS, fmt, fxRates, rules, type BusinessRow, type TaxForm } from './useTaxForm';
import { CURRENCIES, monthLabel, type Conversion } from '@/lib/fx';

const currencyName = (code: string) => CURRENCIES.find((c) => c.code === code)?.name ?? code;
const showRate = (r: number) => r.toFixed(r < 10 ? 4 : 2);

/** Twelve month cells in a foreign currency, each converted at that month's CBSL average. */
function MonthlyForeign(props: {
  rowKey: string;
  currency: string;
  values: Record<string, string>;
  errors: Record<string, string>;
  conversion: Conversion | undefined;
  onChange: (month: string, v: string) => void;
}) {
  const { rowKey, currency, values, errors, conversion, onChange } = props;
  const rates = fxRates(currency);
  const lkrFor = (m: string) => conversion?.lines.find((l) => l.month === m)?.lkr;
  return (
    <div className="months">
      <div className="months-grid">
        {MONTHS.map((m) => {
          const rate = rates.monthly[m]!.average;
          const err = errors[`${rowKey}.m.${m}`];
          const lkr = lkrFor(m);
          return (
            <label key={m} className={`month${err ? ' has-error' : ''}`}>
              <span className="month-name">{monthLabel(m)}</span>
              <span className="amount code">
                <span className="amount-prefix" aria-hidden="true">
                  {currency}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={values[m] ?? ''}
                  onChange={(e) => onChange(m, e.target.value)}
                  aria-label={`${currencyName(currency)} received in ${monthLabel(m)}`}
                  aria-invalid={!!err}
                />
              </span>
              <span className="month-conv">
                {err ? (
                  <span className="field-error">{err}</span>
                ) : (
                  <>
                    × {showRate(rate)}
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
            {currency} {(conversion?.totalForeign ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </b>{' '}
          = <b className="num">Rs {fmt(conversion?.totalLkr ?? 0)}</b>
        </span>
      </p>
    </div>
  );
}

/** One line per cost, each with whether the bill is kept. */
function ExpenseList({ f, row, index }: { f: TaxForm; row: BusinessRow; index: number }) {
  const totals = f.expenses[row.key];
  const label = (n: number) => `expense ${n + 1} of freelance income ${index + 1}`;
  return (
    <div className="expenses">
      <h4 className="expenses-head">
        <WithHint text="Expenses" topic="expenses" />
      </h4>
      {row.expenseItems.length > 0 && (
        <ul className="expense-rows">
          {row.expenseItems.map((x, n) => {
            const err = f.errors[`${row.key}.x.${x.key}`];
            return (
              <li key={x.key} className={`expense-row${err ? ' has-error' : ''}`}>
                <input
                  type="text"
                  className="expense-what"
                  autoComplete="off"
                  placeholder="Software, fees, internet"
                  value={x.what}
                  onChange={(e) => f.updateExpense(row.key, x.key, { what: e.target.value })}
                  aria-label={`What was ${label(n)}`}
                />
                <span className="amount">
                  <span className="amount-prefix" aria-hidden="true">
                    Rs
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={x.amount}
                    onChange={(e) => f.updateExpense(row.key, x.key, { amount: e.target.value })}
                    aria-label={`Amount of ${label(n)}`}
                    aria-invalid={!!err}
                  />
                </span>
                <label className={`bill-check${x.bill ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={x.bill}
                    onChange={(e) => f.updateExpense(row.key, x.key, { bill: e.target.checked })}
                  />
                  Have bill
                </label>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${label(n)}`}
                  onClick={() => f.removeExpense(row.key, x.key)}
                >
                  <XIcon />
                </button>
                {err && <span className="field-error">{err}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="expenses-foot">
        <button type="button" className="btn-secondary small" onClick={() => f.addExpense(row.key)}>
          <PlusIcon /> Add expense
        </button>
        {totals && totals.total > 0 && (
          <span className="expenses-total">
            Total <b className="num">Rs {fmt(totals.total)}</b>
            {totals.unbilled > 0 && (
              <span className="unbilled">
                {totals.unbilled === totals.total ? 'No bills' : `Rs ${fmt(totals.unbilled)} without a bill`}
              </span>
            )}
          </span>
        )}
      </div>
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

            <Cell label="Client">
              <input
                type="text"
                autoComplete="off"
                placeholder="Upwork"
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

            <div className="cell">
              <span className="cell-label">
                <span aria-hidden="true">Paid in</span>
                <Hint topic="fxMonthly" />
              </span>
              <select
                className="select"
                value={r.currency}
                onChange={(e) => f.updateBusiness(r.key, { currency: e.target.value })}
                aria-label={`Currency for freelance income ${i + 1}`}
              >
                <option value="LKR">Sri Lankan rupees (yearly total)</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code}), by month
                  </option>
                ))}
              </select>
            </div>

            {r.currency !== 'LKR' && (
              <MonthlyForeign
                rowKey={r.key}
                currency={r.currency}
                values={r.monthly}
                errors={f.errors}
                conversion={f.conversions[r.key]}
                onChange={(m, v) => f.updateBusiness(r.key, { monthly: { ...r.monthly, [m]: v } })}
              />
            )}

            <div className="pair-2">
              {r.currency === 'LKR' && (
                <AmountCell
                  label="Income for the year"
                  value={r.gross}
                  error={f.errors[`${r.key}.gross`]}
                  onChange={(v) => f.updateBusiness(r.key, { gross: v })}
                />
              )}
              <AmountCell
                label={r.origin === 'local' ? 'WHT deducted by client' : 'Tax paid abroad'}
                topic={r.origin === 'local' ? 'wht' : 'foreignTax'}
                value={r.tax}
                error={f.errors[`${r.key}.tax`]}
                onChange={(v) => f.updateBusiness(r.key, { tax: v })}
              />
            </div>

            <ExpenseList f={f} row={r} index={i} />

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
          label="Instalments paid"
          topic="instalments"
          value={f.instalments}
          error={f.errors.instalments}
          onChange={f.setInstalments}
        />
      </div>
    </section>
  );
}
