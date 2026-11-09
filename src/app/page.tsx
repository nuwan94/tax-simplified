import { TaxApp } from '@/components/TaxApp';
import { LockIcon } from '@/components/Icons';
export default function Home() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to calculator
      </a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <span className="wordmark">
            Tax<span>Simplified</span>
          </span>
          <span className="topbar-meta">Personal income tax · Sri Lanka</span>
        </div>
      </header>

      <div className="subbar">
        <div className="wrap subbar-inner">
          <span>Income tax estimate</span>
          <span className="sep">/</span>
          <strong>Year of assessment 2025/26</strong>
          <span className="chip">Beta</span>
        </div>
      </div>

      <main id="main" className="wrap">
        <section className="page-head">
          <div>
            <h1>Income tax calculator</h1>
            <p className="lede">
              For Sri Lankan residents with a salary, freelance or foreign income, or bank interest. Pick what describes
              you, enter your figures, and see whether you need to file and what you owe or can claim back.
            </p>
          </div>
          <dl className="facts">
            <div>
              <dt>Period</dt>
              <dd>1 Apr 2025 – 31 Mar 2026</dd>
            </div>
            <div>
              <dt>Return due</dt>
              <dd>30 Nov 2026</dd>
            </div>
            <div>
              <dt>Rules</dt>
              <dd>IRD guide 2025/26</dd>
            </div>
          </dl>
        </section>

        <p className="notice-local">
          <LockIcon />
          <span>
            Your figures are saved only in this browser, on this device. Nothing is sent anywhere, and you will never be
            asked for a RAMIS or bank password. On a shared computer, delete a person&rsquo;s figures when you&rsquo;re
            done.
          </span>
        </p>

        <TaxApp />
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            Estimate based on the figures you enter and the Inland Revenue Department&rsquo;s published rules for YA
            2025/26. Not tax advice. You file and pay through RAMIS yourself. Not affiliated with the Inland Revenue
            Department.
          </p>
          <p>
            Sources:{' '}
            <a href="https://www.ird.gov.lk/en/Downloads/IT_Individuals_Doc/Asmt_IIT_004_2025_2026_E.pdf">
              IRD Guide to the Return of Income 2025/26
            </a>{' '}
            ·{' '}
            <a href="https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf">
              IRD Notice SEC/PN/IT/2026/02
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
