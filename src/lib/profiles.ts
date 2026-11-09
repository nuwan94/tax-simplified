// Income profiles: the first choice on the page. Each one shows only the sections that
// kind of taxpayer needs; anything else can be added back under "Something else?".

export type Section = 'salary' | 'freelance' | 'interest' | 'paid';
export type ProfileId = 'salaried' | 'mixed' | 'freelancer' | 'savings';

export interface Profile {
  id: ProfileId;
  title: string;
  sections: Section[];
}

export const PROFILES: Profile[] = [
  { id: 'salaried', title: 'Salaried', sections: ['salary', 'interest'] },
  {
    id: 'mixed',
    title: 'Salary + freelance',

    sections: ['salary', 'freelance', 'interest', 'paid'],
  },
  {
    id: 'freelancer',
    title: 'Freelancer',

    sections: ['freelance', 'interest', 'paid'],
  },
  { id: 'savings', title: 'Savings only', sections: ['interest'] },
];

/** Page order of the income sections. */
export const SECTION_ORDER: Section[] = ['salary', 'freelance', 'interest', 'paid'];

export const SECTION_LABEL: Record<Section, string> = {
  salary: 'Salary',
  freelance: 'Freelance or foreign income',
  interest: 'Bank interest',
  paid: 'Tax already paid',
};

/** Sections shown for a profile plus any the person added, in page order. */
export function visibleSections(profile: ProfileId | null, extra: readonly Section[] = []): Section[] {
  if (!profile) return [];
  const p = PROFILES.find((x) => x.id === profile)!;
  const on = new Set<Section>([...p.sections, ...extra]);
  return SECTION_ORDER.filter((s) => on.has(s));
}

/** Sections the person can still add under "Something else?". */
export function addableSections(profile: ProfileId | null, extra: readonly Section[] = []): Section[] {
  const shown = new Set(visibleSections(profile, extra));
  return profile ? SECTION_ORDER.filter((s) => !shown.has(s)) : [];
}
