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

  it('makes a safe file name', () => {
    assert.equal(summaryFileName('Amma', '2025/2026'), 'tax-summary-2025-26-amma.pdf');
    assert.equal(summaryFileName('  ', '2025/2026'), 'tax-summary-2025-26.pdf');
    assert.equal(summaryFileName('Nuwan S. (me)', '2025/2026'), 'tax-summary-2025-26-nuwan-s-me.pdf');
  });
});
