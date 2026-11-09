import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatLKR, formatSigned, parseAmount, parseCents } from '../src/lib/money.ts';

describe('parseAmount', () => {
  it('accepts common ways of typing rupees', () => {
    for (const s of ['1200000', '1,200,000', ' 1 200 000 ', 'Rs 1,200,000', 'rs.1200000', '1200000.00']) {
      assert.deepEqual(parseAmount(s), { value: 1_200_000 }, s);
    }
  });
  it('treats blank as empty', () => {
    assert.deepEqual(parseAmount('  '), { empty: true });
  });
  it('rejects cents, negatives and text', () => {
    assert.ok('error' in parseAmount('100.50'));
    assert.ok('error' in parseAmount('-100'));
    assert.ok('error' in parseAmount('abc'));
    assert.ok('error' in parseAmount('99999999999999999999'));
  });
});

describe('formatting', () => {
  it('formats rupees with grouping', () => {
    assert.equal(formatLKR(1_220_000), 'Rs 1,220,000');
    assert.equal(formatLKR(-30_000), 'Rs 30,000');
    assert.equal(formatSigned(-1_800_000), '(1,800,000)');
    assert.equal(formatSigned(99_600), '99,600');
  });
});

describe('parseCents', () => {
  it('accepts payslip amounts with cents', () => {
    assert.deepEqual(parseCents('250,000.00'), { value: 250000 });
    assert.deepEqual(parseCents('Rs 1,250.5'), { value: 1250.5 });
    assert.deepEqual(parseCents(' '), { empty: true });
  });
  it('rejects text and more than 2 decimals', () => {
    assert.ok('error' in parseCents('1.234'));
    assert.ok('error' in parseCents('abc'));
  });
});
