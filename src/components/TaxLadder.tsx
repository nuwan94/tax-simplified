import { progressiveTax, type CalculationResult, type Rules } from '@/index';

/** Sequential ramp: higher rate = darker. Relief uses a separate neutral-green. */
const BAND_CLASSES = ['b1', 'b2', 'b3', 'b4', 'b5'];

const fmt = (n: number) => n.toLocaleString('en-LK');

/** How the year's income splits into the tax-free allowance and each rate band. */
export function TaxLadder({ result, rules }: { result: CalculationResult; rules: Rules }) {
  if (result.assessable === 0) return null;
  const bands = progressiveTax(result.taxable, rules.progressiveRates.bands).lines;
  const pct = (n: number) => `${(n / result.assessable) * 100}%`;
  const label =
    `Tax-free ${fmt(result.relief)}` +
    bands.map((b) => `, ${Math.round(b.rate * 100)}% on ${fmt(b.amount)}`).join('');

  return (
    <figure className="ladder">
      <figcaption>
        <span className="ladder-title">Income by tax band</span>
        <span className="ladder-note">
          {result.taxable === 0
            ? `All of your income is within the Rs ${fmt(rules.reliefs.personal.amount)} tax-free allowance.`
            : 'Each slice of income is taxed at its own rate.'}
        </span>
      </figcaption>
      <div className="ladder-bar" role="img" aria-label={label}>
        <span className="relief" style={{ width: pct(result.relief) }} />
        {bands.map((b, i) => (
          <span key={i} className={BAND_CLASSES[i]} style={{ width: pct(b.amount) }} />
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
          {bands.map((b, i) => (
            <tr key={i}>
              <th scope="row">
                <i className={BAND_CLASSES[i]} aria-hidden="true" />
                At {Math.round(b.rate * 100)}%
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
