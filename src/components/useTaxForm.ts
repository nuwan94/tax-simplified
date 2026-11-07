'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  assessEligibility,
  calculate,
  confirmFilingObligation,
  getRules,
  type BusinessInput,
  type CalculationResult,
  type EmploymentInput,
  type FilingObligation,
  type InterestInput,
  type OutOfScopeReason,
} from '@/index';
import { parseAmount } from '@/lib/money';
import { computeReadiness } from '@/lib/readiness';

// Shared, design-independent state and logic for every calculator UI.

export const YA = '2025/2026';
export const rules = getRules(YA);

export type YesNo = boolean | null;

export interface Answers {
  resident: YesNo;
  hasOtherIncome: YesNo;
  hasOtherReliefs: YesNo;
  allEmployersDeductedApit: YesNo;
  hasIrdFile: YesNo;
}

export interface EmployerRow {
  key: string;
  name: string;
  gross: string;
  apit: string;
}

export interface InterestRow {
  key: string;
  name: string;
  gross: string;
  tax: string;
}

export interface BusinessRow {
  key: string;
  name: string;
  origin: 'local' | 'foreign';
  /** Foreign only: received in foreign currency through a Sri Lankan bank. */
  remitted: boolean;
  gross: string;
  expenses: string;
  tax: string;
}

export const QUESTIONS: { id: keyof Answers; text: string; help?: string }[] = [
  {
    id: 'resident',
    text: 'Were you resident in Sri Lanka for the year?',
    help: 'Usually yes if you were in Sri Lanka for 183 days or more between April 2025 and March 2026.',
  },
  {
    id: 'hasOtherIncome',
    text: 'Any income other than salary, bank interest or freelance work?',
    help: 'Rent, dividends, a salary from a foreign employer, or selling land or shares. Freelance income goes in Part D.',
  },
  {
    id: 'hasOtherReliefs',
    text: 'Claiming any relief besides the personal relief?',
    help: 'Solar panels, donations to the government, or other qualifying payments.',
  },
  {
    id: 'allEmployersDeductedApit',
    text: 'Did every employer operate APIT (PAYE) on your salary?',
    help: 'Answer yes if your salary was under Rs 150,000 a month and nothing was deducted because none was due.',
  },
  {
    id: 'hasIrdFile',
    text: 'Have you filed before, or has IRD opened a tax file for you?',
  },
];

export const OUT_OF_SCOPE_TEXT: Record<OutOfScopeReason, string> = {
  non_resident: 'Non-residents are taxed differently.',
  other_income: 'Other types of income need the Standard Return.',
  other_reliefs: 'Extra reliefs and qualifying payments need the Standard Return.',
};

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const fmt = (n: number) => n.toLocaleString('en-LK');

export function headlineLabel(r: CalculationResult): string {
  if (r.outcome === 'payable') return 'Balance tax payable';
  if (r.outcome === 'refund') return 'Refund due to you';
  return 'Nothing to pay';
}

/** Calendar days from today (Sri Lanka time) to `isoDate`: 0 = due today, negative = passed. */
export function daysUntil(isoDate: string, today: Date): number {
  const colomboToday = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }); // YYYY-MM-DD
  return Math.round((Date.parse(isoDate) - Date.parse(colomboToday)) / 86_400_000);
}

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });

function parseRows(
  employers: EmployerRow[],
  interests: InterestRow[],
  businessRows: BusinessRow[],
  instalments: string,
) {
  const errors: Record<string, string> = {};
  const num = (key: string, raw: string): number => {
    const p = parseAmount(raw);
    if ('error' in p) {
      errors[key] = p.error;
      return 0;
    }
    return 'empty' in p ? 0 : p.value;
  };
  const filled = (...xs: string[]) => xs.some((x) => x.trim() !== '');

  const emp: EmploymentInput[] = employers
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => filled(r.gross, r.apit))
    .map(({ r, i }) => ({
      id: r.key,
      employerName: r.name.trim() || `Employer ${i + 1}`,
      isPrimary: i === 0,
      gross: num(`${r.key}.gross`, r.gross),
      apit: num(`${r.key}.apit`, r.apit),
      source: { method: 'manual' as const },
    }));

  const int: InterestInput[] = interests
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => filled(r.gross, r.tax))
    .map(({ r, i }) => ({
      id: r.key,
      institution: r.name.trim() || `Bank ${i + 1}`,
      gross: num(`${r.key}.gross`, r.gross),
      ait: num(`${r.key}.tax`, r.tax),
      source: { method: 'manual' as const },
    }));

  const biz: BusinessInput[] = businessRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => filled(r.gross, r.expenses, r.tax))
    .map(({ r, i }) => ({
      id: r.key,
      description: r.name.trim() || `Freelance income ${i + 1}`,
      origin: r.origin,
      remittedViaBank: r.origin === 'foreign' && r.remitted,
      gross: num(`${r.key}.gross`, r.gross),
      expenses: num(`${r.key}.expenses`, r.expenses),
      taxDeducted: num(`${r.key}.tax`, r.tax),
      source: { method: 'manual' as const },
    }));

  const instalmentsPaid = num('instalments', instalments);

  return { emp, int, biz, instalmentsPaid, errors };
}

export const newBusinessRow = (key: string): BusinessRow => ({
  key,
  name: '',
  origin: 'foreign',
  remitted: true,
  gross: '',
  expenses: '',
  tax: '',
});

export function useTaxForm() {
  const [answers, setAnswers] = useState<Answers>({
    resident: null,
    hasOtherIncome: null,
    hasOtherReliefs: null,
    allEmployersDeductedApit: null,
    hasIrdFile: null,
  });
  const [employers, setEmployers] = useState<EmployerRow[]>([{ key: 'e1', name: '', gross: '', apit: '' }]);
  const [interests, setInterests] = useState<InterestRow[]>([{ key: 'i1', name: '', gross: '', tax: '' }]);
  const [businessRows, setBusinessRows] = useState<BusinessRow[]>([]);
  const [instalments, setInstalments] = useState('');
  const nextId = useRef(2);

  // Dates come from the viewer's clock, after hydration (pages are pre-rendered at build time).
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const { emp, int, biz, instalmentsPaid, errors } = useMemo(
    () => parseRows(employers, interests, businessRows, instalments),
    [employers, interests, businessRows, instalments],
  );
  const hasErrors = Object.keys(errors).length > 0;

  const result: CalculationResult | null = useMemo(() => {
    if (hasErrors || (emp.length === 0 && int.length === 0 && biz.length === 0)) return null;
    return calculate({ ya: YA, employments: emp, interests: int, businesses: biz, instalmentsPaid }, rules);
  }, [emp, int, biz, instalmentsPaid, hasErrors]);

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  const obligation: FilingObligation | null = useMemo(() => {
    if (!allAnswered) return null;
    const pre = assessEligibility({
      resident: answers.resident!,
      hasOtherIncome: answers.hasOtherIncome!,
      hasOtherReliefs: answers.hasOtherReliefs!,
      allEmployersDeductedApit: answers.allEmployersDeductedApit!,
      hasIrdFile: answers.hasIrdFile!,
      employerCount: emp.length,
      approxInterest: sum(int.map((i) => i.gross)),
      businessCount: biz.length,
    });
    if (pre.status === 'out_of_scope') return pre;
    if (!result) return null;
    return confirmFilingObligation(pre, result);
  }, [allAnswered, answers, emp, int, biz, result]);

  const outOfScope = obligation?.status === 'out_of_scope';
  const newKey = (prefix: string) => `${prefix}${nextId.current++}`;

  // "I had no bank interest": an explicit answer, so readiness can tell "none" from "not entered yet".
  const [noInterest, setNoInterestState] = useState(false);
  const setNoInterest = (on: boolean) => {
    setNoInterestState(on);
    if (on) setInterests([{ key: newKey('i'), name: '', gross: '', tax: '' }]);
  };

  const readiness = computeReadiness({
    answeredCount,
    totalQuestions: QUESTIONS.length,
    incomeEntered: emp.length + int.length + biz.length > 0,
    interestSettled: noInterest || int.length > 0,
    checksPassed: !!result && !hasErrors && result.warnings.length === 0,
    hasErrors,
  });

  return {
    answers,
    setAnswer: (id: keyof Answers, v: boolean) => setAnswers((a) => ({ ...a, [id]: v })),
    answeredCount,
    allAnswered,

    employers,
    updateEmployer: (key: string, patch: Partial<EmployerRow>) =>
      setEmployers((rs) => rs.map((x) => (x.key === key ? { ...x, ...patch } : x))),
    addEmployer: () => setEmployers((rs) => [...rs, { key: newKey('e'), name: '', gross: '', apit: '' }]),
    removeEmployer: (key: string) => setEmployers((rs) => rs.filter((x) => x.key !== key)),

    interests,
    updateInterest: (key: string, patch: Partial<InterestRow>) =>
      setInterests((rs) => rs.map((x) => (x.key === key ? { ...x, ...patch } : x))),
    addInterest: () => setInterests((rs) => [...rs, { key: newKey('i'), name: '', gross: '', tax: '' }]),
    removeInterest: (key: string) => setInterests((rs) => rs.filter((x) => x.key !== key)),

    noInterest,
    setNoInterest,

    businessRows,
    updateBusiness: (key: string, patch: Partial<BusinessRow>) =>
      setBusinessRows((rs) => rs.map((x) => (x.key === key ? { ...x, ...patch } : x))),
    addBusiness: () => setBusinessRows((rs) => [...rs, newBusinessRow(newKey('b'))]),
    removeBusiness: (key: string) => setBusinessRows((rs) => rs.filter((x) => x.key !== key)),

    instalments,
    setInstalments,

    emp,
    int,
    biz,
    errors,
    hasErrors,
    result,
    obligation,
    outOfScope,
    readiness,
    today,
  };
}

export type TaxForm = ReturnType<typeof useTaxForm>;
