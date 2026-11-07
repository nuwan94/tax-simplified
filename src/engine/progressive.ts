import type { Band } from '../rules/types.ts';

export interface BandLine {
  from: number;
  to: number;
  amount: number;
  rate: number;
  tax: number;
}

/**
 * Tax on `taxable` (whole rupees) under cumulative progressive bands.
 * Each band's tax is rounded to the nearest rupee, matching the IRD worked examples.
 */
export function progressiveTax(taxable: number, bands: Band[]): { total: number; lines: BandLine[] } {
  const lines: BandLine[] = [];
  let lower = 0;
  for (const band of bands) {
    if (taxable <= lower) break;
    const upper = band.upTo === null ? taxable : Math.min(taxable, band.upTo);
    const amount = upper - lower;
    lines.push({ from: lower, to: upper, amount, rate: band.rate, tax: Math.round(amount * band.rate) });
    if (band.upTo === null) break;
    lower = band.upTo;
  }
  return { total: lines.reduce((s, l) => s + l.tax, 0), lines };
}
