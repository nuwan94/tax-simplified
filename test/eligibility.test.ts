import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessEligibility, calculate, confirmFilingObligation, getRules } from '../src/index.ts';
import type { EligibilityAnswers } from '../src/index.ts';
import { fd, input, job } from './helpers.ts';

const rules = getRules('2025/2026');

const salaryOnly: EligibilityAnswers = {
  resident: true,
  hasOtherIncome: false,
  hasOtherReliefs: false,
  employerCount: 1,
  allEmployersDeductedApit: true,
  approxInterest: 0,
  hasIrdFile: false,
};

describe('assessEligibility', () => {
  it('salary fully under APIT, no file → likely no return', () => {
    assert.equal(assessEligibility(salaryOnly).status, 'likely_no_return');
  });

  it('collects every out-of-scope reason', () => {
    const e = assessEligibility({ ...salaryOnly, resident: false, hasOtherIncome: true, hasOtherReliefs: true });
    assert.deepEqual(e, { status: 'out_of_scope', reasons: ['non_resident', 'other_income', 'other_reliefs'] });
  });

  it('interest above Rs 5,000 → must file; exactly Rs 5,000 does not', () => {
    assert.equal(assessEligibility({ ...salaryOnly, approxInterest: 5_001 }).status, 'must_file');
    assert.equal(assessEligibility({ ...salaryOnly, approxInterest: 5_000 }).status, 'likely_no_return');
  });

  it('IRD file opened → must file', () => {
    assert.equal(assessEligibility({ ...salaryOnly, hasIrdFile: true }).status, 'must_file');
  });

  it('employment without full APIT → must file', () => {
    assert.equal(assessEligibility({ ...salaryOnly, allEmployersDeductedApit: false }).status, 'must_file');
  });

  it('interest-only (no employer) → must file', () => {
    assert.equal(assessEligibility({ ...salaryOnly, employerCount: 0, approxInterest: 300_000 }).status, 'must_file');
  });
});

describe('confirmFilingObligation', () => {
  const likely = assessEligibility(salaryOnly);

  it('T6: APIT exactly covers tax → no return needed', () => {
    const r = calculate(input([job(3_600_000, 222_000)]), rules);
    assert.equal(confirmFilingObligation(likely, r).status, 'no_return_needed');
  });

  it('T7: Rs 5,000 interest leaves Rs 700 to pay → must file', () => {
    const r = calculate(input([job(3_600_000, 222_000)], [fd(5_000, 500)]), rules);
    const o = confirmFilingObligation(likely, r);
    assert.equal(o.status, 'must_file');
    assert.match(o.reasons.join(' '), /balance to pay/);
  });

  it('APIT over-deducted → must file to claim refund', () => {
    const r = calculate(input([job(3_600_000, 250_000)]), rules);
    assert.match(JSON.stringify(confirmFilingObligation(likely, r)), /claim the refund/);
  });

  it('certificates reveal more interest than the user estimated → must file', () => {
    const r = calculate(input([job(1_000_000, 0)], [fd(20_000, 2_000)]), rules);
    const o = confirmFilingObligation(likely, r);
    assert.equal(o.status, 'must_file');
    assert.match(o.reasons[0]!, /above the Rs 5,000 limit/);
  });

  it('passes through decisions already made before calculation', () => {
    const r = calculate(input([job(1_000_000, 0)]), rules);
    const mustFile = assessEligibility({ ...salaryOnly, hasIrdFile: true });
    assert.equal(confirmFilingObligation(mustFile, r), mustFile);
  });
});

describe('freelance income', () => {
  it('any freelance entry → must file', () => {
    const e = assessEligibility({ ...salaryOnly, businessCount: 1 });
    assert.equal(e.status, 'must_file');
    assert.match(JSON.stringify(e), /not taxed through APIT/);
  });

  it('freelance-only person gets the freelance reason, not the interest one', () => {
    const e = assessEligibility({ ...salaryOnly, employerCount: 0, businessCount: 1 });
    assert.doesNotMatch(JSON.stringify(e), /interest income without employment/);
  });
});
