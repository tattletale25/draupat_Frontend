import { Badge } from '../ui/Badge';
import type { GraphCategory, GraphSeries } from '../../types';

interface StatTileRowProps {
  categories: GraphCategory[]; // one tile per category (brand)
  series: GraphSeries[]; // every series is shown on each tile
  preliminary?: boolean;
  valueFormatter?: (v: number) => string;
}

const FALLBACK_COLORS = ['#aa3bff', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#ca8a04', '#64748b'];

/** One KPI tile per category (brand), showing EVERY named series — not
 * just the first. A plain bar chart here would visually imply more
 * confidence than a day-over-day delta supports, per the dataviz spec, so
 * this stays a stat tile row with an explicit "preliminary" badge instead
 * of committing to a trend visual before there's enough real history
 * (driven by whether the backend actually sends any caveats for this
 * metric — see GraphRenderer's `preliminary` prop, not a hardcoded count
 * of days here). */
export function StatTileRow({ categories, series, preliminary, valueFormatter = String }: StatTileRowProps) {
  if (categories.length === 0 || series.length === 0) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }
  return (
    <div className="kpi-grid">
      {categories.map((cat, i) => (
        <div className="card kpi-card stat-tile" key={cat.label}>
          <div className="stat-tile-head">
            <span className="kpi-label" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span
                className="chart-legend-swatch"
                style={{ background: cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length], marginRight: 6 }}
              />
              {cat.label}
            </span>
            {preliminary && <Badge variant="outline">preliminary</Badge>}
          </div>
          {series.map((s) => {
            const v = s.values[i];
            return (
              <div className="stat-tile-line" key={s.name}>
                <span className="text-muted">{s.name}</span>
                <strong>{v === null || v === undefined ? '—' : valueFormatter(v)}</strong>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
