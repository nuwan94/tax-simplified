import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, getRules } from '../src/index.ts';
import { summarizeMonths } from '../src/lib/payslips.ts';
import { buildSummary, summaryFileName } from '../src/lib/summary.ts';
import { input, job } from './helpers.ts';

const rules = getRules('2025/2026');

describe('printable summary', () => {
  const employments = [job(3_600_000, 222_000)];
  const result = calculate({ ...input(employments), instalmentsPaid: 0 }, rules);
  const payRules = { relief: rules.reliefs.personal.amount, bands: rules.progressiveRates.bands };
  const pay = summarizeMonths(
    [
      { month: '2025-04', regular: 300_000, extra: 0, apit: 18_000 },
      { month: '2025-05', regular: 300_000, extra: 0 },
    ],
    payRules,
  );
  const doc = buildSummary({
    person: 'Amma',
    ya: '2025/2026',
    rules,
    result,
    obligation: null,
    employments,
    payslips: { [employments[0]!.id]: pay },
    interests: [],
    businesses: [],
    now: new Date('2026-11-09T10:00:00Z'),
  });

  it('leads with the outcome and the person', () => {
    assert.equal(doc.person, 'Amma');
    assert.equal(doc.title, 'Income tax summary 2025/26');
    assert.equal(doc.headline.outcome, result.outcome);
    assert.match(doc.headline.amount, /^Rs /);
  });

  it('includes income, computation, bands and payslip months', () => {
    assert.deepEqual(
      doc.tables.map((t) => t.title),
      [
        'Income and tax already paid',
        'Computation',
        'Income by tax band',
        `Salary by month: ${employments[0]!.employerName}`,
      ],
    );
    const comp = doc.tables[1]!;
    assert.equal(comp.rows.length, result.trace.length);
    const months = doc.tables[3]!;
    assert.equal(months.rows.length, 2);
    assert.match(months.rows[1]![4]!, /\*$/);
    assert.equal(months.rows[0]![0], 'Apr 2025');
    assert.ok(!comp.rows.some((r) => r[2] === '-0'));
  });

  it('explains estimated APIT and that the return is not decided', () => {
    assert.ok(doc.notes.some((n) => n.startsWith('* APIT')));
    assert.equal(doc.facts.find(([k]) => k === 'Return')![1], 'Not decided: answer the checks');
  });

  it('lists expenses with bills and warns about the ones without', () => {
    const biz = {
      id: 'b1',
      description: 'Design work',
      origin: 'foreign' as const,
      remittedViaBank: true,
      gross: 1_000_000,
      expenses: 150_000,
      taxDeducted: 0,
      foreign: { currency: 'EUR', amount: 3_000, basis: 'cbsl-monthly-average' as const },
      source: { method: 'manual' as const },
    };
    const withBiz = calculate({ ...input(employments), businesses: [biz], instalmentsPaid: 0 }, rules);
    const d = buildSummary({
      person: '',
      ya: '2025/2026',
      rules,
      result: withBiz,
      obligation: null,
      employments,
      payslips: {},
      interests: [],
      businesses: [biz],
      expenses: {
        b1: {
          lines: [
            { what: 'Laptop repair', amount: 100_000, bill: true },
            { what: 'Internet', amount: 50_000, bill: false },
          ],
          unbilled: 50_000,
        },
      },
      unbilledTax: 7_500,
      now: new Date('2026-11-09T10:00:00Z'),
    });
    const t = d.tables.find((x) => x.title === 'Expenses: Design work')!;
    assert.deepEqual(t.rows, [
      ['Laptop repair', 'Yes', '100,000'],
      ['Internet', 'No', '50,000'],
    ]);
    assert.deepEqual(t.foot, ['Total', '', '150,000']);
    assert.ok(d.notes.includes('Rs 50,000 of expenses have no bill. If IRD disallows them, tax goes up by Rs 7,500.'));
    assert.ok(d.notes.some((n) => n.startsWith('Foreign currency is converted')));
    assert.match(d.tables[0]!.rows.find((r) => r[0]!.includes('Design work'))![0]!, /EUR 3,000\.00/);
  });

  it('makes a safe file name', () => {
    assert.equal(summaryFileName('Amma', '2025/2026'), 'tax-summary-2025-26-amma.pdf');
    assert.equal(summaryFileName('  ', '2025/2026'), 'tax-summary-2025-26.pdf');
    assert.equal(summaryFileName('Nuwan S. (me)', '2025/2026'), 'tax-summary-2025-26-nuwan-s-me.pdf');
  });
});
