import type { CalculationResult } from './types.ts';

/**
 * Filing-obligation rules from IRD notice SEC/PN/IT/2026/02 §12 (effective YA 2025/26):
 * no return is needed when the only income is employment income fully subject to APIT
 * (plus interest ≤ Rs 5,000), no instalment/final payment is due, and the CGIR has not
 * opened a file for the person.
 */
export const NO_RETURN_INTEREST_LIMIT = 5_000;

export interface EligibilityAnswers {
  resident: boolean;
  /** Rent, dividends, foreign employment, sale of property/shares, terminal benefits… (freelance is in scope) */
  hasOtherIncome: boolean;
  /** Qualifying payments, solar panels, donations: anything beyond personal relief. */
  hasOtherReliefs: boolean;
  employerCount: number;
  allEmployersDeductedApit: boolean;
  /** Rough annual interest, whole rupees. */
  approxInterest: number;
  /** IRD has opened an income tax file for the person (e.g. they filed before). */
  hasIrdFile: boolean;
  /** Freelance / business income entries (local or foreign). */
  businessCount?: number;
}

export type OutOfScopeReason = 'non_resident' | 'other_income' | 'other_reliefs';

export type Eligibility =
  | { status: 'out_of_scope'; reasons: OutOfScopeReason[] }
  | { status: 'must_file'; reasons: string[] }
  | { status: 'likely_no_return'; reasons: string[] };

/** Pre-calculation check. "likely_no_return" must be confirmed with `confirmFilingObligation`. */
export function assessEligibility(a: EligibilityAnswers): Eligibility {
  const out: OutOfScopeReason[] = [];
  if (!a.resident) out.push('non_resident');
  if (a.hasOtherIncome) out.push('other_income');
  if (a.hasOtherReliefs) out.push('other_reliefs');
  if (out.length) return { status: 'out_of_scope', reasons: out };

  const reasons: string[] = [];
  if (a.hasIrdFile) reasons.push('IRD has opened a tax file for you, so you must file until it is closed.');
  const business = (a.businessCount ?? 0) > 0;
  if (business) reasons.push('You have freelance or business income, which is not taxed through APIT.');
  if (a.employerCount === 0 && !business)
    reasons.push('You have interest income without employment income under APIT.');
  if (a.employerCount > 0 && !a.allEmployersDeductedApit)
    reasons.push('Not all of your employment income had APIT deducted.');
  if (a.approxInterest > NO_RETURN_INTEREST_LIMIT) {
    reasons.push(`Your interest is more than Rs ${NO_RETURN_INTEREST_LIMIT.toLocaleString('en-LK')}.`);
  }
  if (reasons.length) return { status: 'must_file', reasons };

  return {
    status: 'likely_no_return',
    reasons: [
      'Your only income is salary taxed through APIT, and interest is within the limit. We will confirm after your figures.',
    ],
  };
}

export type FilingObligation =
  | { status: 'out_of_scope'; reasons: OutOfScopeReason[] }
  | { status: 'must_file'; reasons: string[] }
  | { status: 'no_return_needed'; reasons: string[] };

/**
 * Final decision after calculation. "Fully subject to APIT" is treated as: tax computed equals
 * credits (balance 0). Any balance either way means a return is needed (to pay, or to claim the refund).
 */
export function confirmFilingObligation(e: Eligibility, r: CalculationResult): FilingObligation {
  if (e.status !== 'likely_no_return') return e;

  const reasons: string[] = [];
  if (r.returnType === 'standard')
    reasons.push('You have freelance or business income, which is not taxed through APIT.');
  if (r.interestIncome > NO_RETURN_INTEREST_LIMIT) {
    reasons.push(
      `Your certificates show interest of Rs ${r.interestIncome.toLocaleString('en-LK')}, above the Rs 5,000 limit.`,
    );
  }
  if (r.balance > 0) reasons.push('Your tax is more than what was deducted, so you have a balance to pay.');
  if (r.balance < 0) reasons.push('More tax was deducted than you owe. File a return to claim the refund.');
  if (reasons.length) return { status: 'must_file', reasons };

  return {
    status: 'no_return_needed',
    reasons: [
      'Your salary was fully taxed through APIT and nothing is owed either way. You do not need to file unless IRD asks you to.',
    ],
  };
}
