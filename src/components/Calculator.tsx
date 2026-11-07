'use client';

import type { CalculationResult, FilingObligation } from '@/index';
import { formatLKR, formatSigned } from '@/lib/money';
import { Readiness } from './Readiness';
import { AmountCell, Cell } from './Fields';
import { FreelanceParts } from './FreelanceParts';
import { TaxLadder } from './TaxLadder';
import { AlertIcon, CalendarIcon, CheckIcon, InfoIcon, PlusIcon, PrinterIcon, XIcon } from './Icons';
import {
  OUT_OF_SCOPE_TEXT,
  QUESTIONS,
  daysUntil,
  fmt,
  headlineLabel,
  rules,
  shortDate,
  sum,
  useTaxForm,
} from './useTaxForm';

export function Calculator() {
  const form = useTaxForm();
  const {
    answers,
    setAnswer,
    answeredCount,
    allAnswered,
    employers,
    updateEmployer: updEmp,
    addEmployer,
    removeEmployer,
    interests,
    updateInterest: updInt,
    addInterest,
    removeInterest,
    emp,
    int,
    errors,
    hasErrors,
    result,
    obligation,
    outOfScope,
    today,
    noInterest,
    setNoInterest,
    readiness,
  } = form;

  return (
    <div className="calc">
      <div className="sheet">
        {/* Part A */}
        <section className="part" aria-labelledby="part-a">
          <header className="part-head">
            <h2 id="part-a">
              <span className="part-code">Part A</span> Your situation
            </h2>
            <span className="part-meta">
              {answeredCount} of {QUESTIONS.length} answered
            </span>
          </header>
          <div className="qlist">
            {QUESTIONS.map((q, n) => (
              <fieldset key={q.id} className="q">
                <span className="q-no">A{n + 1}</span>
                <div className="q-text">
                  <legend>{q.text}</legend>
                  {q.help && <p className="q-help">{q.help}</p>}
                </div>
                <div className="seg" role="radiogroup" aria-label={q.text}>
                  {[true, false].map((v) => (
                    <label key={String(v)} className={answers[q.id] === v ? 'on' : ''}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === v}
                        onChange={() => setAnswer(q.id, v)}
                      />
                      {v ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        {/* Part B */}
        <section className="part" aria-labelledby="part-b">
          <header className="part-head">
            <h2 id="part-b">
              <span className="part-code">Part B</span> Employment income
            </h2>
            <span className="part-meta">Schedule 1</span>
          </header>
          <p className="part-intro">From each employer&rsquo;s annual APIT certificate. Gross amounts, before tax.</p>
          <div className="ledger" role="table" aria-label="Employment income">
            <div className="ledger-row ledger-header" role="row">
              <span role="columnheader">Employer</span>
              <span role="columnheader" className="num">
                Gross remuneration
              </span>
              <span role="columnheader" className="num">
                APIT deducted
              </span>
              <span role="columnheader" aria-label="Actions" />
            </div>
            {employers.map((r, i) => (
              <div key={r.key} className="ledger-row" role="row">
                <Cell label="Employer">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={i === 0 ? 'Main employer' : 'Second employer'}
                    value={r.name}
                    onChange={(e) => updEmp(r.key, { name: e.target.value })}
                    aria-label={`Employer ${i + 1} name`}
                  />
                  <span className="tag-line">{i === 0 ? 'Primary employment' : 'Secondary employment'}</span>
                </Cell>
                <AmountCell
                  label="Gross remuneration"
                  value={r.gross}
                  error={errors[`${r.key}.gross`]}
                  onChange={(v) => updEmp(r.key, { gross: v })}
                />
                <AmountCell
                  label="APIT deducted"
                  value={r.apit}
                  error={errors[`${r.key}.apit`]}
                  onChange={(v) => updEmp(r.key, { apit: v })}
                />
                <span className="ledger-actions" role="cell">
                  {i > 0 && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove employer ${i + 1}`}
                      onClick={() => removeEmployer(r.key)}
                    >
                      <XIcon />
                    </button>
                  )}
                </span>
              </div>
            ))}
            <div className="ledger-row ledger-total" role="row">
              <span role="cell">Total</span>
              <span role="cell" className="num">
                {fmt(sum(emp.map((e) => e.gross)))}
              </span>
              <span role="cell" className="num">
                {fmt(sum(emp.map((e) => e.apit)))}
              </span>
              <span role="cell" />
            </div>
          </div>
          <button type="button" className="btn-secondary" onClick={addEmployer}>
            <PlusIcon /> Add employer
          </button>
        </section>

        {/* Part C */}
        <section className="part" aria-labelledby="part-c">
          <header className="part-head">
            <h2 id="part-c">
              <span className="part-code">Part C</span> Interest income
            </h2>
            <span className="part-meta">Schedules 3 &amp; 7</span>
          </header>
          <p className="part-intro">From each bank&rsquo;s interest (AIT/WHT) certificate, one line per bank.</p>
          <label className="check">
            <input type="checkbox" checked={noInterest} onChange={(e) => setNoInterest(e.target.checked)} />
            <span>I had no bank interest this year</span>
          </label>
          {!noInterest && (
            <>
              <div className="ledger" role="table" aria-label="Interest income">
                <div className="ledger-row ledger-header" role="row">
                  <span role="columnheader">Bank or finance company</span>
                  <span role="columnheader" className="num">
                    Gross interest
                  </span>
                  <span role="columnheader" className="num">
                    AIT / WHT deducted
                  </span>
                  <span role="columnheader" aria-label="Actions" />
                </div>
                {interests.map((r, i) => (
                  <div key={r.key} className="ledger-row" role="row">
                    <Cell label="Bank or finance company">
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder={`Bank ${i + 1}`}
                        value={r.name}
                        onChange={(e) => updInt(r.key, { name: e.target.value })}
                        aria-label={`Bank ${i + 1} name`}
                      />
                    </Cell>
                    <AmountCell
                      label="Gross interest"
                      value={r.gross}
                      error={errors[`${r.key}.gross`]}
                      onChange={(v) => updInt(r.key, { gross: v })}
                    />
                    <AmountCell
                      label="AIT / WHT deducted"
                      hint="Usually 10%"
                      value={r.tax}
                      error={errors[`${r.key}.tax`]}
                      onChange={(v) => updInt(r.key, { tax: v })}
                    />
                    <span className="ledger-actions" role="cell">
                      {interests.length > 1 && (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Remove bank ${i + 1}`}
                          onClick={() => removeInterest(r.key)}
                        >
                          <XIcon />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                <div className="ledger-row ledger-total" role="row">
                  <span role="cell">Total</span>
                  <span role="cell" className="num">
                    {fmt(sum(int.map((i) => i.gross)))}
                  </span>
                  <span role="cell" className="num">
                    {fmt(sum(int.map((i) => i.ait)))}
                  </span>
                  <span role="cell" />
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={addInterest}>
                <PlusIcon /> Add bank
              </button>
            </>
          )}
        </section>

        <FreelanceParts f={form} />
      </div>

      <aside className="calc-result">
        <Readiness percent={readiness.percent} items={readiness.items} />
        <div id="result" aria-live="polite">
          <ResultPanel
            result={outOfScope ? null : result}
            obligation={obligation}
            allAnswered={allAnswered}
            hasErrors={hasErrors}
            today={today}
          />
        </div>
      </aside>

      {result && !outOfScope && !hasErrors && (
        <a href="#result" className={`mobile-bar ${result.outcome}`}>
          <span className="mobile-bar-label">{headlineLabel(result)}</span>
          <span className="mobile-bar-amount">{formatLKR(result.balance)}</span>
        </a>
      )}
    </div>
  );
}

// ---------- result ----------

const TOTAL_KEYS = new Set(['assessable', 'taxable', 'tax']);

function ResultPanel(props: {
  result: CalculationResult | null;
  obligation: FilingObligation | null;
  allAnswered: boolean;
  hasErrors: boolean;
  today: Date | null;
}) {
  const { result, obligation, allAnswered, hasErrors, today } = props;

  if (obligation?.status === 'out_of_scope') {
    return (
      <div className="statement">
        <header className="statement-head">
          <h2>Tax computation</h2>
          <span className="status-pill neutral">Not covered</span>
        </header>
        <div className="statement-body">
          <p className="empty-title">This calculator can&rsquo;t work out your tax yet.</p>
          <ul className="plain-list">
            {obligation.reasons.map((r) => (
              <li key={r}>{OUT_OF_SCOPE_TEXT[r]}</li>
            ))}
          </ul>
          <p className="muted">
            You&rsquo;ll need the Standard Return in RAMIS. A registered tax practitioner or the IRD can help.
          </p>
        </div>
      </div>
    );
  }

  if (!result || hasErrors) {
    return (
      <div className="statement">
        <header className="statement-head">
          <h2>Tax computation</h2>
          <span className="part-meta">YA 2025/26</span>
        </header>
        <div className="statement-body">
          <p className="empty-title">{hasErrors ? 'Check the highlighted amounts' : 'No figures yet'}</p>
          <p className="muted">
            {hasErrors
              ? 'Rupee amounts must be whole numbers, for example 1,250,000. Dollar amounts can have cents.'
              : 'Enter your salary or bank interest. The computation updates as you type.'}
          </p>
        </div>
      </div>
    );
  }

  const filingDays = today ? daysUntil(rules.filing.deadline, today) : null;
  const finalPassed = today ? daysUntil(rules.payments.final.due, today) < 0 : false;
  const mustFile = obligation?.status === 'must_file';

  return (
    <div className="statement">
      <header className="statement-head">
        <h2>Tax computation</h2>
        <span className="part-meta">YA 2025/26 · Estimate</span>
      </header>

      <div className={`total-box ${result.outcome}`}>
        <span className="total-label">{headlineLabel(result)}</span>
        <span className="total-amount">{formatLKR(result.balance)}</span>
        <span className="total-sub">
          Tax {fmt(result.tax)} less deducted {fmt(result.credits.total)}
        </span>
      </div>

      <dl className="kv">
        <div>
          <dt>Return</dt>
          <dd>
            {!allAnswered || !obligation ? (
              <span className="muted">Complete Part A</span>
            ) : mustFile ? (
              <span className="status-pill warn">
                Required · {result.returnType === 'standard' ? 'Standard' : 'Simplified'} Return
              </span>
            ) : (
              <span className="status-pill ok">
                <CheckIcon /> Not required
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Filing deadline</dt>
          <dd>
            {shortDate(rules.filing.deadline)}
            {filingDays !== null && mustFile && (
              <span className={`days ${filingDays < 0 ? 'bad' : filingDays <= 30 ? 'warn' : ''}`}>
                {filingDays > 0 ? `${filingDays} days left` : filingDays === 0 ? 'Today' : 'Passed'}
              </span>
            )}
          </dd>
        </div>
        {result.outcome === 'payable' && (
          <div>
            <dt>Payment</dt>
            <dd>
              Tax type 05 · code {rules.payments.final.paymentCode}
              {finalPassed && <span className="days bad">Overdue</span>}
            </dd>
          </div>
        )}
      </dl>

      {obligation && (
        <ul className="reason-list">
          {obligation.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {result.outcome === 'payable' && finalPassed && (
        <Note tone="bad" icon={<AlertIcon />}>
          The final payment date ({shortDate(rules.payments.final.due)}) has passed. Unpaid tax can attract a 20%
          penalty plus 1.5% interest a month.
        </Note>
      )}
      {result.remittanceSaving !== undefined && result.remittanceSaving > 0 && (
        <Note tone="warn" icon={<InfoIcon />}>
          Foreign income brought in through a Sri Lankan bank in foreign currency is capped at{' '}
          {Math.round(rules.foreignSourceIncome.maxRate * 100)}%. Doing that would have cut this bill by{' '}
          <strong>{formatLKR(result.remittanceSaving)}</strong>.
        </Note>
      )}
      {result.businessIncome > 0 && (
        <Note tone="warn" icon={<CalendarIcon />}>
          Freelance income isn&rsquo;t taxed at source, so IRD expects quarterly instalments (
          {rules.payments.instalments.map((i) => shortDate(i.due).replace(/ \d{4}$/, '')).join(', ')}). A missed
          instalment adds a 10% penalty.
        </Note>
      )}
      {result.outcome === 'refund' && (
        <Note tone="ok" icon={<InfoIcon />}>
          File your return in RAMIS and claim the tax already deducted to get this back.
        </Note>
      )}
      {filingDays !== null && filingDays < 0 && mustFile && (
        <Note tone="bad" icon={<CalendarIcon />}>
          The filing deadline has passed. File as soon as possible: a late-filing penalty applies.
        </Note>
      )}
      {result.warnings.map((w, i) => (
        <Note key={i} tone="warn" icon={<AlertIcon />}>
          {w.message}
        </Note>
      ))}

      <TaxLadder result={result} rules={rules} />

      <table className="computation">
        <caption>How it was worked out</caption>
        <thead>
          <tr>
            <th scope="col" className="ln">
              #
            </th>
            <th scope="col">Item</th>
            <th scope="col" className="num">
              Rs
            </th>
          </tr>
        </thead>
        <tbody>
          {result.trace.map((t, n) => {
            const isBalance = t.key === 'balance';
            return (
              <tr key={t.key} className={isBalance ? 'grand' : TOTAL_KEYS.has(t.key) ? 'subtotal' : ''}>
                <td className="ln">{n + 1}</td>
                <th scope="row">
                  {t.label}
                  {t.formula && <span className="formula">{t.formula}</span>}
                </th>
                <td className="num">{formatSigned(isBalance ? Math.abs(t.amount) : t.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fineprint">
        Personal relief Rs 1,800,000; rates 6–36% (IRD guide, Annexures 1 and 7). Tax deducted by banks is a credit for
        residents, not a final tax.
      </p>

      <div className="statement-actions">
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <PrinterIcon /> Print or save as PDF
        </button>
      </div>
    </div>
  );
}

function Note({
  tone,
  icon,
  children,
}: {
  tone: 'ok' | 'warn' | 'bad';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className={`note ${tone}`}>
      {icon}
      <span>{children}</span>
    </p>
  );
}
