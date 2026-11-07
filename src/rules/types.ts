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
  withholding: {
    interestResident: { rate: number; final: boolean; source: string };
  };
  filing: { deadline: string };
  payments: { final: { due: string } };
}
