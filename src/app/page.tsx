import { TaxApp } from '@/components/TaxApp';
import { LockIcon } from '@/components/Icons';
import { getRules } from '@/index';
import { faqs } from '@/lib/faq';
import { SITE, SITE_URL } from '@/lib/site';

const FAQS = faqs(getRules('2025/2026'));

// Structured data for search and answer engines: the app itself, and the questions answered on the page.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: SITE.name,
      alternateName: SITE.title,
      url: `${SITE_URL}/`,
      description: SITE.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      inLanguage: 'en-LK',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'LKR' },
      areaServed: { '@type': 'Country', name: 'Sri Lanka' },
      author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url },
      image: `${SITE_URL}/opengraph-image.png`,
      featureList: [
        'Income tax for year of assessment 2025/26',
        'Salary and APIT from monthly payslips or the T-10 certificate',
        'Salaries pegged to US dollars, with pay changes during the year',
        'Freelance and foreign income converted at CBSL monthly average rates',
        'Bank interest and AIT credit',
        'PDF summary',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};
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
        </div>
      </header>

      <main id="main" className="wrap">
        <section className="page-head">
          <div>
            <h1>Income tax calculator</h1>
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
          <span>Saved in this browser only. Nothing is uploaded.</span>
        </p>

        <TaxApp />

        <section className="faq" aria-labelledby="faq-h">
          <h2 id="faq-h">Questions</h2>
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

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
