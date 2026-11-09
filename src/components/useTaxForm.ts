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
import { parseAmount, parseCents } from '@/lib/money';
import { peggedSplit, summarizeMonths, type PayMonth } from '@/lib/payslips';
import { convertMonthly, getFxRates, parseForeignAmount, yaMonths, type Conversion } from '@/lib/fx';
import { addableSections, visibleSections, type ProfileId, type Section } from '@/lib/profiles';
import type { TopicId } from './explainers';

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

/** One month of a payslip. Blank fields are worked out where possible. */
export interface PayRow {
  usd: string;
  basic: string;
  allowance: string;
  regular: string;
  extra: string;
  apit: string;
}

export interface EmployerRow {
  key: string;
  name: string;
  /** What the person has in hand: the yearly T-10 certificate, or monthly payslips. */
  source: 't10' | 'payslips';
  // T-10: yearly totals
  gross: string;
  apit: string;
  // payslips
  pegged: boolean;
  /** Rupees per US dollar used for the basic salary (often 200). */
  peg: string;
  /** Usual month: US dollars when pegged, otherwise rupees. Used by "Fill all months". */
  usual: string;
  months: Record<string, PayRow>;
}

export const emptyPayRow = (): PayRow => ({ usd: '', basic: '', allowance: '', regular: '', extra: '', apit: '' });

export const newEmployerRow = (key: string, source: EmployerRow['source'] = 'payslips'): EmployerRow => ({
  key,
  name: '',
  source,
  gross: '',
  apit: '',
  pegged: false,
  peg: '200',
  usual: '',
  months: {},
});

export type PaySummary = ReturnType<typeof summarizeMonths>;

/** Everything needed to restore the form for one person. */
export interface SavedForm {
  v: 1;
  profile: ProfileId | null;
  extra: Section[];
  answers: Answers;
  employers: EmployerRow[];
  interests: InterestRow[];
  businessRows: BusinessRow[];
  instalments: string;
  noInterest: boolean;
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
  /** Enter the income in rupees, or in US dollars month by month (converted at CBSL monthly averages). */
  currency: 'LKR' | 'USD';
  gross: string;
  /** USD mode: amount received per month, keyed "YYYY-MM". */
  monthly: Record<string, string>;
  expenses: string;
  tax: string;
}

export const usdRates = getFxRates('USD', YA);
export const MONTHS = yaMonths(YA);

export const QUESTIONS: { id: keyof Answers; text: string; hint: TopicId }[] = [
  {
    id: 'resident',
    text: 'Were you resident in Sri Lanka for the year?',
    hint: 'resident',
  },
  {
    id: 'hasOtherIncome',
    text: 'Any income other than salary, bank interest or freelance work?',
    hint: 'otherIncome',
  },
  {
    id: 'hasOtherReliefs',
    text: 'Claiming any relief besides the personal relief?',
    hint: 'reliefs',
  },
  {
    id: 'allEmployersDeductedApit',
    text: 'Did every employer deduct APIT?',
    hint: 'apit',
  },
  {
    id: 'hasIrdFile',
    text: 'Have you filed before, or has IRD opened a tax file for you?',
    hint: 'irdFile',
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

  const cents = (key: string, raw: string): number | undefined => {
    const p = parseCents(raw);
    if ('error' in p) {
      errors[key] = p.error;
      return undefined;
    }
    return 'empty' in p ? undefined : p.value;
  };

  // Payslips: add up the months, working out blanks (pegged split, APIT from the tables).
  const payslips: Record<string, PaySummary> = {};
  employers.forEach((r, i) => {
    if (r.source !== 'payslips') return;
    const peg = r.pegged ? (cents(`${r.key}.peg`, r.peg) ?? 0) : 0;
    const months: PayMonth[] = [];
    for (const m of MONTHS) {
      const row = r.months[m];
      if (!row || !filled(...Object.values(row))) continue;
      const k = (f: string) => `${r.key}.p.${m}.${f}`;
      const extra = cents(k('extra'), row.extra) ?? 0;
      const apit = cents(k('apit'), row.apit);
      let regular = 0;
      let regularEstimated = false;
      if (r.pegged) {
        const usd = cents(k('usd'), row.usd) ?? 0;
        const auto = peggedSplit(usd, peg, usdRates.monthly[m]?.average ?? peg);
        const basic = cents(k('basic'), row.basic) ?? auto.basic;
        const allowance = cents(k('allowance'), row.allowance);
        regularEstimated = allowance === undefined && auto.allowance > 0;
        regular = basic + (allowance ?? auto.allowance);
      } else {
        regular = cents(k('regular'), row.regular) ?? 0;
      }
      months.push({ month: m, regular, extra, apit, regularEstimated });
    }
    // APIT can only be estimated for the main job; other employers use different tables.
    payslips[r.key] = summarizeMonths(months, payRules, i === 0);
  });

  const emp: EmploymentInput[] = employers
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (r.source === 'payslips' ? (payslips[r.key]?.rows.length ?? 0) > 0 : filled(r.gross, r.apit)))
    .map(({ r, i }) => {
      const p = payslips[r.key];
      return {
        id: r.key,
        employerName: r.name.trim() || `Employer ${i + 1}`,
        isPrimary: i === 0,
        gross: p ? Math.round(p.gross) : num(`${r.key}.gross`, r.gross),
        apit: p ? Math.round(p.apit) : num(`${r.key}.apit`, r.apit),
        source: { method: 'manual' as const },
      };
    });

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

  // USD rows: convert each month at the CBSL monthly average.
  const conversions: Record<string, Conversion> = {};
  for (const r of businessRows) {
    if (r.currency !== 'USD') continue;
    const amounts: Record<string, number> = {};
    for (const m of MONTHS) {
      const p = parseForeignAmount(r.monthly[m] ?? '');
      if ('error' in p) errors[`${r.key}.m.${m}`] = p.error;
      else if ('value' in p) amounts[m] = p.value;
    }
    conversions[r.key] = convertMonthly(amounts, usdRates);
  }

  const biz: BusinessInput[] = businessRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) =>
      r.currency === 'USD'
        ? filled(...Object.values(r.monthly), r.expenses, r.tax)
        : filled(r.gross, r.expenses, r.tax),
    )
    .map(({ r, i }) => {
      const conv = conversions[r.key];
      return {
        id: r.key,
        description: r.name.trim() || `Freelance income ${i + 1}`,
        origin: r.origin,
        remittedViaBank: r.origin === 'foreign' && r.remitted,
        gross: conv ? conv.totalLkr : num(`${r.key}.gross`, r.gross),
        expenses: num(`${r.key}.expenses`, r.expenses),
        taxDeducted: num(`${r.key}.tax`, r.tax),
        ...(conv && conv.totalForeign > 0
          ? { foreign: { currency: 'USD', amount: conv.totalForeign, basis: 'cbsl-monthly-average' as const } }
          : {}),
        source: { method: 'manual' as const },
      };
    });

  const instalmentsPaid = num('instalments', instalments);

  return { emp, int, biz, instalmentsPaid, conversions, payslips, errors };
}

export const newBusinessRow = (key: string): BusinessRow => ({
  key,
  name: '',
  origin: 'foreign',
  remitted: true,
  currency: 'USD',
  gross: '',
  monthly: {},
  expenses: '',
  tax: '',
});

export const payRules = { relief: rules.reliefs.personal.amount, bands: rules.progressiveRates.bands };

const BLANK_ANSWERS: Answers = {
  resident: null,
  hasOtherIncome: null,
  hasOtherReliefs: null,
  allEmployersDeductedApit: null,
  hasIrdFile: null,
};

/** Accepts saved data from any earlier version; anything unrecognised falls back to a blank form. */
function restore(raw: unknown): SavedForm {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<SavedForm>;
  const employers = Array.isArray(d.employers) && d.employers.length ? d.employers : [newEmployerRow('e1')];
  return {
    v: 1,
    profile: d.profile ?? null,
    extra: Array.isArray(d.extra) ? d.extra : [],
    answers: { ...BLANK_ANSWERS, ...(d.answers ?? {}) },
    employers: employers.map((e) => ({ ...newEmployerRow(e.key, e.gross || e.apit ? 't10' : 'payslips'), ...e })),
    interests:
      Array.isArray(d.interests) && d.interests.length ? d.interests : [{ key: 'i1', name: '', gross: '', tax: '' }],
    businessRows: Array.isArray(d.businessRows) ? d.businessRows.map((b) => ({ ...newBusinessRow(b.key), ...b })) : [],
    instalments: d.instalments ?? '',
    noInterest: !!d.noInterest,
  };
}

/** Next free number for row keys like "e3", "b12". */
function nextKeyNumber(f: SavedForm): number {
  const keys = [...f.employers, ...f.interests, ...f.businessRows].map((x) => Number(x.key.replace(/^\D+/, '')) || 0);
  return Math.max(1, ...keys) + 1;
}

export function useTaxForm(initial?: unknown, onSave?: (data: SavedForm) => void) {
  const [init] = useState(() => restore(initial));
  const [answers, setAnswers] = useState<Answers>(init.answers);
  const [employers, setEmployers] = useState<EmployerRow[]>(init.employers);
  const [interests, setInterests] = useState<InterestRow[]>(init.interests);
  const [businessRows, setBusinessRows] = useState<BusinessRow[]>(init.businessRows);
  const [instalments, setInstalments] = useState(init.instalments);
  const nextId = useRef(nextKeyNumber(init));

  // Profile: which sections are on the page. Hidden sections are left out of the calculation.
  const [profile, setProfileState] = useState<ProfileId | null>(init.profile);
  const [extra, setExtra] = useState<Section[]>(init.extra);
  const sections = visibleSections(profile, extra);
  const has = (x: Section) => sections.includes(x);

  // Dates come from the viewer's clock, after hydration (pages are pre-rendered at build time).
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const showSalary = has('salary');
  const showInterest = has('interest');
  const showFreelance = has('freelance');
  const showPaid = has('paid');
  const { emp, int, biz, instalmentsPaid, conversions, payslips, errors } = useMemo(
    () =>
      parseRows(
        showSalary ? employers : [],
        showInterest ? interests : [],
        showFreelance ? businessRows : [],
        showPaid ? instalments : '',
      ),
    [employers, interests, businessRows, instalments, showSalary, showInterest, showFreelance, showPaid],
  );
  const hasErrors = Object.keys(errors).length > 0;

  const result: CalculationResult | null = useMemo(() => {
    if (hasErrors || (emp.length === 0 && int.length === 0 && biz.length === 0)) return null;
    return calculate({ ya: YA, employments: emp, interests: int, businesses: biz, instalmentsPaid }, rules);
  }, [emp, int, biz, instalmentsPaid, hasErrors]);

  // The APIT question only matters when there is a salary section.
  const questions = QUESTIONS.filter((q) => q.id !== 'allEmployersDeductedApit' || showSalary);
  const answeredCount = questions.filter((q) => answers[q.id] !== null).length;
  const allAnswered = answeredCount === questions.length;

  const obligation: FilingObligation | null = useMemo(() => {
    if (!allAnswered) return null;
    const pre = assessEligibility({
      resident: answers.resident!,
      hasOtherIncome: answers.hasOtherIncome!,
      hasOtherReliefs: answers.hasOtherReliefs!,
      allEmployersDeductedApit: showSalary ? answers.allEmployersDeductedApit! : true,
      hasIrdFile: answers.hasIrdFile!,
      employerCount: emp.length,
      approxInterest: sum(int.map((i) => i.gross)),
      businessCount: biz.length,
    });
    if (pre.status === 'out_of_scope') return pre;
    if (!result) return null;
    return confirmFilingObligation(pre, result);
  }, [allAnswered, answers, emp, int, biz, result, showSalary]);

  const outOfScope = obligation?.status === 'out_of_scope';
  const newKey = (prefix: string) => `${prefix}${nextId.current++}`;

  // "No bank interest": an explicit answer, so "none" differs from "not entered yet".
  const [noInterest, setNoInterestState] = useState(init.noInterest);
  const setNoInterest = (on: boolean) => {
    setNoInterestState(on);
    if (on) setInterests([{ key: newKey('i'), name: '', gross: '', tax: '' }]);
  };

  // Save after each change (debounced). Skips the first render, which is the restored state.
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(
      () =>
        saveRef.current?.({
          v: 1,
          profile,
          extra,
          answers,
          employers,
          interests,
          businessRows,
          instalments,
          noInterest,
        }),
      400,
    );
    return () => clearTimeout(t);
  }, [profile, extra, answers, employers, interests, businessRows, instalments, noInterest]);

  const apitEstimatedMonths = Object.values(payslips).reduce((n, p) => n + p.estimatedApitMonths, 0);

  const setProfile = (id: ProfileId) => {
    setProfileState(id);
    // start freelancers with one entry ready to fill
    if (visibleSections(id, extra).includes('freelance') && businessRows.length === 0)
      setBusinessRows([newBusinessRow(newKey('b'))]);
  };
  const addSection = (x: Section) => {
    setExtra((e) => (e.includes(x) ? e : [...e, x]));
    if (x === 'freelance' && businessRows.length === 0) setBusinessRows([newBusinessRow(newKey('b'))]);
  };

  return {
    profile,
    setProfile,
    sections,
    addable: addableSections(profile, extra),
    addSection,
    isExtra: (x: Section) => extra.includes(x) && !visibleSections(profile).includes(x),
    removeSection: (x: Section) => setExtra((e) => e.filter((y) => y !== x)),
    questions,

    answers,
    setAnswer: (id: keyof Answers, v: boolean) => setAnswers((a) => ({ ...a, [id]: v })),
    answeredCount,
    allAnswered,

    employers,
    updateEmployer: (key: string, patch: Partial<EmployerRow>) =>
      setEmployers((rs) => rs.map((x) => (x.key === key ? { ...x, ...patch } : x))),
    addEmployer: () => setEmployers((rs) => [...rs, newEmployerRow(newKey('e'))]),
    /** Update one month's payslip fields. */
    updatePayMonth: (key: string, month: string, patch: Partial<PayRow>) =>
      setEmployers((rs) =>
        rs.map((x) =>
          x.key === key
            ? { ...x, months: { ...x.months, [month]: { ...emptyPayRow(), ...x.months[month], ...patch } } }
            : x,
        ),
      ),
    /** Copy one month's regular pay into later months that have no regular pay yet. */
    copyPayDown: (key: string, month: string) =>
      setEmployers((rs) =>
        rs.map((x) => {
          if (x.key !== key) return x;
          const src = x.months[month];
          if (!src) return x;
          const months = { ...x.months };
          for (const m of MONTHS.filter((m) => m > month)) {
            const cur = { ...emptyPayRow(), ...months[m] };
            if (x.pegged ? cur.usd || cur.basic : cur.regular) continue;
            months[m] = x.pegged
              ? { ...cur, usd: src.usd, basic: src.basic, allowance: '' }
              : { ...cur, regular: src.regular };
          }
          return { ...x, months };
        }),
      ),
    /** Put the usual monthly amount into every month that is still empty. */
    fillAllMonths: (key: string) =>
      setEmployers((rs) =>
        rs.map((x) => {
          if (x.key !== key || !x.usual.trim()) return x;
          const months = { ...x.months };
          for (const m of MONTHS) {
            const cur = { ...emptyPayRow(), ...months[m] };
            if (x.pegged ? cur.usd || cur.basic : cur.regular) continue;
            months[m] = x.pegged ? { ...cur, usd: x.usual } : { ...cur, regular: x.usual };
          }
          return { ...x, months };
        }),
      ),
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
    conversions,
    payslips,
    apitEstimatedMonths,
    errors,
    hasErrors,
    result,
    obligation,
    outOfScope,
    today,
  };
}

export type TaxForm = ReturnType<typeof useTaxForm>;
