import type { GraphCategory, GraphSeries } from '../../types';

interface StackedBarChartProps {
  categories: GraphCategory[]; // one horizontal bar per category (brand)
  series: GraphSeries[]; // stacked segments, IN ORDER (e.g. entry -> mid -> premium -> unknown)
  valueFormatter?: (v: number) => string;
}

const UNKNOWN_COLOR = 'var(--border)';

/** Horizontal 100%-stacked bar, one per category. Segments use a single
 * light->dark sequential ramp keyed by series ORDER, not per-brand hue —
 * price band (entry/mid/premium) is an ordered scale, so one ramp reads
 * correctly at a glance instead of requiring a legend lookup. A series
 * literally named "unknown" is drawn flat neutral gray and excluded from
 * the ramp's spacing, since it isn't part of the ordered scale. */
export function StackedBarChart({ categories, series, valueFormatter = String }: StackedBarChartProps) {
  if (categories.length === 0 || series.length === 0) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }

  const rampSeries = series.filter((s) => s.name.toLowerCase() !== 'unknown');
  const rampColor = (name: string) => {
    if (name.toLowerCase() === 'unknown') return UNKNOWN_COLOR;
    const idx = rampSeries.findIndex((s) => s.name === name);
    const t = rampSeries.length > 1 ? idx / (rampSeries.length - 1) : 0;
    return `rgba(var(--sequential-rgb), ${0.25 + 0.55 * t})`;
  };

  return (
    <div className="stacked-bar-wrap">
      {categories.map((cat, ci) => {
        const values = series.map((s) => s.values[ci] ?? 0);
        const total = values.reduce((sum, v) => sum + v, 0) || 1;
        return (
          <div className="stacked-bar-row" key={cat.label}>
            <div className="stacked-bar-label">{cat.label}</div>
            <div className="stacked-bar-track">
              {series.map((s, si) => {
                const v = values[si];
                if (v <= 0) return null;
                return (
                  <div
                    key={s.name}
                    className="stacked-bar-segment"
                    style={{ width: `${(v / total) * 100}%`, background: rampColor(s.name) }}
                    title={`${cat.label} · ${s.name}: ${valueFormatter(v)}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name} className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: rampColor(s.name) }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
