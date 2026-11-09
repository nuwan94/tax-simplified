import type { CalculationInput, EmploymentInput, InterestInput } from '../src/index.ts';

const manual = { method: 'manual' } as const;

export function job(gross: number, apit: number, opts: Partial<EmploymentInput> = {}): EmploymentInput {
  return {
    id: opts.id ?? `emp-${gross}-${apit}`,
    employerName: 'Employer',
    isPrimary: true,
    gross,
    apit,
    source: manual,
    ...opts,
  };
}

export function fd(gross: number, ait: number, opts: Partial<InterestInput> = {}): InterestInput {
  return { id: opts.id ?? `int-${gross}-${ait}`, institution: 'Bank', gross, ait, source: manual, ...opts };
}

export function input(employments: EmploymentInput[], interests: InterestInput[] = []): CalculationInput {
  return { ya: '2025/2026', employments, interests };
}
