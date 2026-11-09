// Short answers to common questions, shown on the page and published as FAQPage structured data.
// Figures come from the verified rules file so the answers stay in step with the calculator.

import type { Rules } from '../rules/types.ts';

export interface Faq {
  q: string;
  a: string;
}

const rs = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;
const pct = (r: number) => `${Math.round(r * 100)}%`;
const day = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });

export function faqs(r: Rules): Faq[] {
  const relief = r.reliefs.personal.amount;
  const bands = r.progressiveRates.bands;
  let lower = 0;
  const steps = bands.map((b, i) => {
    const text =
      b.upTo === null
        ? `${pct(b.rate)} on the rest`
        : `${pct(b.rate)} on the ${i === 0 ? 'first' : 'next'} ${rs(b.upTo - lower)}`;
    lower = b.upTo ?? lower;
    return text;
  });
  const instalments = r.payments.instalments.map((i) => day(i.due).replace(/ \d{4}$/, '')).join(', ');

  return [
    {
      q: 'How much income is tax-free in Sri Lanka for 2025/26?',
      a: `Every resident gets a personal relief of ${rs(relief)} a year (${rs(relief / 12)} a month). Income up to that amount is not taxed.`,
    },
    {
      q: 'What are the income tax rates for 2025/26?',
      a: `After the ${rs(relief)} relief, income is taxed at ${steps.join(', ')}.`,
    },
    {
      q: 'How is freelance income from foreign clients taxed?',
      a: `Income from foreign clients that is received in foreign currency through a bank in Sri Lanka is taxed at no more than ${pct(r.foreignSourceIncome.maxRate)}. Money kept in Payoneer, Wise or a bank abroad is taxed at the normal rates.`,
    },
    {
      q: 'Is a salary pegged to US dollars taxed differently?',
      a: 'No. Both the basic salary at the peg rate and the variable allowance that tops it up to the market rate are employment income, and APIT is deducted on both.',
    },
    {
      q: 'Is bank interest taxed?',
      a: `Banks deduct ${pct(r.withholding.interestResident.rate)} advance income tax (AIT) from interest. For residents it is a credit against your tax, not a final tax, so you can claim it back if your tax is lower.`,
    },
    {
      q: 'When is the 2025/26 income tax return due?',
      a: `File by ${day(r.filing.deadline)} and pay any balance by ${day(r.payments.final.due)}. People with freelance or business income pay quarterly instalments on ${instalments}.`,
    },
    {
      q: 'Do I need to file a return if my employer deducts APIT?',
      a: 'Usually not, if your only income is salary fully taxed through APIT and nothing is owed or due back. You need to file if you have freelance or business income, a balance to pay, a refund to claim, or if IRD asks you to.',
    },
    {
      q: 'Does this calculator send my figures anywhere?',
      a: 'No. Everything is worked out in your browser and saved only on your device. Nothing is uploaded.',
    },
  ];
}
