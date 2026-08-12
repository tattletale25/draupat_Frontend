import type { GraphCategory, GraphSeries } from '../../types';

interface MeterRowProps {
  categories: GraphCategory[]; // one meter per category (brand)
  series: GraphSeries[]; // primary (first) series is what's metered
  target?: number | null;
  valueFormatter?: (v: number) => string;
}

const FALLBACK_COLORS = ['#aa3bff', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#ca8a04', '#64748b'];

/** One filled track per category (brand) against a fixed ceiling
 * (`target`, e.g. 100 for a percentage) — reads faster than a bar when
 * the ceiling is known and fixed, per the dataviz spec's "single ratio
 * against a limit" case. */
export function MeterRow({ categories, series, target, valueFormatter = String }: MeterRowProps) {
  const primary = series[0];
  if (categories.length === 0 || !primary) {
    return <div className="chart-empty">No data.</div>;
  }
  const ceiling = target ?? Math.max(1, ...primary.values.map((v) => v ?? 0));
  return (
    <div className="meter-row">
      {categories.map((cat, i) => {
        const value = primary.values[i];
        const pct = value === null || value === undefined ? 0 : Math.min(100, (value / ceiling) * 100);
        const color = cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
        return (
          <div className="meter-item" key={cat.label}>
            <div className="meter-item-head">
              <span>{cat.label}</span>
              <strong>{value === null || value === undefined ? '—' : valueFormatter(value)}</strong>
            </div>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
