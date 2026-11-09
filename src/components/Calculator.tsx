'use client';

import { useState } from 'react';

import type { CalculationResult, FilingObligation } from '@/index';
import { formatLKR, formatSigned } from '@/lib/money';
import { AmountCell, Cell, SectionHead } from './Fields';
import { FreelanceSection, PaidSection } from './FreelanceParts';
import { ProfilePicker, SomethingElse } from './Profiles';
import { SalarySection } from './SalarySection';
import type { Section } from '@/lib/profiles';
import { TaxLadder } from './TaxLadder';
import { Hint, WithHint } from './Hint';
import { AlertIcon, CalendarIcon, CheckIcon, InfoIcon, PlusIcon, PrinterIcon, XIcon } from './Icons';
import { buildSummary, summaryFileName } from '@/lib/summary';
import { YA } from './useTaxForm';
import {
  OUT_OF_SCOPE_TEXT,
  daysUntil,
  fmt,
  headlineLabel,
  rules,
  shortDate,
  sum,
  useTaxForm,
  type SavedForm,
} from './useTaxForm';

export function Calculator({
  initial,
  onSave,
  person = '',
}: { initial?: unknown; onSave?: (data: SavedForm) => void; person?: string } = {}) {
  const form = useTaxForm(initial, onSave);

  // The PDF library loads only when someone asks for the summary.
  const downloadPdf = async () => {
    if (!form.result) return;
    const doc = buildSummary({
      person,
      ya: YA,
      rules,
      result: form.result,
      obligation: form.allAnswered ? form.obligation : null,
      employments: form.emp,
      payslips: form.payslips,
      interests: form.int,
      businesses: form.biz,
      expenses: form.expenses,
      unbilledTax: form.unbilledTax,
      now: new Date(),
    });
    const { downloadSummaryPdf } = await import('@/lib/summaryPdf');
    await downloadSummaryPdf(doc, summaryFileName(person, YA));
  };
  const {
    answers,
    setAnswer,
    answeredCount,
    allAnswered,
    questions,
    interests,
    updateInterest: updInt,
    addInterest,
    removeInterest,
    int,
    errors,
    hasErrors,
    result,
    obligation,
    outOfScope,
    today,
    noInterest,
    setNoInterest,
    profile,
    sections,
  } = form;
  const removeIf = (s: Section) => (form.isExtra(s) ? () => form.removeSection(s) : undefined);

  const interest = (
    <section key="interest" className="part" aria-labelledby="sec-interest">
      <SectionHead
        id="sec-interest"
        title="Bank interest"
        topic="interest"
        meta="Schedules 3 & 7"
        onRemove={removeIf('interest')}
      />
      <label className="check">
        <input type="checkbox" checked={noInterest} onChange={(e) => setNoInterest(e.target.checked)} />
        <span>No bank interest</span>
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
                <WithHint text="AIT / WHT deducted" topic="interest" />
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
                  topic="interest"
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
            {interests.length > 1 && (
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
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={addInterest}>
            <PlusIcon /> Add bank
          </button>
        </>
      )}
    </section>
  );

  const block: Record<Section, React.ReactNode> = {
    salary: <SalarySection key="salary" f={form} onRemove={removeIf('salary')} />,
    interest,
    freelance: <FreelanceSection key="freelance" f={form} />,
    paid: <PaidSection key="paid" f={form} />,
  };

  return (
    <div className="calc">
      <div className="sheet">
        <ProfilePicker f={form} />

        {sections.map((s) => block[s])}

        {profile && (
          <section className="part" aria-labelledby="sec-checks">
            <SectionHead id="sec-checks" title="Checks" meta={`${answeredCount} of ${questions.length} answered`} />
            <div className="qlist">
              {questions.map((q) => (
                <fieldset key={q.id} className="q">
                  <div className="q-text">
                    <legend>
                      <WithHint text={q.text} topic={q.hint} />
                    </legend>
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
        )}

        <SomethingElse f={form} />
      </div>

      <aside className="calc-result">
        <div id="result" aria-live="polite">
          <ResultPanel
            onDownload={downloadPdf}
            result={outOfScope ? null : result}
            obligation={obligation}
            allAnswered={allAnswered}
            hasErrors={hasErrors}
            hasProfile={!!profile}
            apitEstimatedMonths={form.apitEstimatedMonths}
            unbilled={form.unbilled}
            unbilledTax={form.unbilledTax}
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
  hasProfile: boolean;
  apitEstimatedMonths: number;
  unbilled: number;
  unbilledTax: number;
  today: Date | null;
  onDownload: () => Promise<void>;
}) {
  const { result, obligation, allAnswered, hasErrors, hasProfile, apitEstimatedMonths, today, onDownload } = props;
  const { unbilled, unbilledTax } = props;
  const [pdfState, setPdfState] = useState<'idle' | 'busy' | 'failed'>('idle');

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
          {hasErrors && (
            <p className="muted">
              Amounts can have up to 2 decimals.
            </p>
          )}
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
        <span className="part-meta">Estimate</span>
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
          <dt>
            Return <Hint topic="returnType" />
          </dt>
          <dd>
            {!allAnswered || !obligation ? (
              <span className="muted">Answer the checks</span>
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
          <dt>
            Filing deadline <Hint topic="deadlines" />
          </dt>
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
          Bringing it in through a Sri Lankan bank would save <strong>{formatLKR(result.remittanceSaving)}</strong>.
        </Note>
      )}
      {unbilled > 0 && (
        <Note tone="warn" icon={<InfoIcon />}>
          {formatLKR(unbilled)} of expenses have no bill.
          {unbilledTax > 0 && (
            <>
              {' '}
              If IRD disallows them, tax goes up by <strong>{formatLKR(unbilledTax)}</strong>.
            </>
          )}
        </Note>
      )}
      {result.businessIncome > 0 && (
        <Note tone="warn" icon={<CalendarIcon />}>
          Instalments due {rules.payments.instalments.map((i) => shortDate(i.due).replace(/ \d{4}$/, '')).join(', ')}.{' '}
          <Hint topic="instalments" />
        </Note>
      )}
      {result.outcome === 'refund' && (
        <Note tone="ok" icon={<InfoIcon />}>
          Claim it by filing your return in RAMIS.
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
      <p className="fineprint">IRD guide 2025/26, Annexures 1 and 7.</p>

      <div className="statement-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={pdfState === 'busy'}
          onClick={async () => {
            setPdfState('busy');
            try {
              await onDownload();
              setPdfState('idle');
            } catch {
              setPdfState('failed');
            }
          }}
        >
          <PrinterIcon /> {pdfState === 'busy' ? 'Preparing PDF…' : 'Download PDF summary'}
        </button>
        {pdfState === 'failed' && <p className="field-error">Couldn&rsquo;t create the PDF. Try again.</p>}
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
