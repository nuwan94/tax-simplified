import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRules } from '../src/index.ts';
import { annualTax, apitLumpSum, apitMonthly, peggedSplit, summarizeMonths } from '../src/lib/payslips.ts';

const rules = getRules('2025/2026');
const r = { relief: rules.reliefs.personal.amount, bands: rules.progressiveRates.bands };

describe('APIT on monthly pay', () => {
  it('nothing up to Rs 150,000 a month', () => {
    assert.equal(apitMonthly(150_000, r), 0);
    assert.equal(apitMonthly(100_000, r), 0);
  });

  it('6% on the next Rs 83,333.33', () => {
    assert.equal(apitMonthly(200_000, r), 3_000);
  });

  it('Rs 35,000 plus 36% above Rs 358,333.33', () => {
    // 35,000 + (500,000 − 358,333.33) × 36%
    assert.equal(apitMonthly(500_000, r), 86_000);
  });

  it('matches the annual tax over twelve months', () => {
    assert.equal(apitMonthly(400_000, r) * 12, annualTax(4_800_000, r));
  });
});

describe('APIT on bonuses', () => {
  it('is the extra tax the bonus adds to the year', () => {
    // regular pay already in the 36% band: the whole bonus is taxed at 36%
    assert.equal(apitLumpSum(500_000, 100_000, r), 36_000);
    // low pay: the bonus fills lower bands first
    assert.equal(apitLumpSum(100_000, 300_000, r), Math.round(annualTax(1_500_000, r) - annualTax(1_200_000, r)));
    assert.equal(apitLumpSum(500_000, 0, r), 0);
  });
});

describe('pegged salary', () => {
  it('splits USD pay into a basic at the peg and an allowance up to the market rate', () => {
    assert.deepEqual(peggedSplit(2_000, 200, 300), { basic: 400_000, allowance: 200_000 });
    assert.deepEqual(peggedSplit(1_000, 200, 150), { basic: 200_000, allowance: 0 });
  });
});

describe('summarizing payslip months', () => {
  const s = summarizeMonths(
    [
      { month: '2025-04', regular: 500_000, extra: 0, apit: 86_000 },
      { month: '2025-05', regular: 500_000, extra: 100_000 },
      { month: '2025-06', regular: 500_000, extra: 0, apit: 80_000 },
    ],
    r,
  );

  it('totals gross pay including bonuses', () => {
    assert.equal(s.gross, 1_600_000);
  });

  it('estimates APIT for months left blank', () => {
    assert.equal(s.rows[1]!.apitUsed, 122_000);
    assert.equal(s.estimatedApitMonths, 1);
    assert.equal(s.apit, 86_000 + 122_000 + 80_000);
  });

  it('flags a payslip APIT that differs from the tables', () => {
    assert.equal(s.rows[0]!.apitDiffers, false);
    assert.equal(s.rows[2]!.apitDiffers, true);
  });
});
