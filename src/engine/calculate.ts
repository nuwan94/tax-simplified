import type { Rules } from '../rules/types.ts';
import { rulesVersion } from '../rules/load.ts';
import { taxOnRange } from './progressive.ts';
import { hashInputs } from './hash.ts';
import type { BusinessInput, CalculationInput, CalculationResult, TaxBand, TraceLine, Warning } from './types.ts';

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
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const net = (b: BusinessInput) => Math.max(0, b.gross - b.expenses);
const isConcessionary = (b: BusinessInput) => b.origin === 'foreign' && b.remittedViaBank;

/**
 * Income tax for a resident with employment, interest, and freelance/business income
 * (local, or foreign received through a bank at the capped rate).
 *
 * Method (IRD guide YA 2025/26, Examples 2, 3, 6): personal relief is set against local income
 * first; local income fills the lowest bands; concessionary foreign income is taxed on the bands
 * above it with every rate capped at `foreignSourceIncome.maxRate`.
 *
 * Pure: no I/O, no clock. Amounts are whole rupees.
 */
export function calculate(input: CalculationInput, rules: Rules): CalculationResult {
  validateInput(input, rules);

  const businesses = input.businesses ?? [];
  const c = core(input, rules);

  // What the tax would be if all foreign income had come in through a bank.
  let remittanceSaving: number | undefined;
  if (businesses.some((b) => b.origin === 'foreign' && !b.remittedViaBank && net(b) > 0)) {
    const ifRemitted = core(
      { ...input, businesses: businesses.map((b) => (b.origin === 'foreign' ? { ...b, remittedViaBank: true } : b)) },
      rules,
    );
    remittanceSaving = Math.max(0, c.balance - ifRemitted.balance);
  }

  const outcome = c.balance > 0 ? 'payable' : c.balance < 0 ? 'refund' : 'nil';
  const { employments, interests } = input;
  const local = businesses.filter((b) => b.origin === 'local');
  const fxIn = businesses.filter(isConcessionary);
  const fxOut = businesses.filter((b) => b.origin === 'foreign' && !b.remittedViaBank);
  const reliefRule = rules.reliefs.personal;

  const incomeLine = (key: string, label: string, xs: BusinessInput[]): TraceLine[] =>
    xs.length
      ? [
          {
            key,
            label,
            amount: sum(xs.map(net)),
            formula: xs.some((b) => b.expenses > 0)
              ? `${fmt(sum(xs.map((b) => b.gross)))} less expenses ${fmt(sum(xs.map((b) => Math.min(b.expenses, b.gross))))}`
              : xs.length > 1
                ? xs.map((b) => fmt(b.gross)).join(' + ')
                : undefined,
            inputIds: ids(xs),
          },
        ]
      : [];

  const trace: TraceLine[] = [
    {
      key: 'employmentIncome',
      label: 'Employment income',
      amount: c.employmentIncome,
      formula: employments.length > 1 ? employments.map((e) => fmt(e.gross)).join(' + ') : undefined,
      inputIds: ids(employments),
    },
    {
      key: 'interestIncome',
      label: 'Interest income (gross)',
      amount: c.interestIncome,
      formula: interests.length > 1 ? interests.map((i) => fmt(i.gross)).join(' + ') : undefined,
      inputIds: ids(interests),
    },
    ...incomeLine('business.local', 'Freelance / business income (local)', local),
    ...incomeLine('business.foreign', 'Foreign income received through a bank', fxIn),
    ...incomeLine('business.foreignOther', 'Foreign income not brought in through a bank', fxOut),
    { key: 'assessable', label: 'Assessable income', amount: c.assessable, formula: 'Total of the above' },
    {
      key: 'relief',
      label: 'Less: personal relief',
      amount: -c.relief,
      formula:
        c.relief < reliefRule.amount
          ? `limited to assessable income (max ${fmt(reliefRule.amount)})`
          : c.concessionaryIncome > 0
            ? 'set against local income first'
            : undefined,
      ruleRef: reliefRule.source,
    },
    { key: 'taxable', label: 'Taxable income', amount: c.taxable, formula: 'Assessable − Relief' },
    ...c.bands.map((l, i) => ({
      key: l.kind === 'normal' ? `band.${i}` : `fband.${i}`,
      label:
        l.kind === 'normal'
          ? `Tax on ${fmt(l.amount)} at ${pct(l.rate)}`
          : `Foreign income: ${fmt(l.amount)} at ${pct(l.rate)}`,
      amount: l.tax,
      formula: `${fmt(l.from)} – ${fmt(l.to)}${l.kind === 'foreign' ? ` (capped at ${pct(rules.foreignSourceIncome.maxRate)})` : ''}`,
      ruleRef: l.kind === 'normal' ? rules.progressiveRates.source : rules.foreignSourceIncome.source,
    })),
    { key: 'tax', label: 'Income tax', amount: c.tax },
    {
      key: 'credit.apitPrimary',
      label: 'Less: APIT (primary employer)',
      amount: -c.credits.apitPrimary,
      inputIds: ids(employments.filter((e) => e.isPrimary)),
    },
    ...(c.credits.apitSecondary || employments.some((e) => !e.isPrimary)
      ? [
          {
            key: 'credit.apitSecondary',
            label: 'Less: APIT (secondary employers)',
            amount: -c.credits.apitSecondary,
            inputIds: ids(employments.filter((e) => !e.isPrimary)),
          },
        ]
      : []),
    {
      key: 'credit.ait',
      label: 'Less: AIT/WHT on interest',
      amount: -c.credits.ait,
      inputIds: ids(interests),
      ruleRef: rules.withholding.interestResident.source,
    },
    ...(c.credits.serviceWht
      ? [
          {
            key: 'credit.serviceWht',
            label: 'Less: WHT on service fees',
            amount: -c.credits.serviceWht,
            inputIds: ids(local),
          },
        ]
      : []),
    ...(c.credits.foreignTaxCredit
      ? [
          {
            key: 'credit.foreignTax',
            label: 'Less: foreign tax credit',
            amount: -c.credits.foreignTaxCredit,
            formula: 'limited to the tax on foreign income',
            inputIds: ids(fxIn),
          },
        ]
      : []),
    ...(c.credits.instalments
      ? [{ key: 'credit.instalments', label: 'Less: quarterly instalments paid', amount: -c.credits.instalments }]
      : []),
    {
      key: 'balance',
      label: outcome === 'refund' ? 'Refund due' : outcome === 'payable' ? 'Balance tax payable' : 'Nothing to pay',
      amount: c.balance,
      formula: 'Income tax − Credits',
    },
  ];

  return {
    ya: input.ya,
    rulesVersion: rulesVersion(rules),
    inputsHash: hashInputs(input),
    returnType: businesses.length > 0 ? 'standard' : 'simplified',
    employmentIncome: c.employmentIncome,
    interestIncome: c.interestIncome,
    businessIncome: c.businessIncome,
    concessionaryIncome: c.concessionaryIncome,
    assessable: c.assessable,
    relief: c.relief,
    taxable: c.taxable,
    tax: c.tax,
    bands: c.bands,
    credits: c.credits,
    balance: c.balance,
    outcome,
    ...(remittanceSaving !== undefined ? { remittanceSaving } : {}),
    trace,
    warnings: collectWarnings(input, rules, c.foreignTaxBeforeCredit),
  };
}

/** The numbers only: shared by the main result and the "what if remitted" comparison. */
function core(input: CalculationInput, rules: Rules) {
  const { employments, interests } = input;
  const businesses = input.businesses ?? [];

  const employmentIncome = sum(employments.map((e) => e.gross));
  const interestIncome = sum(interests.map((i) => i.gross));
  const businessIncome = sum(businesses.map(net));
  const concessionaryIncome = sum(businesses.filter(isConcessionary).map(net));
  const normalIncome = employmentIncome + interestIncome + businessIncome - concessionaryIncome;
  const assessable = normalIncome + concessionaryIncome;

  // Relief goes against local (normal-rate) income first: it is never worse for the taxpayer.
  const relief = Math.min(rules.reliefs.personal.amount, assessable);
  const reliefNormal = Math.min(relief, normalIncome);
  const taxableNormal = normalIncome - reliefNormal;
  const taxableForeign = concessionaryIncome - (relief - reliefNormal);
  const taxable = taxableNormal + taxableForeign;

  const bandsList = rules.progressiveRates.bands;
  const normal = taxOnRange(0, taxableNormal, bandsList);
  const foreign = taxOnRange(taxableNormal, taxable, bandsList, rules.foreignSourceIncome.maxRate);
  const bands: TaxBand[] = [
    ...normal.lines.map((l) => ({ kind: 'normal' as const, ...l })),
    ...foreign.lines.map((l) => ({ kind: 'foreign' as const, ...l })),
  ];
  const tax = normal.total + foreign.total;

  const apitPrimary = sum(employments.filter((e) => e.isPrimary).map((e) => e.apit));
  const apitSecondary = sum(employments.filter((e) => !e.isPrimary).map((e) => e.apit));
  const ait = sum(interests.map((i) => i.ait));
  const serviceWht = sum(businesses.filter((b) => b.origin === 'local').map((b) => b.taxDeducted));
  const foreignTaxPaid = sum(businesses.filter(isConcessionary).map((b) => b.taxDeducted));
  const foreignTaxCredit = Math.min(foreignTaxPaid, foreign.total);
  const instalments = input.instalmentsPaid ?? 0;
  const total = apitPrimary + apitSecondary + ait + serviceWht + foreignTaxCredit + instalments;

  return {
    employmentIncome,
    interestIncome,
    businessIncome,
    concessionaryIncome,
    assessable,
    relief,
    taxable,
    tax,
    bands,
    foreignTaxBeforeCredit: foreign.total,
    credits: { apitPrimary, apitSecondary, ait, serviceWht, foreignTaxCredit, instalments, total },
    balance: tax - total,
  };
}

function validateInput(input: CalculationInput, rules: Rules): void {
  if (input.ya !== rules.yearOfAssessment) {
    throw new InputError(`Input is for YA ${input.ya} but rules are for YA ${rules.yearOfAssessment}`);
  }
  const businesses = input.businesses ?? [];
  const seen = new Set<string>();
  const check = (id: string | undefined, field: string, v: number) => {
    if (!Number.isInteger(v) || v < 0) {
      throw new InputError(`${field} must be a whole, non-negative rupee amount (got ${v})`, id);
    }
  };
  for (const x of [...input.employments, ...input.interests, ...businesses]) {
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
  for (const b of businesses) {
    check(b.id, 'Business income', b.gross);
    check(b.id, 'Expenses', b.expenses);
    check(b.id, 'Tax deducted', b.taxDeducted);
  }
  if (input.instalmentsPaid !== undefined) check(undefined, 'Instalments paid', input.instalmentsPaid);
}

function collectWarnings(input: CalculationInput, rules: Rules, foreignTax: number): Warning[] {
  const w: Warning[] = [];
  const rate = rules.withholding.interestResident.rate;
  const businesses = input.businesses ?? [];

  for (const i of input.interests) {
    if (i.ait > i.gross) {
      w.push({
        code: 'AIT_EXCEEDS_GROSS',
        inputId: i.id,
        message: `${i.institution}: tax deducted is more than the interest.`,
      });
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

  for (const b of businesses) {
    if (b.expenses > b.gross) {
      w.push({
        code: 'BUSINESS_LOSS',
        inputId: b.id,
        message: `${b.description}: expenses are more than income. Losses aren't handled yet, so this is counted as zero.`,
      });
    }
    if (b.origin === 'foreign' && !b.remittedViaBank && net(b) > 0) {
      w.push({
        code: 'NOT_REMITTED',
        inputId: b.id,
        message: `${b.description}: foreign income not brought in through a Sri Lankan bank is taxed at normal rates, not the 15% cap.`,
      });
      if (b.taxDeducted > 0) {
        w.push({
          code: 'FOREIGN_TAX_NOT_CREDITED',
          inputId: b.id,
          message: `${b.description}: foreign tax paid isn't credited here because the income wasn't brought in through a bank.`,
        });
      }
    }
  }

  const foreignTaxPaid = sum(businesses.filter(isConcessionary).map((b) => b.taxDeducted));
  if (foreignTaxPaid > foreignTax) {
    w.push({
      code: 'FOREIGN_TAX_CREDIT_LIMITED',
      message: `Foreign tax of Rs ${fmt(foreignTaxPaid)} is more than the Sri Lankan tax on that income (Rs ${fmt(foreignTax)}). Only Rs ${fmt(foreignTax)} can be credited, and the rest isn't refundable.`,
    });
  }

  const primaries = input.employments.filter((e) => e.isPrimary).length;
  if (input.employments.length > 0 && primaries === 0) {
    w.push({ code: 'NO_PRIMARY_EMPLOYER', message: 'Mark one employer as your primary employer.' });
  }
  if (primaries > 1) {
    w.push({ code: 'MULTIPLE_PRIMARY_EMPLOYERS', message: 'Only one employer can be your primary employer.' });
  }

  if (input.employments.length === 0 && input.interests.length === 0 && businesses.length === 0) {
    w.push({ code: 'NO_INCOME', message: 'No income entered.' });
  }
  return w;
}
