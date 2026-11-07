import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { availableYears, enactedRules, getRules, InvalidRulesError, progressiveTax, RulesNotConfirmedError, validateRules } from '../src/index.ts';

describe('rules loader', () => {
  it('loads enacted YA 2025/26 with the IRD figures', () => {
    const r = getRules('2025/2026');
    assert.equal(r.reliefs.personal.amount, 1_800_000);
    assert.deepEqual(
      r.progressiveRates.bands.map((b) => [b.upTo, b.rate]),
      [[1_000_000, 0.06], [1_500_000, 0.18], [2_000_000, 0.24], [2_500_000, 0.3], [null, 0.36]],
    );
    assert.equal(r.withholding.interestResident.rate, 0.1);
    assert.equal(r.withholding.interestResident.final, false);
  });

  it('refuses a year with no confirmed rules', () => {
    assert.throws(() => getRules('2026/2027'), RulesNotConfirmedError);
    assert.deepEqual(availableYears(), ['2025/2026']);
  });

  it('refuses well-formed but proposed rules', () => {
    const proposed = { ...getRules('2025/2026'), status: 'proposed' };
    assert.equal(validateRules(proposed, '2025/2026').status, 'proposed');
    assert.throws(() => enactedRules(proposed, '2025/2026'), /status is "proposed"/);
  });

  it('rejects malformed band tables', () => {
    const base = getRules('2025/2026');
    const withBands = (bands: unknown) => ({ ...base, progressiveRates: { ...base.progressiveRates, bands } });
    assert.throws(() => validateRules(withBands([]), '2025/2026'), InvalidRulesError);
    assert.throws(() => validateRules(withBands([{ upTo: 100, rate: 0.1 }]), '2025/2026'), /last band/);
    assert.throws(
      () => validateRules(withBands([{ upTo: 100, rate: 0.1 }, { upTo: 50, rate: 0.2 }, { upTo: null, rate: 0.3 }]), '2025/2026'),
      /must increase/,
    );
    assert.throws(() => validateRules(withBands([{ upTo: null, rate: 1.5 }]), '2025/2026'), /rate out of range/);
  });

  it('rejects a year label mismatch', () => {
    assert.throws(() => validateRules(getRules('2025/2026'), '2024/2025'), InvalidRulesError);
  });
});

describe('progressiveTax', () => {
  const bands = getRules('2025/2026').progressiveRates.bands;
  it('zero taxable income gives no lines', () => {
    assert.deepEqual(progressiveTax(0, bands), { total: 0, lines: [] });
  });
  it('splits exactly at band edges', () => {
    const { lines } = progressiveTax(1_500_000, bands);
    assert.deepEqual(lines.map((l) => [l.from, l.to, l.tax]), [[0, 1_000_000, 60_000], [1_000_000, 1_500_000, 90_000]]);
  });
});
