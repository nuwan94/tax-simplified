import type { Rules } from '../rules/types.ts';
import { rulesVersion } from '../rules/load.ts';
import { progressiveTax } from './progressive.ts';
import { hashInputs } from './hash.ts';
import type { CalculationInput, CalculationResult, TraceLine, Warning } from './types.ts';

/** Raised when the user's figures can't be used (negative, fractional, wrong year). */
export class InputError extends Error {
  readonly inputId: string | undefined;
  constructor(message: string, inputId?: string) {
    super(message);
    this.name = 'InputError';
    this.inputId = inputId;
  }
}

/** Tolerance for the AIT sanity check, in percentage points of gross interest. */
const AIT_TOLERANCE = 0.01;

const fmt = (n: number) => n.toLocaleString('en-LK');
const pct = (r: number) => `${+(r * 100).toFixed(2)}%`;

/**
 * Income tax for a resident with employment and interest income only (Simplified Return scope).
 * Pure: no I/O, no clock. Amounts are whole rupees.
 */
export function calculate(input: CalculationInput, rules: Rules): CalculationResult {
  validateInput(input, rules);

  const { employments, interests } = input;
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const employmentIncome = sum(employments.map((e) => e.gross));
  const interestIncome = sum(interests.map((i) => i.gross));
  const assessable = employmentIncome + interestIncome;

  const reliefRule = rules.reliefs.personal;
  const relief = Math.min(reliefRule.amount, assessable);
  const taxable = assessable - relief;

  const bands = progressiveTax(taxable, rules.progressiveRates.bands);

  const apitPrimary = sum(employments.filter((e) => e.isPrimary).map((e) => e.apit));
  const apitSecondary = sum(employments.filter((e) => !e.isPrimary).map((e) => e.apit));
  const ait = sum(interests.map((i) => i.ait));
  const creditsTotal = apitPrimary + apitSecondary + ait;

  const balance = bands.total - creditsTotal;
  const outcome = balance > 0 ? 'payable' : balance < 0 ? 'refund' : 'nil';

  const trace: TraceLine[] = [
    {
      key: 'employmentIncome',
      label: 'Employment income',
      amount: employmentIncome,
      formula: employments.length > 1 ? employments.map((e) => fmt(e.gross)).join(' + ') : undefined,
      inputIds: ids(employments),
    },
    {
      key: 'interestIncome',
      label: 'Interest income (gross)',
      amount: interestIncome,
      formula: interests.length > 1 ? interests.map((i) => fmt(i.gross)).join(' + ') : undefined,
      inputIds: ids(interests),
    },
    { key: 'assessable', label: 'Assessable income', amount: assessable, formula: 'Employment + Interest' },
    {
      key: 'relief',
      label: 'Less: personal relief',
      amount: -relief,
      formula: relief < reliefRule.amount ? `limited to assessable income (max ${fmt(reliefRule.amount)})` : undefined,
      ruleRef: reliefRule.source,
    },
    { key: 'taxable', label: 'Taxable income', amount: taxable, formula: 'Assessable − Relief' },
    ...bands.lines.map((l, i) => ({
      key: `band.${i}`,
      label: `Tax on ${fmt(l.amount)} at ${pct(l.rate)}`,
      amount: l.tax,
      formula: `${fmt(l.from)} – ${fmt(l.to)}`,
      ruleRef: rules.progressiveRates.source,
    })),
    { key: 'tax', label: 'Income tax', amount: bands.total },
    {
      key: 'credit.apitPrimary',
      label: 'Less: APIT (primary employer)',
      amount: -apitPrimary,
      inputIds: ids(employments.filter((e) => e.isPrimary)),
    },
    ...(apitSecondary || employments.some((e) => !e.isPrimary)
      ? [
          {
            key: 'credit.apitSecondary',
            label: 'Less: APIT (secondary employers)',
            amount: -apitSecondary,
            inputIds: ids(employments.filter((e) => !e.isPrimary)),
          },
        ]
      : []),
    {
      key: 'credit.ait',
      label: 'Less: AIT/WHT on interest',
      amount: -ait,
      inputIds: ids(interests),
      ruleRef: rules.withholding.interestResident.source,
    },
    {
      key: 'balance',
      label: outcome === 'refund' ? 'Refund due' : outcome === 'payable' ? 'Balance tax payable' : 'Nothing to pay',
      amount: balance,
      formula: 'Income tax − Credits',
    },
  ];

  return {
    ya: input.ya,
    rulesVersion: rulesVersion(rules),
    inputsHash: hashInputs(input),
    employmentIncome,
    interestIncome,
    assessable,
    relief,
    taxable,
    tax: bands.total,
    credits: { apitPrimary, apitSecondary, ait, total: creditsTotal },
    balance,
    outcome,
    trace,
    warnings: collectWarnings(input, rules),
  };
}

function validateInput(input: CalculationInput, rules: Rules): void {
  if (input.ya !== rules.yearOfAssessment) {
    throw new InputError(`Input is for YA ${input.ya} but rules are for YA ${rules.yearOfAssessment}`);
  }
  const seen = new Set<string>();
  const check = (id: string, field: string, v: number) => {
    if (!Number.isInteger(v) || v < 0) {
      throw new InputError(`${field} must be a whole, non-negative rupee amount (got ${v})`, id);
    }
  };
  for (const x of [...input.employments, ...input.interests]) {
    if (seen.has(x.id)) throw new InputError(`Duplicate input id "${x.id}"`, x.id);
    seen.add(x.id);
  }
  for (const e of input.employments) {
    check(e.id, 'Employment gross', e.gross);
    check(e.id, 'APIT', e.apit);
  }
  for (const i of input.interests) {
    check(i.id, 'Interest gross', i.gross);
    check(i.id, 'AIT', i.ait);
  }
}

function collectWarnings(input: CalculationInput, rules: Rules): Warning[] {
  const w: Warning[] = [];
  const rate = rules.withholding.interestResident.rate;

  for (const i of input.interests) {
    if (i.ait > i.gross) {
      w.push({ code: 'AIT_EXCEEDS_GROSS', inputId: i.id, message: `${i.institution}: tax deducted is more than the interest.` });
    } else if (i.gross > 0 && i.ait > 0 && Math.abs(i.ait / i.gross - rate) > AIT_TOLERANCE) {
      w.push({
        code: 'AIT_RATE_MISMATCH',
        inputId: i.id,
        message: `${i.institution}: tax deducted is ${pct(i.ait / i.gross)} of interest, expected about ${pct(rate)}. Is the interest figure gross (before tax)?`,
      });
    }
  }

  for (const e of input.employments) {
    if (e.apit > e.gross) {
      w.push({ code: 'APIT_EXCEEDS_GROSS', inputId: e.id, message: `${e.employerName}: APIT is more than gross pay.` });
    }
  }

  const primaries = input.employments.filter((e) => e.isPrimary).length;
  if (input.employments.length > 0 && primaries === 0) {
    w.push({ code: 'NO_PRIMARY_EMPLOYER', message: 'Mark one employer as your primary employer.' });
  }
  if (primaries > 1) {
    w.push({ code: 'MULTIPLE_PRIMARY_EMPLOYERS', message: 'Only one employer can be your primary employer.' });
  }

  if (input.employments.length === 0 && input.interests.length === 0) {
    w.push({ code: 'NO_INCOME', message: 'No income entered.' });
  }
  return w;
}
