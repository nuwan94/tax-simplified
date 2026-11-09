import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRules } from '../src/index.ts';
import { faqs } from '../src/lib/faq.ts';

describe('questions and answers', () => {
  const list = faqs(getRules('2025/2026'));
  const answer = (start: string) => list.find((f) => f.q.startsWith(start))!.a;

  it('states the relief and rates from the rules', () => {
    assert.match(answer('How much income is tax-free'), /Rs 1,800,000 a year \(Rs 150,000 a month\)/);
    assert.equal(
      answer('What are the income tax rates'),
      'After the Rs 1,800,000 relief, income is taxed at 6% on the first Rs 1,000,000, 18% on the next Rs 500,000, 24% on the next Rs 500,000, 30% on the next Rs 500,000, 36% on the rest.',
    );
  });

  it('states the deadlines and the foreign income cap', () => {
    assert.match(answer('When is the 2025/26'), /30 November 2026.*30 September 2026/);
    assert.match(answer('How is freelance income'), /no more than 15%/);
  });
});
