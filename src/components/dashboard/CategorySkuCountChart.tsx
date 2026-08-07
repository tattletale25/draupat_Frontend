import { CATEGORIES } from '../../types';
import type { CategorySummary, Company } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { BarChart } from '../charts/BarChart';
import { CATEGORY_LABELS } from '../../data/constants';
import { formatNumber } from '../../lib/utils';
import { Legend } from './CategoryPriceDistributionChart';

interface Props {
  summaries: CategorySummary[];
  companies: Company[];
}

/** Category-wise SKU count — how many live SKUs each competitor carries
 * per category, side by side. */
export function CategorySkuCountChart({ summaries, companies }: Props) {
  const series = companies.map((c) => ({
    key: c.siteCode,
    label: c.brandName,
    color: c.color,
    values: CATEGORIES.map((cat) => {
      const row = summaries.find((s) => s.siteCode === c.siteCode && s.category === cat);
      return row?.skuCount ?? 0;
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category-wise SKU count</CardTitle>
        <CardDescription>Live catalog breadth by category, per competitor</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart groups={CATEGORIES.map((c) => CATEGORY_LABELS[c])} series={series} valueFormatter={formatNumber} />
        <Legend companies={companies} />
      </CardContent>
    </Card>
  );
}
