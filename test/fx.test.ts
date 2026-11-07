import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertMonthly, getFxRates, monthLabel, parseForeignAmount, rateOn, yaMonths } from '../src/lib/fx.ts';

const usd = getFxRates('USD', '2025/2026');

describe('CBSL USD rates file', () => {
  it('has a monthly average for every month of YA 2025/26', () => {
    const months = yaMonths('2025/2026');
    assert.deepEqual(months[0], '2025-04');
    assert.deepEqual(months[11], '2026-03');
    for (const m of months) {
      const r = usd.monthly[m];
      assert.ok(r && r.average > 250 && r.average < 400 && r.days >= 15, m);
    }
  });

  it('monthly averages are the mean of that month’s daily rates', () => {
    for (const m of yaMonths('2025/2026')) {
      const days = Object.entries(usd.daily).filter(([d]) => d.startsWith(m));
      const mean = days.reduce((s, [, r]) => s + r, 0) / days.length;
      assert.equal(usd.monthly[m]!.average, Math.round(mean * 10_000) / 10_000, m);
      assert.equal(usd.monthly[m]!.days, days.length, m);
    }
  });

  it('cites CBSL and the Act', () => {
    assert.match(usd.source, /cbsl\.gov\.lk/);
    assert.match(usd.series, /CBSL/);
  });
});

describe('conversion', () => {
  it('converts each month at its own average and sums rupees', () => {
    const c = convertMonthly({ '2025-04': 1_000, '2026-03': 1_000 }, usd);
    assert.equal(c.lines.length, 2);
    assert.equal(c.lines[0]!.lkr, Math.round(1_000 * usd.monthly['2025-04']!.average));
    assert.equal(c.totalLkr, c.lines[0]!.lkr + c.lines[1]!.lkr);
    assert.equal(c.totalForeign, 2_000);
  });

  it('skips empty months and handles cents', () => {
    const c = convertMonthly({ '2025-05': 0, '2025-06': 100.55 }, usd);
    assert.deepEqual(
      c.lines.map((l) => l.month),
      ['2025-06'],
    );
    assert.equal(c.totalForeign, 100.55);
  });

  it('rejects a month outside the rates file', () => {
    assert.throws(() => convertMonthly({ '2024-12': 10 }, usd), /No USD rate/);
  });

  it('daily rate falls back to the previous business day', () => {
    const anyDay = Object.keys(usd.daily)[5]!;
    assert.equal(rateOn(anyDay, usd).rate, usd.daily[anyDay]);
    // 2025-04-05 was a Saturday: use Friday 2025-04-04 or earlier
    const sat = rateOn('2025-04-05', usd);
    assert.ok(sat.date < '2025-04-05');
  });
});

describe('parseForeignAmount', () => {
  it('accepts dollars with cents and prefixes', () => {
    for (const s of ['1250.5', '1,250.50', '$1250.50', 'USD 1,250.50']) {
      assert.ok('value' in parseForeignAmount(s), s);
    }
    assert.deepEqual(parseForeignAmount('1,250.50'), { value: 1250.5 });
  });
  it('rejects 3 decimals and text; blank is empty', () => {
    assert.ok('error' in parseForeignAmount('1.234'));
    assert.ok('error' in parseForeignAmount('abc'));
    assert.deepEqual(parseForeignAmount(' '), { empty: true });
  });
  it('labels months', () => {
    assert.equal(monthLabel('2026-01'), 'Jan 2026');
  });
});
