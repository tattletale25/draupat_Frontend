import { useMemo, useState } from 'react';
import { CATEGORIES } from '../../types';
import type { Category, Company, PriceTrendPoint } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Tabs } from '../ui/Tabs';
import { LineChart } from '../charts/LineChart';
import { CATEGORY_LABELS } from '../../data/constants';
import { formatDate, formatINR, formatMonthYear } from '../../lib/utils';
import { Legend } from './CategoryPriceDistributionChart';

interface Props {
  trend: PriceTrendPoint[];
  companies: Company[];
}

type Granularity = 'daily' | 'monthly';

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
];

/** Category-level average price trend per competitor — answers "SKU price
 * fluctuation history" at the category level (category averages, not
 * every individual SKU). Daily is the raw per-scrape granularity; monthly
 * averages those daily points together, for once there's enough history
 * that a daily line gets too dense to read.
 *
 * A brand can be missing a data point for a given date/month (that
 * scrape failed, or hadn't started yet, or a category had zero in-stock
 * SKUs) — those slots are left as `null`, not defaulted to 0, so the line
 * breaks/gaps there instead of plotting a fake price crash. */
export function PriceTrendChart({ trend, companies }: Props) {
  const [category, setCategory] = useState<Category>('rings');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const labels = useMemo(() => {
    const keys = new Set(
      trend.filter((t) => t.category === category).map((t) => (granularity === 'monthly' ? t.date.slice(0, 7) : t.date)),
    );
    return Array.from(keys).sort();
  }, [trend, category, granularity]);

  const series = useMemo(
    () =>
      companies.map((c) => {
        const buckets = new Map<string, { sum: number; count: number }>();
        trend
          .filter((t) => t.siteCode === c.siteCode && t.category === category)
          .forEach((t) => {
            const key = granularity === 'monthly' ? t.date.slice(0, 7) : t.date;
            const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
            bucket.sum += t.avgPrice;
            bucket.count += 1;
            buckets.set(key, bucket);
          });
        return {
          key: c.siteCode,
          label: c.brandName,
          color: c.color,
          values: labels.map((key) => {
            const bucket = buckets.get(key);
            return bucket ? bucket.sum / bucket.count : null;
          }),
        };
      }),
    [companies, trend, category, granularity, labels],
  );

  return (
    <Card>
      <CardHeader className="row">
        <div>
          <CardTitle>Price fluctuation history</CardTitle>
          <CardDescription>Average price by category, over time</CardDescription>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Tabs value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <LineChart
          labels={labels}
          series={series}
          valueFormatter={(v) => formatINR(v, { compact: true })}
          labelFormatter={granularity === 'monthly' ? formatMonthYear : formatDate}
        />
        <Legend companies={companies} />
      </CardContent>
    </Card>
  );
}
