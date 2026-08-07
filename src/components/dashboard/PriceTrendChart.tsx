import { useMemo, useState } from 'react';
import { CATEGORIES } from '../../types';
import type { Category, Company, PriceTrendPoint } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { LineChart } from '../charts/LineChart';
import { CATEGORY_LABELS } from '../../data/constants';
import { formatDate, formatINR } from '../../lib/utils';
import { Legend } from './CategoryPriceDistributionChart';

interface Props {
  trend: PriceTrendPoint[];
  companies: Company[];
}

/** Category-level average price trend per competitor, over the past ~6
 * months — answers "SKU price fluctuation history" at the category
 * level (see the price-history clarification: category averages, not
 * every individual SKU). */
export function PriceTrendChart({ trend, companies }: Props) {
  const [category, setCategory] = useState<Category>('rings');

  const labels = useMemo(() => {
    const dates = new Set(trend.filter((t) => t.category === category).map((t) => t.date));
    return Array.from(dates).sort();
  }, [trend, category]);

  const series = companies.map((c) => ({
    key: c.siteCode,
    label: c.brandName,
    color: c.color,
    values: labels.map((date) => {
      const point = trend.find((t) => t.siteCode === c.siteCode && t.category === category && t.date === date);
      return point?.avgPrice ?? 0;
    }),
  }));

  return (
    <Card>
      <CardHeader className="row">
        <div>
          <CardTitle>Price fluctuation history</CardTitle>
          <CardDescription>Weekly average price, past ~6 months, by category</CardDescription>
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </Select>
      </CardHeader>
      <CardContent>
        <LineChart
          labels={labels}
          series={series}
          valueFormatter={(v) => formatINR(v, { compact: true })}
          labelFormatter={formatDate}
        />
        <Legend companies={companies} />
      </CardContent>
    </Card>
  );
}
