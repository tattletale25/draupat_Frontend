import { useState } from 'react';
import { CATEGORIES } from '../../types';
import type { CategorySummary, Company } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { BarChart } from '../charts/BarChart';
import { CATEGORY_LABELS } from '../../data/constants';
import { formatINR } from '../../lib/utils';

interface Props {
  summaries: CategorySummary[];
  companies: Company[];
}

type Metric = 'avgPrice' | 'medianPrice' | 'minPrice' | 'maxPrice';

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'avgPrice', label: 'Average' },
  { value: 'medianPrice', label: 'Median' },
  { value: 'minPrice', label: 'Min' },
  { value: 'maxPrice', label: 'Max' },
];

/** Category-wise price distribution — grouped bars, one group per
 * category, one bar per competitor, switchable between average / median
 * / min / max list price. */
export function CategoryPriceDistributionChart({ summaries, companies }: Props) {
  const [metric, setMetric] = useState<Metric>('avgPrice');

  const series = companies.map((c) => ({
    key: c.siteCode,
    label: c.brandName,
    color: c.color,
    values: CATEGORIES.map((cat) => {
      const row = summaries.find((s) => s.siteCode === c.siteCode && s.category === cat);
      return row ? row[metric] : 0;
    }),
  }));

  return (
    <Card>
      <CardHeader className="row">
        <div>
          <CardTitle>Category-wise price distribution</CardTitle>
          <CardDescription>List price by category, per competitor</CardDescription>
        </div>
        <Tabs value={metric} onChange={setMetric} options={METRIC_OPTIONS} />
      </CardHeader>
      <CardContent>
        <BarChart
          groups={CATEGORIES.map((c) => CATEGORY_LABELS[c])}
          series={series}
          valueFormatter={(v) => formatINR(v, { compact: true })}
        />
        <Legend companies={companies} />
      </CardContent>
    </Card>
  );
}

export function Legend({ companies }: { companies: Company[] }) {
  return (
    <div className="chart-legend">
      {companies.map((c) => (
        <span key={c.siteCode} className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: c.color }} />
          {c.brandName}
        </span>
      ))}
    </div>
  );
}
