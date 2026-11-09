export type Parsed = { value: number } | { error: string } | { empty: true };

/**
 * Parses a rupee amount for the tax calculation: "1,200,000", "Rs 1,234,567.89", " 50 000 ".
 * Cents are accepted (up to 2 decimals) and rounded to the nearest rupee, as the computation is in whole rupees.
 */
export function parseAmount(raw: string): Parsed {
  const p = parseCents(raw);
  if (!('value' in p)) return p;
  const n = Math.round(p.value);
  if (!Number.isSafeInteger(n)) return { error: 'Amount is too large' };
  return { value: n };
}

/** Parses a payslip amount, which may have cents: "250,000.00", "Rs 1,250.5". */
export function parseCents(raw: string): Parsed {
  const s = raw.replace(/[\s,]/g, '').replace(/^rs\.?/i, '');
  if (s === '') return { empty: true };
  if (!/^\d+(\.\d{0,2})?$/.test(s))
    return { error: /^\d+\.\d{3,}$/.test(s) ? 'Use at most 2 decimals' : 'Enter a number' };
  const n = Number(s);
  if (!Number.isFinite(n) || n > Number.MAX_SAFE_INTEGER) return { error: 'Amount is too large' };
  return { value: n };
}

export function formatLKR(n: number): string {
  return `Rs ${Math.abs(n).toLocaleString('en-LK')}`;
}

/** Signed amount for working tables: deductions in brackets, as on IRD computations. */
export function formatSigned(n: number): string {
  const v = Math.abs(n).toLocaleString('en-LK');
  return n < 0 ? `(${v})` : v;
}
