import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeReadiness } from '../src/lib/readiness.ts';

const base = {
  answeredCount: 0,
  totalQuestions: 5,
  incomeEntered: false,
  interestSettled: false,
  checksPassed: false,
  hasErrors: false,
};

describe('computeReadiness', () => {
  it('starts at 0%', () => {
    assert.equal(computeReadiness(base).percent, 0);
  });

  it('gives partial credit for answered questions', () => {
    assert.equal(computeReadiness({ ...base, answeredCount: 2 }).percent, 10);
  });

  it('reaches 100% only when everything is complete and checks pass', () => {
    const all = { ...base, answeredCount: 5, incomeEntered: true, interestSettled: true };
    assert.equal(computeReadiness(all).percent, 75);
    const r = computeReadiness({ ...all, checksPassed: true });
    assert.equal(r.percent, 100);
    assert.ok(r.items.every((i) => i.done));
  });

  it('explains what is missing', () => {
    const r = computeReadiness({ ...base, hasErrors: true });
    assert.match(r.items.find((i) => i.id === 'checks')!.detail, /Fix highlighted/);
    assert.match(r.items.find((i) => i.id === 'interest')!.detail, /no bank interest/);
  });
});
