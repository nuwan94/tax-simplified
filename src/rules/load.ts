import type { Band, Rules } from './types.ts';
import ya202526 from '../../rules/ya-2025-26.json' with { type: 'json' };

/** Raised when there are no confirmed (enacted) rules for the requested year. */
export class RulesNotConfirmedError extends Error {
  readonly ya: string;
  constructor(ya: string, reason: string) {
    super(`Rules for YA ${ya} aren't confirmed yet: ${reason}`);
    this.name = 'RulesNotConfirmedError';
    this.ya = ya;
  }
}

/** Raised when a rules file is malformed. This is a build/data bug, never a user error. */
export class InvalidRulesError extends Error {
  constructor(ya: string, problem: string) {
    super(`Rules file for YA ${ya} is invalid: ${problem}`);
    this.name = 'InvalidRulesError';
  }
}

const registry: Record<string, unknown> = {
  '2025/2026': ya202526,
};

export function availableYears(): string[] {
  return Object.keys(registry);
}

/**
 * Returns validated, enacted rules for a year of assessment ("2025/2026").
 * Refuses proposed or missing years: the app must never compute on unconfirmed rules.
 */
export function getRules(ya: string): Rules {
  const raw = registry[ya];
  if (raw === undefined) {
    throw new RulesNotConfirmedError(ya, 'no rules file');
  }
  return enactedRules(raw, ya);
}

/** Validates a raw rules object and refuses it unless it is enacted. */
export function enactedRules(raw: unknown, ya: string): Rules {
  const rules = validateRules(raw, ya);
  if (rules.status !== 'enacted') {
    throw new RulesNotConfirmedError(ya, `status is "${rules.status}"`);
  }
  return rules;
}

export function rulesVersion(rules: Rules): string {
  return `${rules.yearOfAssessment}@${rules.verifiedOn}`;
}

/** Structural validation of the fields the engine depends on. */
export function validateRules(raw: unknown, ya: string): Rules {
  const fail = (p: string): never => {
    throw new InvalidRulesError(ya, p);
  };
  if (typeof raw !== 'object' || raw === null) fail('not an object');
  const r = raw as Rules;

  if (r.yearOfAssessment !== ya) fail(`yearOfAssessment is "${r.yearOfAssessment}"`);
  if (r.status !== 'enacted' && r.status !== 'proposed') fail('status must be enacted|proposed');

  const relief = r.reliefs?.personal?.amount;
  if (!isNonNegativeInt(relief)) fail('reliefs.personal.amount must be a non-negative integer');

  validateBands(r.progressiveRates?.bands, fail);

  const wht = r.withholding?.interestResident?.rate;
  if (typeof wht !== 'number' || wht < 0 || wht >= 1) fail('withholding.interestResident.rate must be in [0,1)');

  return r;
}

function validateBands(bands: Band[] | undefined, fail: (p: string) => never): void {
  if (!Array.isArray(bands) || bands.length === 0) fail('progressiveRates.bands must be a non-empty array');
  const list = bands as Band[];
  let prev = 0;
  list.forEach((b, i) => {
    const last = i === list.length - 1;
    if (typeof b.rate !== 'number' || b.rate < 0 || b.rate >= 1) fail(`band ${i} rate out of range`);
    if (last) {
      if (b.upTo !== null) fail('last band must have upTo: null');
    } else {
      if (!isNonNegativeInt(b.upTo) || (b.upTo as number) <= prev) fail(`band ${i} upTo must increase`);
      prev = b.upTo as number;
    }
  });
}

function isNonNegativeInt(n: unknown): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}
