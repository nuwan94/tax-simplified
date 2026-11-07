import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, getRules, InputError, type BusinessInput } from '../src/index.ts';
import { input, job } from './helpers.ts';

const rules = getRules('2025/2026');

function biz(origin: 'local' | 'foreign', gross: number, opts: Partial<BusinessInput> = {}): BusinessInput {
  return {
    id: opts.id ?? `${origin}-${gross}`,
    description: opts.description ?? (origin === 'local' ? 'Local client' : 'Foreign client'),
    origin,
    remittedViaBank: origin === 'foreign',
    gross,
    expenses: 0,
    taxDeducted: 0,
    source: { method: 'manual' },
    ...opts,
  };
}

describe('IRD guide Example 2 (Mr Chathura: local + foreign lecturing)', () => {
  // Local fees 5,000,000 with 5% AIT; foreign fees 9,000,000 remitted, 20% tax paid abroad;
  // instalments 400,000. Guide: local tax 672,000; foreign 1,350,000; balance 22,000.
  const r = calculate(
    {
      ...input([]),
      businesses: [
        biz('local', 5_000_000, { taxDeducted: 250_000 }),
        biz('foreign', 9_000_000, { taxDeducted: 1_800_000 }),
      ],
      instalmentsPaid: 400_000,
    },
    rules,
  );

  it('matches the guide line by line', () => {
    assert.equal(r.assessable, 14_000_000);
    assert.equal(r.taxable, 12_200_000);
    const normal = r.bands.filter((b) => b.kind === 'normal').map((b) => b.tax);
    assert.deepEqual(normal, [60_000, 90_000, 120_000, 150_000, 252_000]);
    const foreign = r.bands.filter((b) => b.kind === 'foreign');
    assert.deepEqual(
      foreign.map((b) => [b.amount, b.rate, b.tax]),
      [[9_000_000, 0.15, 1_350_000]],
    );
    assert.equal(r.tax, 2_022_000);
    assert.equal(r.credits.foreignTaxCredit, 1_350_000);
    assert.equal(r.credits.serviceWht, 250_000);
    assert.equal(r.credits.instalments, 400_000);
    assert.equal(r.balance, 22_000);
  });

  it('warns that excess foreign tax is not credited', () => {
    assert.ok(r.warnings.some((w) => w.code === 'FOREIGN_TAX_CREDIT_LIMITED'));
  });

  it('needs the Standard Return', () => {
    assert.equal(r.returnType, 'standard');
  });
});

describe('salary + freelance USD income', () => {
  const salary = () => [job(3_600_000, 222_000)];

  it('foreign income through a bank is taxed at 15% above the salary', () => {
    const r = calculate({ ...input(salary()), businesses: [biz('foreign', 3_000_000)] }, rules);
    assert.equal(r.tax, 672_000);
    assert.equal(r.balance, 450_000);
    // 24%, 30% and 36% bands are all capped to 15%, so they merge into one line
    assert.deepEqual(
      r.bands.filter((b) => b.kind === 'foreign').map((b) => [b.from, b.to, b.rate]),
      [[1_800_000, 4_800_000, 0.15]],
    );
    assert.equal(r.remittanceSaving, undefined);
  });

  it('expenses are deducted from business income', () => {
    const r = calculate({ ...input(salary()), businesses: [biz('foreign', 3_500_000, { expenses: 500_000 })] }, rules);
    assert.equal(r.businessIncome, 3_000_000);
    assert.equal(r.balance, 450_000);
    assert.match(r.trace.find((t) => t.key === 'business.foreign')!.formula!, /less expenses 500,000/);
  });

  it('not brought in through a bank: normal rates, and shows the saving', () => {
    const r = calculate(
      { ...input(salary()), businesses: [biz('foreign', 3_000_000, { remittedViaBank: false })] },
      rules,
    );
    // 200,000 × 24% + 500,000 × 30% + 2,300,000 × 36% = 1,026,000 on top of the salary's 222,000
    assert.equal(r.tax, 1_248_000);
    assert.equal(r.balance, 1_026_000);
    assert.equal(r.remittanceSaving, 576_000);
    assert.equal(r.concessionaryIncome, 0);
    assert.ok(r.warnings.some((w) => w.code === 'NOT_REMITTED'));
  });

  it('low salary: relief spills onto foreign income, which gets the 6% band first', () => {
    const r = calculate({ ...input([job(1_000_000, 0)]), businesses: [biz('foreign', 2_000_000)] }, rules);
    assert.equal(r.taxable, 1_200_000);
    // 1,000,000 × 6% + 200,000 × min(18%, 15%)
    assert.equal(r.tax, 90_000);
    assert.equal(r.relief, 1_800_000);
  });

  it('local freelance income is taxed at normal rates with 5% WHT credited', () => {
    const r = calculate({ ...input(salary()), businesses: [biz('local', 1_200_000, { taxDeducted: 60_000 })] }, rules);
    // 1,200,000 above 1,800,000 taxable: 200,000 × 24% + 500,000 × 30% + 500,000 × 36%
    assert.equal(r.tax, 222_000 + 48_000 + 150_000 + 180_000);
    assert.equal(r.credits.serviceWht, 60_000);
    assert.equal(
      r.bands.every((b) => b.kind === 'normal'),
      true,
    );
  });

  it('foreign tax credit is capped at the tax on foreign income', () => {
    const r = calculate(
      { ...input(salary()), businesses: [biz('foreign', 1_000_000, { taxDeducted: 300_000 })] },
      rules,
    );
    assert.equal(r.credits.foreignTaxCredit, 150_000);
    assert.equal(r.balance, 0);
  });

  it('a loss counts as zero and is flagged', () => {
    const r = calculate({ ...input(salary()), businesses: [biz('local', 100_000, { expenses: 150_000 })] }, rules);
    assert.equal(r.businessIncome, 0);
    assert.ok(r.warnings.some((w) => w.code === 'BUSINESS_LOSS'));
  });

  it('trace still balances with every credit type', () => {
    const r = calculate(
      {
        ...input(salary()),
        businesses: [
          biz('local', 500_000, { taxDeducted: 25_000 }),
          biz('foreign', 2_000_000, { taxDeducted: 100_000 }),
        ],
        instalmentsPaid: 50_000,
      },
      rules,
    );
    const get = (k: string) => r.trace.find((t) => t.key === k)!.amount;
    const credits = r.trace.filter((t) => t.key.startsWith('credit.')).reduce((s, t) => s + t.amount, 0);
    assert.equal(get('tax') + credits, get('balance'));
    const bandTax = r.trace.filter((t) => /^f?band\./.test(t.key)).reduce((s, t) => s + t.amount, 0);
    assert.equal(bandTax, get('tax'));
  });

  it('rejects bad business amounts', () => {
    assert.throws(() => calculate({ ...input([]), businesses: [biz('local', -5)] }, rules), InputError);
    assert.throws(() => calculate({ ...input([]), instalmentsPaid: 1.5 }, rules), InputError);
  });
});

describe('foreign income converted from USD', () => {
  it('shows the USD amount and conversion basis in the working', () => {
    const r = calculate(
      {
        ...input([job(3_600_000, 222_000)]),
        businesses: [
          biz('foreign', 3_050_000, { foreign: { currency: 'USD', amount: 10_000, basis: 'cbsl-monthly-average' } }),
        ],
      },
      rules,
    );
    assert.match(
      r.trace.find((t) => t.key === 'business.foreign')!.formula!,
      /USD 10,000 at CBSL monthly averages = Rs 3,050,000/,
    );
  });
});
