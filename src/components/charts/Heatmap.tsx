import { Fragment } from 'react';
import type { GraphCategory, GraphSeries } from '../../types';

interface HeatmapProps {
  categories: GraphCategory[]; // columns
  series: GraphSeries[]; // rows
  valueFormatter?: (v: number) => string;
}

/** Brand x category (or category x brand) magnitude grid — single-hue
 * sequential shading scaled by the min/max across the WHOLE grid, not
 * per-row, so cell shade stays comparable across every row. Used for SKU
 * count, discount depth/breadth, and the availability by-category
 * drill-down — the same visual grammar reused across all of them on
 * purpose (see the dataviz spec: one grid language, not four). */
export function Heatmap({ categories, series, valueFormatter = String }: HeatmapProps) {
  if (categories.length === 0 || series.length === 0) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }

  const allValues = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const span = max - min || 1;

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-grid" style={{ gridTemplateColumns: `140px repeat(${categories.length}, 1fr)` }}>
        <div className="heatmap-corner" />
        {categories.map((c) => (
          <div key={c.label} className="heatmap-col-label">
            {c.label}
          </div>
        ))}
        {series.map((s) => (
          <Fragment key={s.name}>
            <div className="heatmap-row-label">{s.name}</div>
            {categories.map((c, i) => {
              const v = s.values[i] ?? null;
              const alpha = v === null ? 0 : 0.1 + 0.8 * ((v - min) / span);
              return (
                <div
                  key={c.label}
                  className="heatmap-cell"
                  data-dark={alpha > 0.55}
                  style={{ background: v === null ? 'var(--muted)' : `rgba(var(--sequential-rgb), ${alpha})` }}
                  title={`${s.name} · ${c.label}`}
                >
                  {v === null ? '—' : valueFormatter(v)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
