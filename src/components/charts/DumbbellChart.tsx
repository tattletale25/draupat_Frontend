import type { GraphCategory, GraphSeries } from '../../types';

interface DumbbellChartProps {
  categories: GraphCategory[]; // one row per category (brand)
  series: GraphSeries[]; // expects series named "min" / "median" / "max"
  valueFormatter?: (v: number) => string;
}

const FALLBACK_COLORS = ['#aa3bff', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#ca8a04', '#64748b'];

function findSeries(series: GraphSeries[], name: string): GraphSeries | undefined {
  return series.find((s) => s.name.toLowerCase() === name);
}

/** Min -> max span with a median tick, one row per category (brand) — the
 * honest match for data that only has min/median/max (not real quartiles,
 * so not a box plot). This is the one chart in the set where brand color
 * is the legend, since each span literally IS a brand. */
export function DumbbellChart({ categories, series, valueFormatter = String }: DumbbellChartProps) {
  const minS = findSeries(series, 'min');
  const medianS = findSeries(series, 'median');
  const maxS = findSeries(series, 'max');
  if (categories.length === 0 || !minS || !maxS) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }

  const allValues = [...minS.values, ...maxS.values].filter((v): v is number => v !== null);
  const lo = allValues.length ? Math.min(...allValues) : 0;
  const hi = allValues.length ? Math.max(...allValues) : 1;
  const span = hi - lo || 1;
  const pct = (v: number) => ((v - lo) / span) * 100;

  return (
    <div className="dumbbell-wrap">
      {categories.map((cat, i) => {
        const min = minS.values[i];
        const max = maxS.values[i];
        const median = medianS?.values[i] ?? null;
        if (min === null || max === null) {
          return (
            <div className="dumbbell-row" key={cat.label}>
              <div className="dumbbell-label">{cat.label}</div>
              <div className="dumbbell-track" />
              <div className="dumbbell-value text-muted">—</div>
            </div>
          );
        }
        const color = cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
        return (
          <div className="dumbbell-row" key={cat.label}>
            <div className="dumbbell-label">{cat.label}</div>
            <div className="dumbbell-track">
              <div
                className="dumbbell-span"
                style={{
                  left: `${pct(min)}%`,
                  width: `${Math.max(0.5, pct(max) - pct(min))}%`,
                  background: color,
                }}
              />
              {median !== null && (
                <div className="dumbbell-median" style={{ left: `${pct(median)}%`, background: color }} />
              )}
            </div>
            <div className="dumbbell-value">
              {valueFormatter(min)} – {valueFormatter(max)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
