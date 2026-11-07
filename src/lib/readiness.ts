export interface ReadinessItem {
  id: 'situation' | 'income' | 'interest' | 'checks';
  label: string;
  detail: string;
  done: boolean;
}

/**
 * How complete the information is — never how much tax. Each of four items is worth 25%;
 * the situation questions earn partial credit as they are answered.
 */
export function computeReadiness(s: {
  answeredCount: number;
  totalQuestions: number;
  incomeEntered: boolean;
  interestSettled: boolean;
  checksPassed: boolean;
  hasErrors: boolean;
}): { percent: number; items: ReadinessItem[] } {
  const total = s.totalQuestions;
  const items: ReadinessItem[] = [
    {
      id: 'situation',
      label: 'Your situation',
      detail: `${s.answeredCount} of ${total} questions answered`,
      done: s.answeredCount === total,
    },
    {
      id: 'income',
      label: 'Income figures',
      detail: s.incomeEntered ? 'Entered' : 'Add salary or interest',
      done: s.incomeEntered,
    },
    {
      id: 'interest',
      label: 'Bank interest',
      detail: s.interestSettled ? 'Entered or confirmed none' : 'Enter it, or tick "no bank interest"',
      done: s.interestSettled,
    },
    {
      id: 'checks',
      label: 'Figures check out',
      detail: s.hasErrors ? 'Fix highlighted amounts' : s.checksPassed ? 'No warnings' : 'Review any warnings',
      done: s.checksPassed,
    },
  ];
  const percent = Math.round(
    (s.answeredCount / total) * 25 + items.slice(1).filter((i) => i.done).length * 25,
  );
  return { percent, items };
}

