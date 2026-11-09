// Downloads CBSL daily indicative exchange rates for the currencies freelancers are commonly paid in
// and writes one rates file per currency to rules/fx. US dollars use the separate spot rate file.
// Run once per year of assessment:  node scripts/fx-rates.mjs

import { writeFile } from 'node:fs/promises';

const YA = '2025/2026';
const START = '2025-04-01';
const END = '2026-03-31';
const SOURCE = 'https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates/daily-indicative-exchange-rates';
const ENDPOINT = 'https://www.cbsl.gov.lk/cbsl_custom/exrates/exrates_results.php';

export const CURRENCIES = {
  EUR: 'Euro',
  GBP: 'Sterling Pound',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  NZD: 'New Zealand Dollar',
  SGD: 'Singapore Dollar',
  AED: 'UAE  Dirham',
  SAR: 'Saudi Arabian Riyal',
  QAR: 'Qatar Riyal',
  JPY: 'Japanese Yen',
  INR: 'Indian Rupee',
  CHF: 'Swiss Franc',
  SEK: 'Swedish Kroner',
  NOK: 'Norwegian Kroner',
  DKK: 'Danish Kroner',
  HKD: 'Hong Kong Dollar',
  CNY: 'Chinese Yuan (Renminbi)',
  MYR: 'Malaysia  Ringgit',
};

async function fetchDaily(code, name) {
  const body = new URLSearchParams({
    lookupPage: 'lookup_daily_exchange_rates.php',
    startRange: '2006-11-11',
    rangeType: 'dates',
    txtStart: START,
    txtEnd: END,
    'chk_cur[]': `${code}~${name}`,
    submit_button: 'Submit',
  });
  const res = await fetch(ENDPOINT, { method: 'POST', body });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status}`);
  const text = (await res.text()).replace(/<[^>]*>/g, ' ');
  const daily = {};
  for (const [, date, rate] of text.matchAll(/(\d{4}-\d{2}-\d{2})\s+([\d.]+)\s+[\d.]+/g)) {
    if (date >= START && date <= END) daily[date] = Number(rate);
  }
  return Object.fromEntries(Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)));
}

const round4 = (n) => Math.round(n * 10_000) / 10_000;
const today = new Date().toISOString().slice(0, 10);

for (const [code, name] of Object.entries(CURRENCIES)) {
  const daily = await fetchDaily(code, name);
  const monthly = {};
  for (const [date, rate] of Object.entries(daily)) {
    const m = date.slice(0, 7);
    (monthly[m] ??= []).push(rate);
  }
  const months = Object.keys(monthly);
  if (months.length !== 12) throw new Error(`${code}: only ${months.length} months of rates`);
  const file = {
    currency: code,
    yearOfAssessment: YA,
    series: `CBSL daily indicative exchange rate (LKR per 1 ${code})`,
    source: SOURCE,
    retrievedOn: today,
    legalBasis:
      'Inland Revenue Act No. 24 of 2017, s.27: translate at the Central Bank of Sri Lanka exchange rate on the date the amount is taken into account.',
    note: 'Monthly averages are the mean of the business-day rates in that month: an estimate when the exact dates of receipt are not entered.',
    monthly: Object.fromEntries(
      Object.entries(monthly).map(([m, rs]) => [
        m,
        { average: round4(rs.reduce((s, r) => s + r, 0) / rs.length), days: rs.length },
      ]),
    ),
    daily,
  };
  await writeFile(
    new URL(`../rules/fx/${code.toLowerCase()}-${YA.slice(0, 4)}-${YA.slice(7)}.json`, import.meta.url),
    JSON.stringify(file, null, 2) + '\n',
  );
  console.log(`${code}: ${Object.keys(daily).length} days`);
}
