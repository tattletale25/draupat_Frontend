import type { CategorySummary } from '../../types';
import { Card } from '../ui/Card';
import { formatINR, formatNumber, formatPct } from '../../lib/utils';

interface SummaryCardsProps {
  summaries: CategorySummary[];
  companyCount: number;
}

export function SummaryCards({ summaries, companyCount }: SummaryCardsProps) {
  const totalSkus = summaries.reduce((s, r) => s + r.skuCount, 0);
  const totalInStock = summaries.reduce((s, r) => s + r.skuCountInStock, 0);
  const weightedAvgPrice =
    summaries.reduce((s, r) => s + r.avgPrice * r.skuCount, 0) / (totalSkus || 1);
  const weightedDiscount =
    summaries.reduce((s, r) => s + r.avgDiscountPct * r.skuCount, 0) / (totalSkus || 1);

  const cards = [
    { label: 'Competitors compared', value: String(companyCount), sub: `${summaries.length} category rows` },
    { label: 'Total live SKUs', value: formatNumber(totalSkus), sub: `${formatNumber(totalInStock)} in stock` },
    { label: 'Avg. price (weighted)', value: formatINR(weightedAvgPrice, { compact: true }), sub: 'Across selected competitors' },
    { label: 'Avg. discount depth', value: formatPct(weightedDiscount), sub: 'Off list price, all SKUs' },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <Card key={c.label} className="kpi-card">
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
        </Card>
      ))}
    </div>
  );
}
