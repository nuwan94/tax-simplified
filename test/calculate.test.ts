import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, getRules, InputError } from '../src/index.ts';
import { fd, input, job } from './helpers.ts';

const rules = getRules('2025/2026');

describe('SPEC-MVP §4.1 required cases', () => {
  const cases = [
    // id, label, employment gross, APIT, interest gross, AIT, expected tax, expected balance
    ['T1', 'IRD guide Example 01', 2_880_000, 74_400, 140_000, 14_000, 99_600, 11_200],
    ['T2', 'mid earner: interest under-taxed', 3_600_000, 222_000, 600_000, 60_000, 390_000, 108_000],
    ['T3', 'below threshold: refund', 1_440_000, 0, 300_000, 30_000, 0, -30_000],
    ['T4', 'high earner', 6_000_000, 1_032_000, 2_000_000, 200_000, 1_752_000, 520_000],
    ['T5', 'relief exceeds income', 0, 0, 900_000, 90_000, 0, -90_000],
    ['T6', 'salary only, APIT exact', 3_600_000, 222_000, 0, 0, 222_000, 0],
    ['T7', 'interest at Rs 5,000 limit', 3_600_000, 222_000, 5_000, 500, 223_200, 700],
  ] as const;

  for (const [id, label, eg, apit, ig, ait, tax, balance] of cases) {
    it(`${id} ${label}`, () => {
      const emp = eg > 0 ? [job(eg, apit)] : [];
      const int = ig > 0 ? [fd(ig, ait)] : [];
      const r = calculate(input(emp, int), rules);
      assert.equal(r.tax, tax);
      assert.equal(r.balance, balance);
      assert.equal(r.outcome, balance > 0 ? 'payable' : balance < 0 ? 'refund' : 'nil');
    });
  }
});

describe('IRD Example 01 working', () => {
  const r = calculate(input([job(2_880_000, 74_400)], [fd(140_000, 14_000)]), rules);

  it('matches every line of the guide', () => {
    assert.equal(r.assessable, 3_020_000);
    assert.equal(r.relief, 1_800_000);
    assert.equal(r.taxable, 1_220_000);
    const bands = r.trace.filter((t) => t.key.startsWith('band.')).map((t) => t.amount);
    assert.deepEqual(bands, [60_000, 39_600]);
    assert.deepEqual(r.credits, { apitPrimary: 74_400, apitSecondary: 0, ait: 14_000, total: 88_400 });
  });

  it('trace balances: lines from assessable onward sum to the balance', () => {
    const get = (k: string) => r.trace.find((t) => t.key === k)!.amount;
    assert.equal(get('assessable') + get('relief'), get('taxable'));
    const credits = r.trace.filter((t) => t.key.startsWith('credit.')).reduce((s, t) => s + t.amount, 0);
    assert.equal(get('tax') + credits, get('balance'));
  });

  it('cites the rules it used', () => {
    assert.match(r.trace.find((t) => t.key === 'relief')!.ruleRef!, /Annexure 1/);
    assert.match(r.trace.find((t) => t.key === 'band.0')!.ruleRef!, /Annexure 7/);
    assert.equal(r.rulesVersion, '2025/2026@2026-11-07');
  });

  it('has no warnings for clean inputs', () => {
    assert.deepEqual(r.warnings, []);
  });
});

describe('aggregation', () => {
  it('sums several employers and banks; splits primary/secondary APIT', () => {
    const r = calculate(
      input(
        [job(2_400_000, 36_000, { id: 'a' }), job(600_000, 30_000, { id: 'b', isPrimary: false })],
        [fd(100_000, 10_000, { id: 'x' }), fd(50_000, 5_000, { id: 'y' })],
      ),
      rules,
    );
    assert.equal(r.employmentIncome, 3_000_000);
    assert.equal(r.interestIncome, 150_000);
    assert.equal(r.credits.apitPrimary, 36_000);
    assert.equal(r.credits.apitSecondary, 30_000);
    assert.equal(r.credits.ait, 15_000);
    // taxable 1,350,000 → 60,000 + 350,000 × 18% = 123,000
    assert.equal(r.tax, 123_000);
    assert.equal(r.balance, 123_000 - 81_000);
    assert.deepEqual(r.trace.find((t) => t.key === 'credit.apitSecondary')!.inputIds, ['b']);
  });

  it('applies every band including the 36% top rate', () => {
    const r = calculate(input([job(1_800_000 + 3_000_000, 0)]), rules);
    // 60,000 + 90,000 + 120,000 + 150,000 + 500,000 × 36%
    assert.equal(r.tax, 60_000 + 90_000 + 120_000 + 150_000 + 180_000);
  });

  it('band boundaries are inclusive at the top', () => {
    assert.equal(calculate(input([job(2_800_000, 0)]), rules).tax, 60_000);
    assert.equal(calculate(input([job(2_800_001, 0)]), rules).tax, 60_000);
    assert.equal(calculate(input([job(2_800_003, 0)]), rules).tax, 60_001);
  });

  it('returns nil with zero income', () => {
    const r = calculate(input([]), rules);
    assert.equal(r.balance, 0);
    assert.equal(r.outcome, 'nil');
    assert.equal(r.warnings[0]?.code, 'NO_INCOME');
  });
});

describe('warnings', () => {
  const codes = (emp: ReturnType<typeof job>[], int: ReturnType<typeof fd>[] = []) =>
    calculate(input(emp, int), rules).warnings.map((w) => w.code);

  it('flags AIT that is not ~10% (net figure entered as gross)', () => {
    assert.deepEqual(codes([job(1_000_000, 0)], [fd(90_000, 10_000)]), ['AIT_RATE_MISMATCH']);
  });
  it('accepts AIT within 1 point of 10%', () => {
    assert.deepEqual(codes([job(1_000_000, 0)], [fd(100_000, 10_500)]), []);
  });
  it('does not flag zero AIT (self-declaration filed)', () => {
    assert.deepEqual(codes([job(1_000_000, 0)], [fd(100_000, 0)]), []);
  });
  it('flags AIT above gross', () => {
    assert.deepEqual(codes([], [fd(1_000, 2_000)]), ['AIT_EXCEEDS_GROSS']);
  });
  it('flags APIT above gross', () => {
    assert.deepEqual(codes([job(1_000, 2_000)]), ['APIT_EXCEEDS_GROSS']);
  });
  it('flags missing or duplicate primary employer', () => {
    assert.deepEqual(codes([job(1_000, 0, { isPrimary: false })]), ['NO_PRIMARY_EMPLOYER']);
    assert.deepEqual(codes([job(1_000, 0, { id: 'a' }), job(1_000, 0, { id: 'b' })]), ['MULTIPLE_PRIMARY_EMPLOYERS']);
  });
});

describe('input validation', () => {
  it('rejects negative, fractional and non-numeric amounts', () => {
    for (const bad of [-1, 10.5, Number.NaN]) {
      assert.throws(() => calculate(input([job(bad, 0)]), rules), InputError);
      assert.throws(() => calculate(input([], [fd(1_000, bad)]), rules), InputError);
    }
  });
  it('rejects a year mismatch', () => {
    assert.throws(() => calculate({ ...input([]), ya: '2026/2027' }, rules), /rules are for YA 2025\/2026/);
  });
  it('rejects duplicate ids', () => {
    assert.throws(() => calculate(input([job(1, 0, { id: 'x' })], [fd(1, 0, { id: 'x' })]), rules), /Duplicate/);
  });
});

describe('inputsHash', () => {
  it('is stable regardless of key order, and changes with figures', () => {
    const a = calculate(input([job(1_000_000, 0)]), rules).inputsHash;
    const reordered = { interests: [], employments: [{ ...job(1_000_000, 0) }], ya: '2025/2026' };
    assert.equal(calculate(reordered, rules).inputsHash, a);
    assert.notEqual(calculate(input([job(1_000_001, 0)]), rules).inputsHash, a);
  });
});
