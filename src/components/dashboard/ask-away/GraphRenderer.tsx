import type { GraphSpec } from '../../../types';
import { formatINR, formatNumber } from '../../../lib/utils';
import { BarChart } from '../../charts/BarChart';
import { LineChart } from '../../charts/LineChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../ui/Table';

// Fallback palette for series/categories the backend didn't assign a color
// to (e.g. price bands, materials) — same values as constants.ts:CHART_HEX,
// reused here since a GraphSpec can describe axes that aren't brands at all.
const FALLBACK_COLORS = ['#aa3bff', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#ca8a04', '#64748b'];

function colorAt(explicit: string | null, index: number): string {
  return explicit ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatValue(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined) return '—';
  if (unit.toLowerCase() === 'inr' || unit === '₹') return formatINR(v, { compact: true });
  if (unit === '%') return `${v.toFixed(1)}%`;
  return formatNumber(v);
}

function formatCell(v: string | number | boolean | null): string {
  if (v === null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return formatNumber(v);
  return v;
}

/** Renders one GraphSpec (see src/types/index.ts) — the same shape every
 * /metrics/* endpoint and the NL-query agent's POST /query both return.
 * Dispatches purely on `chartType`; `facets` (small multiples) recurse
 * before that dispatch even runs, since a faceted spec's own xAxis/yAxis
 * are left empty in favor of its children. */
export function GraphRenderer({ graph }: { graph: GraphSpec }) {
  if (!graph.applicable) return null;

  if (graph.facets.length > 0) {
    return (
      <div className="graph-facets">
        {graph.facets.map((facet, i) => (
          <div key={`${facet.title}-${i}`} className="graph-facet">
            <div className="graph-facet-title">{facet.title}</div>
            <GraphRenderer graph={facet} />
          </div>
        ))}
      </div>
    );
  }

  const categories = graph.xAxis.categories;
  const series = graph.yAxis.series;

  switch (graph.chartType) {
    case 'line':
      return (
        <LineChart
          labels={categories.map((c) => c.label)}
          series={series.map((s, i) => ({
            key: s.name,
            label: s.name,
            color: colorAt(s.color, i),
            values: s.values.map((v) => v ?? 0),
          }))}
          valueFormatter={(v) => formatValue(v, graph.unit)}
        />
      );

    case 'table':
      if (!graph.table) return <div className="chart-empty">No table data.</div>;
      return (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                {graph.table.columns.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {graph.table.rows.map((row, i) => (
                <TableRow key={i}>
                  {graph.table!.columns.map((c) => (
                    <TableCell key={c.key}>{formatCell(row[c.key])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      );

    case 'meter':
    case 'stat': {
      const primary = series[0];
      if (!primary) return <div className="chart-empty">No data.</div>;
      const target = graph.target ?? Math.max(1, ...primary.values.map((v) => v ?? 0));
      return (
        <div className="meter-row">
          {categories.map((cat, i) => {
            const value = primary.values[i];
            const pct = value === null || value === undefined ? 0 : Math.min(100, (value / target) * 100);
            return (
              <div className="meter-item" key={cat.label}>
                <div className="meter-item-head">
                  <span>{cat.label}</span>
                  <strong>{formatValue(value, graph.unit)}</strong>
                </div>
                {graph.chartType === 'meter' && (
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: `${pct}%`, background: colorAt(cat.color, i) }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // bar / stacked_bar / heatmap / diverging_bar / dumbbell — all share the
    // same "categories x named series" grid shape; a grouped bar chart is an
    // honest, general-purpose rendering for all five without needing a
    // bespoke heatmap-grid or dumbbell-span visual for a first pass.
    default:
      return (
        <>
          <BarChart
            groups={categories.map((c) => c.label)}
            series={series.map((s, i) => ({
              key: s.name,
              label: s.name,
              color: colorAt(s.color, i),
              values: s.values.map((v) => v ?? 0),
            }))}
            valueFormatter={(v) => formatValue(v, graph.unit)}
          />
          {graph.baseline !== null && (
            <div className="graph-baseline-note">Baseline: {formatValue(graph.baseline, graph.unit)}</div>
          )}
        </>
      );
  }
}
