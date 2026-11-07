import type { Band } from '../rules/types.ts';

export interface BandLine {
  from: number;
  to: number;
  amount: number;
  rate: number;
  tax: number;
}

/**
 * Tax on the slice of income between `from` and `to` (cumulative positions on the band ladder),
 * optionally with every rate capped at `maxRate`. Each band's tax is rounded to the nearest rupee,
 * matching the IRD worked examples.
 */
export function taxOnRange(
  from: number,
  to: number,
  bands: Band[],
  maxRate = Infinity,
): { total: number; lines: BandLine[] } {
  const lines: BandLine[] = [];
  let lower = 0;
  for (const band of bands) {
    const upper = band.upTo ?? Infinity;
    const start = Math.max(from, lower);
    const end = Math.min(to, upper);
    if (end > start) {
      const rate = Math.min(band.rate, maxRate);
      const amount = end - start;
      lines.push({ from: start, to: end, amount, rate, tax: Math.round(amount * rate) });
    }
    if (to <= upper) break;
    lower = upper;
  }
  // Adjacent bands that end up at the same (capped) rate are shown as one line.
  const merged: BandLine[] = [];
  for (const l of lines) {
    const prev = merged[merged.length - 1];
    if (prev && prev.rate === l.rate && prev.to === l.from) {
      prev.to = l.to;
      prev.amount += l.amount;
      prev.tax = Math.round(prev.amount * prev.rate);
    } else {
      merged.push({ ...l });
    }
  }
  return { total: merged.reduce((s, l) => s + l.tax, 0), lines: merged };
}

/** Tax on `taxable` (whole rupees) under cumulative progressive bands. */
export function progressiveTax(taxable: number, bands: Band[]): { total: number; lines: BandLine[] } {
  return taxOnRange(0, taxable, bands);
}
