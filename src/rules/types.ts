/** A progressive band. `upTo` is the cumulative upper limit of the band; null = no limit (last band). */
export interface Band {
  upTo: number | null;
  rate: number;
}

/**
 * The subset of a year-of-assessment rules file that the engine relies on.
 * The JSON files carry more (sources, dates, cage maps); only these fields are validated.
 */
export interface Rules {
  yearOfAssessment: string;
  status: 'enacted' | 'proposed';
  verifiedOn: string;
  reliefs: {
    personal: { amount: number; source: string };
  };
  progressiveRates: {
    bands: Band[];
    source: string;
  };
  foreignSourceIncome: {
    /** Highest rate on foreign income received in foreign currency through a licensed bank. */
    maxRate: number;
    source: string;
  };
  withholding: {
    interestResident: { rate: number; final: boolean; source: string };
    serviceFeesResident: { rate: number; source: string };
  };
  filing: { deadline: string };
  payments: {
    instalments: { n: number; due: string; paymentCode: string }[];
    final: { due: string; paymentCode: string };
  };
}
