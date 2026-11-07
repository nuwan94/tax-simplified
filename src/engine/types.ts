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

/**
 * Freelance or business income (Schedule 2) from one client, platform or line of work.
 * Rupee amounts are what was credited in LKR.
 */
export interface BusinessInput {
  id: string;
  description: string;
  /** Where the client is: local clients may deduct 5% WHT; foreign income can get the 15% cap. */
  origin: 'local' | 'foreign';
  /** Foreign only: received in foreign currency and brought in through a licensed Sri Lankan bank. */
  remittedViaBank: boolean;
  gross: number;
  /** Expenses incurred in earning this income (business income only). */
  expenses: number;
  /**
   * Local: WHT/AIT deducted by the client (a credit).
   * Foreign: tax paid abroad (foreign tax credit, limited and non-refundable).
   */
  taxDeducted: number;
  source: Source;
}

export interface CalculationInput {
  ya: string;
  employments: EmploymentInput[];
  interests: InterestInput[];
  businesses?: BusinessInput[];
  /** Quarterly instalments already paid for this year of assessment. */
  instalmentsPaid?: number;
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
  | 'NO_INCOME'
  | 'BUSINESS_LOSS'
  | 'FOREIGN_TAX_NOT_CREDITED'
  | 'FOREIGN_TAX_CREDIT_LIMITED'
  | 'NOT_REMITTED';

export interface Warning {
  code: WarningCode;
  inputId?: string;
  message: string;
}

export type Outcome = 'payable' | 'refund' | 'nil';

/** A slice of taxable income on the band ladder. `kind: 'foreign'` slices are rate-capped. */
export interface TaxBand {
  kind: 'normal' | 'foreign';
  from: number;
  to: number;
  amount: number;
  rate: number;
  tax: number;
}

export interface CalculationResult {
  ya: string;
  rulesVersion: string;
  inputsHash: string;
  /** Simplified Return covers employment + interest only; anything else needs the Standard Return. */
  returnType: 'simplified' | 'standard';
  employmentIncome: number;
  interestIncome: number;
  /** Net freelance/business income (after expenses), all origins. */
  businessIncome: number;
  /** Foreign income received through a bank: taxed at no more than the cap. */
  concessionaryIncome: number;
  assessable: number;
  relief: number;
  taxable: number;
  tax: number;
  bands: TaxBand[];
  credits: {
    apitPrimary: number;
    apitSecondary: number;
    ait: number;
    serviceWht: number;
    foreignTaxCredit: number;
    instalments: number;
    total: number;
  };
  /** Positive = owed to IRD, negative = refund due. */
  balance: number;
  outcome: Outcome;
  /** Present when some foreign income wasn't brought in through a bank: tax saved had it been. */
  remittanceSaving?: number;
  trace: TraceLine[];
  warnings: Warning[];
}
