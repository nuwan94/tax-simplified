/** Where a confirmed figure came from. */
export interface Source {
  docId?: string;
  page?: number;
  method: 'parsed' | 'manual';
}

/** One employer's annual figures (from the APIT certificate). Whole rupees. */
export interface EmploymentInput {
  id: string;
  employerName: string;
  isPrimary: boolean;
  gross: number;
  apit: number;
  source: Source;
}

/** One bank / finance company interest certificate. Whole rupees. */
export interface InterestInput {
  id: string;
  institution: string;
  accountLast4?: string;
  gross: number;
  ait: number;
  source: Source;
}

export interface CalculationInput {
  ya: string;
  employments: EmploymentInput[];
  interests: InterestInput[];
}

export interface TraceLine {
  /** Stable key for i18n and tests. */
  key: string;
  /** English label; UI translates via `key`. */
  label: string;
  amount: number;
  formula?: string;
  ruleRef?: string;
  inputIds?: string[];
}

export type WarningCode =
  | 'AIT_RATE_MISMATCH'
  | 'APIT_EXCEEDS_GROSS'
  | 'AIT_EXCEEDS_GROSS'
  | 'NO_PRIMARY_EMPLOYER'
  | 'MULTIPLE_PRIMARY_EMPLOYERS'
  | 'NO_INCOME';

export interface Warning {
  code: WarningCode;
  inputId?: string;
  message: string;
}

export type Outcome = 'payable' | 'refund' | 'nil';

export interface CalculationResult {
  ya: string;
  rulesVersion: string;
  inputsHash: string;
  employmentIncome: number;
  interestIncome: number;
  assessable: number;
  relief: number;
  taxable: number;
  tax: number;
  credits: {
    apitPrimary: number;
    apitSecondary: number;
    ait: number;
    total: number;
  };
  /** Positive = owed to IRD, negative = refund due. */
  balance: number;
  outcome: Outcome;
  trace: TraceLine[];
  warnings: Warning[];
}
