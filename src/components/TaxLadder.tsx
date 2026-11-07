import type { CalculationResult, Rules } from '@/index';

/** Sequential ramp: higher rate = darker. Relief and capped foreign income get their own colours. */
const RATE_CLASS: Record<string, string> = { '0.06': 'b1', '0.18': 'b2', '0.24': 'b3', '0.3': 'b4', '0.36': 'b5' };

const fmt = (n: number) => n.toLocaleString('en-LK');
const pct = (r: number) => `${Math.round(r * 100)}%`;

/** How the year's income splits into the tax-free allowance and each rate band (from the engine's bands). */
export function TaxLadder({ result, rules }: { result: CalculationResult; rules: Rules }) {
  if (result.assessable === 0) return null;
  const width = (n: number) => `${(n / result.assessable) * 100}%`;
  const cls = (b: CalculationResult['bands'][number]) =>
    b.kind === 'foreign' ? 'fx' : (RATE_CLASS[String(b.rate)] ?? 'b5');
  const name = (b: CalculationResult['bands'][number]) =>
    b.kind === 'foreign' ? `Foreign income at ${pct(b.rate)}` : `At ${pct(b.rate)}`;
  const label = `Tax-free ${fmt(result.relief)}` + result.bands.map((b) => `, ${name(b)} on ${fmt(b.amount)}`).join('');

  return (
    <figure className="ladder">
      <figcaption>
        <span className="ladder-title">Income by tax band</span>
        <span className="ladder-note">
          {result.taxable === 0
            ? `All of your income is within the Rs ${fmt(rules.reliefs.personal.amount)} tax-free allowance.`
            : result.concessionaryIncome > 0
              ? `Local income fills the lower bands; foreign income sits on top, capped at ${pct(rules.foreignSourceIncome.maxRate)}.`
              : 'Each slice of income is taxed at its own rate.'}
        </span>
      </figcaption>
      <div className="ladder-bar" role="img" aria-label={label}>
        <span className="relief" style={{ width: width(result.relief) }} />
        {result.bands.map((b, i) => (
          <span key={i} className={cls(b)} style={{ width: width(b.amount) }} />
        ))}
      </div>
      <table className="ladder-table">
        <thead>
          <tr>
            <th scope="col">Band</th>
            <th scope="col">Income (Rs)</th>
            <th scope="col">Tax (Rs)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              <i className="relief" aria-hidden="true" />
              Tax-free allowance
            </th>
            <td>{fmt(result.relief)}</td>
            <td>0</td>
          </tr>
          {result.bands.map((b, i) => (
            <tr key={i}>
              <th scope="row">
                <i className={cls(b)} aria-hidden="true" />
                {name(b)}
              </th>
              <td>{fmt(b.amount)}</td>
              <td>{fmt(b.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
