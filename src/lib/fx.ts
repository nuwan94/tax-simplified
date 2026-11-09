import usd202526 from '../../rules/fx/usd-2025-26.json' with { type: 'json' };
import aed202526 from '../../rules/fx/aed-2025-26.json' with { type: 'json' };
import aud202526 from '../../rules/fx/aud-2025-26.json' with { type: 'json' };
import cad202526 from '../../rules/fx/cad-2025-26.json' with { type: 'json' };
import chf202526 from '../../rules/fx/chf-2025-26.json' with { type: 'json' };
import cny202526 from '../../rules/fx/cny-2025-26.json' with { type: 'json' };
import dkk202526 from '../../rules/fx/dkk-2025-26.json' with { type: 'json' };
import eur202526 from '../../rules/fx/eur-2025-26.json' with { type: 'json' };
import gbp202526 from '../../rules/fx/gbp-2025-26.json' with { type: 'json' };
import hkd202526 from '../../rules/fx/hkd-2025-26.json' with { type: 'json' };
import inr202526 from '../../rules/fx/inr-2025-26.json' with { type: 'json' };
import jpy202526 from '../../rules/fx/jpy-2025-26.json' with { type: 'json' };
import myr202526 from '../../rules/fx/myr-2025-26.json' with { type: 'json' };
import nok202526 from '../../rules/fx/nok-2025-26.json' with { type: 'json' };
import nzd202526 from '../../rules/fx/nzd-2025-26.json' with { type: 'json' };
import qar202526 from '../../rules/fx/qar-2025-26.json' with { type: 'json' };
import sar202526 from '../../rules/fx/sar-2025-26.json' with { type: 'json' };
import sek202526 from '../../rules/fx/sek-2025-26.json' with { type: 'json' };
import sgd202526 from '../../rules/fx/sgd-2025-26.json' with { type: 'json' };

/**
 * Foreign-currency conversion with CBSL rates.
 * Inland Revenue Act s.27: amounts are translated at the Central Bank of Sri Lanka exchange rate
 * on the date they are taken into account. Monthly averages are the estimate used when exact
 * dates aren't entered; daily rates are kept for exact-date conversion.
 */

export interface FxRates {
  currency: string;
  yearOfAssessment: string;
  series: string;
  source: string;
  monthly: Record<string, { average: number; days: number }>;
  daily: Record<string, number>;
}

const registry: Record<string, FxRates> = Object.fromEntries(
  [
    usd202526,
    aed202526,
    aud202526,
    cad202526,
    chf202526,
    cny202526,
    dkk202526,
    eur202526,
    gbp202526,
    hkd202526,
    inr202526,
    jpy202526,
    myr202526,
    nok202526,
    nzd202526,
    qar202526,
    sar202526,
    sek202526,
    sgd202526,
  ].map((r) => [`${r.currency}:${r.yearOfAssessment}`, r as FxRates]),
);

/** Currencies with CBSL rates, most common for Sri Lankan freelancers first. */
export const CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'AED', name: 'UAE dirham' },
  { code: 'SAR', name: 'Saudi riyal' },
  { code: 'QAR', name: 'Qatari riyal' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'SEK', name: 'Swedish krona' },
  { code: 'NOK', name: 'Norwegian krone' },
  { code: 'DKK', name: 'Danish krone' },
  { code: 'HKD', name: 'Hong Kong dollar' },
  { code: 'CNY', name: 'Chinese yuan' },
  { code: 'MYR', name: 'Malaysian ringgit' },
];

/** Whether CBSL rates are available for a currency in a year of assessment. */
export const hasFxRates = (currency: string, ya: string) => `${currency}:${ya}` in registry;

export function getFxRates(currency: string, ya: string): FxRates {
  const r = registry[`${currency}:${ya}`];
  if (!r) throw new Error(`No ${currency} rates for YA ${ya}`);
  return r;
}

/** The twelve months of a year of assessment ("2025/2026" → 2025-04 … 2026-03). */
export function yaMonths(ya: string): string[] {
  const start = Number(ya.slice(0, 4));
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1;
    const y = i < 9 ? start : start + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-04" → "Apr 2025". */
export function monthLabel(month: string): string {
  return `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** CBSL rate for a date: that day's rate, or the latest business day before it (weekends, holidays). */
export function rateOn(date: string, rates: FxRates): { date: string; rate: number } {
  const d = new Date(`${date}T00:00:00Z`);
  for (let back = 0; back < 10; back++) {
    const key = d.toISOString().slice(0, 10);
    const rate = rates.daily[key];
    if (rate !== undefined) return { date: key, rate };
    d.setUTCDate(d.getUTCDate() - 1);
  }
  throw new Error(`No ${rates.currency} rate on or shortly before ${date}`);
}

export interface ConversionLine {
  month: string;
  amount: number;
  rate: number;
  lkr: number;
}

export interface Conversion {
  currency: string;
  lines: ConversionLine[];
  totalForeign: number;
  totalLkr: number;
}

/**
 * Converts month-by-month foreign amounts at each month's CBSL average rate.
 * Each month's rupee figure is rounded to the nearest rupee; months with no amount are skipped.
 */
export function convertMonthly(amounts: Record<string, number>, rates: FxRates): Conversion {
  const lines: ConversionLine[] = [];
  for (const month of Object.keys(amounts).sort()) {
    const amount = amounts[month] ?? 0;
    if (amount === 0) continue;
    const m = rates.monthly[month];
    if (!m) throw new Error(`No ${rates.currency} rate for ${month}`);
    lines.push({ month, amount, rate: m.average, lkr: Math.round(amount * m.average) });
  }
  return {
    currency: rates.currency,
    lines,
    totalForeign: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100,
    totalLkr: lines.reduce((s, l) => s + l.lkr, 0),
  };
}

export type ParsedForeign = { value: number } | { error: string } | { empty: true };

/** Parses a foreign amount: "1,250.50", "$1250", "USD 1250", "€90". Up to 2 decimal places. */
export function parseForeignAmount(raw: string): ParsedForeign {
  const s = raw.replace(/[\s,]/g, '').replace(/^([a-z]{3}|us\$|[a-z]?\$|[€£¥₹])(?=\d)/i, '');
  if (s === '') return { empty: true };
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return { error: 'Enter an amount like 1250.50' };
  const n = Number(s);
  if (!Number.isFinite(n) || n > 1e9) return { error: 'Amount is too large' };
  return { value: n };
}
