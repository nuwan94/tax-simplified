'use client';

import { AmountCell, Cell } from './Fields';
import { PlusIcon, XIcon } from './Icons';
import { fmt, rules, type TaxForm } from './useTaxForm';

/** Part D (freelance & foreign income) and Part E (tax already paid). */
export function FreelanceParts({ f }: { f: TaxForm }) {
  const capPct = Math.round(rules.foreignSourceIncome.maxRate * 100);
  const whtPct = Math.round(rules.withholding.serviceFeesResident.rate * 100);
  const netOf = (key: string) => f.biz.find((b) => b.id === key);

  return (
    <>
      <section className="part" aria-labelledby="part-d">
        <header className="part-head">
          <h2 id="part-d">
            <span className="part-code">Part D</span> Freelance &amp; foreign income
          </h2>
          <span className="part-meta">Schedule 2</span>
        </header>
        <p className="part-intro">
          Work you did for yourself: freelancing, consulting, lecturing, online platforms. Add one entry per client or
          platform. Foreign income received in foreign currency through a Sri Lankan bank is taxed at no more than{' '}
          {capPct}%.
        </p>

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
                <legend>Where is the client?</legend>
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
                  <legend>Received in foreign currency through a Sri Lankan bank?</legend>
                  <p className="q-help">
                    Yes if it was credited to your account here, for example to a USD account. Money kept in Payoneer,
                    Wise or a bank abroad counts as no.
                  </p>
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

              <div className="triple">
                <AmountCell
                  label="Income for the year"
                  hint="Rupee amount credited to you"
                  value={r.gross}
                  error={f.errors[`${r.key}.gross`]}
                  onChange={(v) => f.updateBusiness(r.key, { gross: v })}
                />
                <AmountCell
                  label="Expenses"
                  hint="Costs of doing this work"
                  value={r.expenses}
                  error={f.errors[`${r.key}.expenses`]}
                  onChange={(v) => f.updateBusiness(r.key, { expenses: v })}
                />
                <AmountCell
                  label={r.origin === 'local' ? 'WHT deducted by client' : 'Tax paid abroad'}
                  hint={r.origin === 'local' ? `${whtPct}% if over Rs 100,000 a month` : 'If any'}
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
          <PlusIcon /> Add freelance income
        </button>
      </section>

      <section className="part" aria-labelledby="part-e">
        <header className="part-head">
          <h2 id="part-e">
            <span className="part-code">Part E</span> Tax already paid
          </h2>
          <span className="part-meta">Schedule 9</span>
        </header>
        <div className="single-field">
          <AmountCell
            label="Quarterly instalments paid for 2025/26"
            hint="Leave blank if you didn't pay any"
            value={f.instalments}
            error={f.errors.instalments}
            onChange={f.setInstalments}
          />
        </div>
      </section>
    </>
  );
}
