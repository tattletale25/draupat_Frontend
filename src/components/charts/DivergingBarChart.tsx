import type { GraphCategory, GraphSeries } from '../../types';

interface DivergingBarChartProps {
  categories: GraphCategory[]; // one row per category (brand)
  series: GraphSeries[]; // primary (first) series is what's plotted
  baseline?: number | null;
  valueFormatter?: (v: number) => string;
}

/** One bar per category, centered on `baseline` (e.g. 1.0 for the pricing
 * positioning index) — the direct visual match for "is this above or
 * below a reference point," per the dataviz spec. Below-baseline and
 * above-baseline get distinct hues; the baseline itself is a neutral
 * center line, not a color, so direction reads before magnitude does. */
export function DivergingBarChart({
  categories,
  series,
  baseline = 0,
  valueFormatter = String,
}: DivergingBarChartProps) {
  const primary = series[0];
  if (categories.length === 0 || !primary) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }

  const base = baseline ?? 0;
  const deviations = primary.values.map((v) => (v === null ? 0 : Math.abs(v - base)));
  const maxDev = Math.max(1e-6, ...deviations);

  return (
    <div className="diverging-bar-wrap">
      {categories.map((cat, i) => {
        const v = primary.values[i];
        const dev = v === null ? 0 : v - base;
        const pct = Math.min(50, (Math.abs(dev) / maxDev) * 50); // half-track = 50%
        const isAbove = dev > 0;
        return (
          <div className="diverging-bar-row" key={cat.label}>
            <div className="diverging-bar-label">{cat.label}</div>
            <div className="diverging-bar-track">
              <div className="diverging-bar-baseline" />
              <div
                className="diverging-bar-fill"
                data-direction={isAbove ? 'above' : 'below'}
                style={{ width: `${pct}%`, left: isAbove ? '50%' : `${50 - pct}%` }}
              />
            </div>
            <div className="diverging-bar-value">{v === null ? '—' : valueFormatter(v)}</div>
          </div>
        );
      })}
    </div>
  );
}
