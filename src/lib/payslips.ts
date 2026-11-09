// Month-by-month salary from payslips: pegged USD salaries, bonuses and APIT estimates.
//
// APIT for regular monthly pay (primary employment) is the annual tax on twelve months of that
// pay, divided by twelve: relief and band widths are the annual figures over 12. Checked to the
// cent against real payslips. A bonus or other one-off payment is taxed at the extra annual tax
// it adds on top of twelve months of regular pay.

import type { Band } from '../rules/types.ts';

export interface PayRules {
  relief: number;
  bands: Band[];
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Annual tax on `income` before relief, without per-band rounding. */
export function annualTax(income: number, r: PayRules): number {
  let taxable = Math.max(0, income - r.relief);
  let lower = 0;
  let tax = 0;
  for (const b of r.bands) {
    const upper = b.upTo ?? Infinity;
    const slice = Math.min(taxable, upper - lower);
    if (slice <= 0) break;
    tax += slice * b.rate;
    taxable -= slice;
    lower = upper;
  }
  return tax;
}

/** APIT on one month's regular pay (primary employment). */
export function apitMonthly(regular: number, r: PayRules): number {
  return cents(annualTax(regular * 12, r) / 12);
}

/** APIT on a one-off payment (bonus, arrears) paid with `regular` monthly pay. */
export function apitLumpSum(regular: number, lump: number, r: PayRules): number {
  if (lump <= 0) return 0;
  return cents(annualTax(regular * 12 + lump, r) - annualTax(regular * 12, r));
}

/** Pegged salary: the basic is the USD amount at the peg; the allowance tops it up to the market rate. */
export function peggedSplit(usd: number, peg: number, rate: number): { basic: number; allowance: number } {
  return { basic: cents(usd * peg), allowance: cents(usd * Math.max(0, rate - peg)) };
}

export interface PayMonth {
  month: string;
  /** Regular pay for the month (basic plus allowances). */
  regular: number;
  /** Bonus, arrears and other one-off payments. */
  extra: number;
  /** APIT as shown on the payslip, or undefined when not entered. */
  apit?: number;
  /** True when part of `regular` is an estimate (for example a pegged allowance not typed in). */
  regularEstimated?: boolean;
}

export interface PayMonthResult extends PayMonth {
  gross: number;
  expectedApit: number;
  /** APIT used for the year: the payslip figure, or the estimate when it was left blank. */
  apitUsed: number;
  apitEstimated: boolean;
  /** Payslip APIT differs from the table by more than Rs 1. */
  apitDiffers: boolean;
}

export function summarizeMonths(months: PayMonth[], r: PayRules, estimateApit = true) {
  const rows: PayMonthResult[] = months.map((m) => {
    const expectedApit = cents(apitMonthly(m.regular, r) + apitLumpSum(m.regular, m.extra, r));
    const apitEstimated = m.apit === undefined && estimateApit;
    const apitUsed = m.apit ?? (estimateApit ? expectedApit : 0);
    return {
      ...m,
      gross: cents(m.regular + m.extra),
      expectedApit,
      apitUsed,
      apitEstimated,
      apitDiffers: m.apit !== undefined && Math.abs(m.apit - expectedApit) > 1,
    };
  });
  const sum = (f: (x: PayMonthResult) => number) => cents(rows.reduce((s, x) => s + f(x), 0));
  return {
    rows,
    gross: sum((x) => x.gross),
    apit: sum((x) => x.apitUsed),
    expectedApit: sum((x) => x.expectedApit),
    estimatedApitMonths: rows.filter((x) => x.apitEstimated).length,
    estimatedPayMonths: rows.filter((x) => x.regularEstimated).length,
  };
}
