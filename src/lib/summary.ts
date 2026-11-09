// The printable summary: plain data built from a calculation, rendered to PDF separately
// (src/lib/summaryPdf.ts). Kept free of browser and PDF code so it can be tested.

import type {
  BusinessInput,
  CalculationResult,
  EmploymentInput,
  FilingObligation,
  InterestInput,
  Rules,
} from '../index.ts';
import type { summarizeMonths } from './payslips.ts';

type PaySummary = ReturnType<typeof summarizeMonths>;

export interface SummaryTable {
  title: string;
  head: string[];
  rows: string[][];
  foot?: string[];
  /** Columns (by index) holding figures, right-aligned. */
  numeric: number[];
}

export interface SummaryDoc {
  title: string;
  person: string;
  generated: string;
  headline: { label: string; amount: string; outcome: CalculationResult['outcome'] };
  facts: [string, string][];
  tables: SummaryTable[];
  notes: string[];
  footer: string;
}

export interface SummaryInput {
  person: string;
  ya: string;
  rules: Rules;
  result: CalculationResult;
  obligation: FilingObligation | null;
  employments: EmploymentInput[];
  /** Payslip months per employment id, where entered from payslips. */
  payslips: Record<string, PaySummary>;
  interests: InterestInput[];
  businesses: BusinessInput[];
  now: Date;
}

const rs = (n: number) => (Math.round(n) + 0).toLocaleString('en-LK'); // + 0 turns -0 into 0
const signed = (n: number) => (n < 0 ? `(${rs(-n)})` : rs(n));
const cents = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export function buildSummary(i: SummaryInput): SummaryDoc {
  const { result: r, rules } = i;

  const headline = {
    label: r.outcome === 'payable' ? 'Balance tax payable' : r.outcome === 'refund' ? 'Refund due' : 'Nothing to pay',
    amount: `Rs ${rs(Math.abs(r.balance))}`,
    outcome: r.outcome,
  };

  const returnText = !i.obligation
    ? 'Not decided: answer the checks'
    : i.obligation.status === 'must_file'
      ? `Required: ${r.returnType === 'standard' ? 'Standard' : 'Simplified'} Return`
      : i.obligation.status === 'no_return_needed'
        ? 'Not required'
        : 'Not covered by this calculator';
  const facts: [string, string][] = [
    ['Year of assessment', `${i.ya.replace('/20', '/')} (1 Apr ${i.ya.slice(0, 4)} – 31 Mar ${i.ya.slice(5)})`],
    ['Return', returnText],
    ['Filing deadline', date(rules.filing.deadline)],
  ];
  if (r.outcome === 'payable') {
    facts.push([
      'Pay by',
      `${date(rules.payments.final.due)} · tax type 05, payment code ${rules.payments.final.paymentCode}`,
    ]);
  }

  const income: string[][] = [
    ...i.employments.map((e) => [
      `Salary: ${e.employerName}${i.payslips[e.id] ? ` (${i.payslips[e.id]!.rows.length} payslips)` : ''}`,
      rs(e.gross),
      rs(e.apit),
    ]),
    ...i.interests.map((x) => [`Interest: ${x.institution}`, rs(x.gross), rs(x.ait)]),
    ...i.businesses.map((b) => [
      `${b.origin === 'foreign' ? 'Foreign' : 'Local'} income: ${b.description}${
        b.foreign ? ` (${b.foreign.currency} ${cents(b.foreign.amount)})` : ''
      }${b.expenses ? `, less expenses ${rs(b.expenses)}` : ''}`,
      rs(Math.max(0, b.gross - b.expenses)),
      rs(b.taxDeducted),
    ]),
  ];
  if (r.credits.instalments) income.push(['Quarterly instalments paid', '', rs(r.credits.instalments)]);

  const tables: SummaryTable[] = [
    {
      title: 'Income and tax already paid',
      head: ['Source', 'Income (Rs)', 'Tax paid (Rs)'],
      rows: income,
      foot: ['Total', rs(r.assessable), rs(r.credits.total)],
      numeric: [1, 2],
    },
    {
      title: 'Computation',
      head: ['#', 'Item', 'Rs'],
      rows: r.trace.map((t, n) => [
        String(n + 1),
        t.formula ? `${t.label}\n${t.formula}` : t.label,
        signed(t.key === 'balance' ? Math.abs(t.amount) : t.amount),
      ]),
      numeric: [2],
    },
    {
      title: 'Income by tax band',
      head: ['Band', 'Income (Rs)', 'Tax (Rs)'],
      rows: [
        ['Tax-free allowance', rs(r.relief), '0'],
        ...r.bands.map((b) => [
          `${b.kind === 'foreign' ? 'Foreign income at' : 'At'} ${Math.round(b.rate * 100)}%`,
          rs(b.amount),
          rs(b.tax),
        ]),
      ],
      foot: ['Total', rs(r.relief + r.taxable), rs(r.tax)],
      numeric: [1, 2],
    },
  ];

  for (const e of i.employments) {
    const p = i.payslips[e.id];
    if (!p || p.rows.length === 0) continue;
    tables.push({
      title: `Salary by month: ${e.employerName}`,
      head: ['Month', 'Regular pay', 'Bonus, arrears', 'Gross', 'APIT'],
      rows: p.rows.map((m) => [
        month(m.month),
        cents(m.regular),
        m.extra ? cents(m.extra) : '',
        cents(m.gross),
        `${cents(m.apitUsed)}${m.apitEstimated ? ' *' : ''}`,
      ]),
      foot: ['Total', '', '', cents(p.gross), cents(p.apit)],
      numeric: [1, 2, 3, 4],
    });
  }

  const notes: string[] = [];
  if (Object.values(i.payslips).some((p) => p.estimatedApitMonths > 0)) {
    notes.push('* APIT worked out from the APIT tables, not taken from a payslip.');
  }
  if (Object.values(i.payslips).some((p) => p.estimatedPayMonths > 0)) {
    notes.push('Some pegged allowances are estimated from CBSL monthly average USD rates.');
  }
  if (r.remittanceSaving) {
    notes.push(`Bringing foreign income in through a Sri Lankan bank would save Rs ${rs(r.remittanceSaving)}.`);
  }
  for (const w of r.warnings) notes.push(w.message);
  if (i.obligation && i.obligation.status !== 'out_of_scope') notes.push(...i.obligation.reasons);

  return {
    title: `Income tax summary ${i.ya.replace('/20', '/')}`,
    person: i.person,
    generated: i.now.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Colombo',
    }),
    headline,
    facts,
    tables,
    notes,
    footer:
      'Estimate from the figures entered, using the Inland Revenue Department guide for YA 2025/26. Not tax advice. File and pay through RAMIS. tax.nuwan.dev',
  };
}

/** Safe file name, e.g. "tax-summary-2025-26-amma.pdf". */
export function summaryFileName(person: string, ya: string): string {
  const who = person
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `tax-summary-${ya.replace('/20', '-')}${who ? `-${who}` : ''}.pdf`;
}
