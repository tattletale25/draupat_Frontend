import { CATEGORIES } from '../../../types';
import type { Company, TopOfFeedShareRow } from '../../../types';
import { CATEGORY_LABELS } from '../../../data/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card';
import { BarChart, type BarSeries } from '../../charts/BarChart';
import { NotTrackedNotice } from './NotTrackedNotice';

interface Props {
  companies: Company[];
  rows: TopOfFeedShareRow[];
}

/** % of each brand's SKUs sitting in the top decile of on-page shelf
 * position, per category — how concentrated vs. flat its merchandising is. */
export function TopOfFeedShareTab({ companies, rows }: Props) {
  const supported = companies.filter((c) => c.capabilities.categoryRankScore);
  const unsupported = companies.filter((c) => !c.capabilities.categoryRankScore);

  const series: BarSeries[] = supported.map((c) => ({
    key: c.siteCode,
    label: c.brandName,
    color: c.color,
    values: CATEGORIES.map(
      (cat) => rows.find((r) => r.siteCode === c.siteCode && r.category === cat)?.pctTopDecile ?? 0,
    ),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top-of-feed share</CardTitle>
        <CardDescription>
          % of each brand's SKUs sitting in the top decile of on-page shelf position, by category.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unsupported.length > 0 && (
          <div className="not-tracked-list">
            {unsupported.map((c) => (
              <NotTrackedNotice
                key={c.siteCode}
                brandName={c.brandName}
                reason="Depends on Category Rank Score, which this site can't populate."
              />
            ))}
          </div>
        )}
        <BarChart
          groups={CATEGORIES.map((c) => CATEGORY_LABELS[c])}
          series={series}
          valueFormatter={(v) => `${v.toFixed(0)}%`}
        />
        {series.length > 0 && (
          <div className="chart-legend">
            {series.map((s) => (
              <span key={s.key} className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: s.color }} /> {s.label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
