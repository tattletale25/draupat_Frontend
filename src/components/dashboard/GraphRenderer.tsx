import type { GraphSpec } from '../../types';
import { formatINR, formatNumber } from '../../lib/utils';
import { BarChart } from '../charts/BarChart';
import { LineChart } from '../charts/LineChart';
import { Heatmap } from '../charts/Heatmap';
import { StackedBarChart } from '../charts/StackedBarChart';
import { DivergingBarChart } from '../charts/DivergingBarChart';
import { DumbbellChart } from '../charts/DumbbellChart';
import { MeterRow } from '../charts/MeterRow';
import { StatTileRow } from '../charts/StatTileRow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../ui/Table';

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

interface GraphRendererProps {
  graph: GraphSpec;
  /** Shown as a badge on every stat tile — set by callers that know a
   * metric's own caveats (e.g. "n=2 days") mark it as not-yet-trustworthy.
   * GraphRenderer itself never sees caveats (they live on MetricResponse,
   * one level up), so this stays an explicit opt-in per call site. */
  preliminary?: boolean;
}

/** Renders one GraphSpec (see src/types/index.ts) — the same shape every
 * /metrics/* endpoint and the NL-query agent's POST /query both return.
 * Dispatches purely on `chartType`; `facets` (small multiples) recurse
 * before that dispatch even runs, since a faceted spec's own xAxis/yAxis
 * are left empty in favor of its children. */
export function GraphRenderer({ graph, preliminary }: GraphRendererProps) {
  if (!graph.applicable) return null;

  if (graph.facets.length > 0) {
    return (
      <div className="graph-facets">
        {graph.facets.map((facet, i) => (
          <div key={`${facet.title}-${i}`} className="graph-facet">
            <div className="graph-facet-title">{facet.title}</div>
            <GraphRenderer graph={facet} preliminary={preliminary} />
          </div>
        ))}
      </div>
    );
  }

  const categories = graph.xAxis.categories;
  const series = graph.yAxis.series;
  const valueFormatter = (v: number) => formatValue(v, graph.unit);

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
          valueFormatter={valueFormatter}
        />
      );

    case 'bar':
      return (
        <BarChart
          groups={categories.map((c) => c.label)}
          series={series.map((s, i) => ({
            key: s.name,
            label: s.name,
            color: colorAt(s.color, i),
            values: s.values.map((v) => v ?? 0),
          }))}
          valueFormatter={valueFormatter}
        />
      );

    case 'heatmap':
      return <Heatmap categories={categories} series={series} valueFormatter={valueFormatter} />;

    case 'stacked_bar':
      return <StackedBarChart categories={categories} series={series} valueFormatter={valueFormatter} />;

    case 'diverging_bar':
      return (
        <DivergingBarChart
          categories={categories}
          series={series}
          baseline={graph.baseline}
          valueFormatter={valueFormatter}
        />
      );

    case 'dumbbell':
      return <DumbbellChart categories={categories} series={series} valueFormatter={valueFormatter} />;

    case 'meter':
      return <MeterRow categories={categories} series={series} target={graph.target} valueFormatter={valueFormatter} />;

    case 'stat':
      return (
        <StatTileRow
          categories={categories}
          series={series}
          preliminary={preliminary}
          valueFormatter={valueFormatter}
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

    default:
      return <div className="chart-empty">No renderer for chart type "{graph.chartType}".</div>;
  }
}
