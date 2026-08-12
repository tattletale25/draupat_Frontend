import type { GraphSpec } from '../types';

function isSiteCodeAxis(labels: string[], allSiteCodes: string[]): boolean {
  if (labels.length === 0) return false;
  const known = new Set(allSiteCodes);
  return labels.every((l) => known.has(l));
}

/** Filters a GraphSpec (see src/types/index.ts) down to a chosen set of
 * brand site codes. Every /metrics/* endpoint puts "brand" on EITHER the
 * x-axis categories (e.g. price-band-mix, net-catalog-change: category =
 * site_code) OR the y-axis series (e.g. the sku-count/discount heatmaps:
 * series = site_code) depending on the metric — there's no single fixed
 * axis to filter. This detects which axis actually holds brand labels by
 * checking them against the full known site-code list, filters+realigns
 * values on that axis only, and leaves the other axis untouched. Recurses
 * into `facets` (small multiples), since each facet carries its own
 * x/y axes independently of its parent. */
export function filterGraphByCompanies(
  graph: GraphSpec,
  allSiteCodes: string[],
  selected: string[],
): GraphSpec {
  if (graph.facets.length > 0) {
    return { ...graph, facets: graph.facets.map((f) => filterGraphByCompanies(f, allSiteCodes, selected)) };
  }

  // Table specs (per-SKU drill-down) have no x/y axes to pivot — filter rows
  // directly by their own `site_code` column instead, when present.
  if (graph.table) {
    const hasSiteCode = graph.table.rows.length === 0 || 'site_code' in graph.table.rows[0];
    if (hasSiteCode) {
      return {
        ...graph,
        table: { ...graph.table, rows: graph.table.rows.filter((r) => selected.includes(String(r.site_code))) },
      };
    }
    return graph;
  }

  const categoryLabels = graph.xAxis.categories.map((c) => c.label);
  if (isSiteCodeAxis(categoryLabels, allSiteCodes)) {
    const keepIdx = graph.xAxis.categories
      .map((c, i) => (selected.includes(c.label) ? i : -1))
      .filter((i) => i !== -1);
    return {
      ...graph,
      xAxis: { ...graph.xAxis, categories: keepIdx.map((i) => graph.xAxis.categories[i]) },
      yAxis: {
        ...graph.yAxis,
        series: graph.yAxis.series.map((s) => ({ ...s, values: keepIdx.map((i) => s.values[i]) })),
      },
    };
  }

  const seriesNames = graph.yAxis.series.map((s) => s.name);
  if (isSiteCodeAxis(seriesNames, allSiteCodes)) {
    return {
      ...graph,
      yAxis: { ...graph.yAxis, series: graph.yAxis.series.filter((s) => selected.includes(s.name)) },
    };
  }

  return graph;
}

/** Reorders whichever axis holds brand labels so `siteCode` sorts last,
 * leaving every other brand in its existing relative order — e.g. moving
 * BlueStone to the end of every metrics-page chart/table. Same axis
 * detection as filterGraphByCompanies (brand sits on categories OR series
 * depending on the metric), same facet/table recursion. */
export function moveBrandToEnd(graph: GraphSpec, allSiteCodes: string[], siteCode: string): GraphSpec {
  if (graph.facets.length > 0) {
    return { ...graph, facets: graph.facets.map((f) => moveBrandToEnd(f, allSiteCodes, siteCode)) };
  }

  if (graph.table) {
    const hasSiteCode = graph.table.rows.length === 0 || 'site_code' in graph.table.rows[0];
    if (hasSiteCode) {
      const rows = [...graph.table.rows].sort(
        (a, b) => Number(a.site_code === siteCode) - Number(b.site_code === siteCode),
      );
      return { ...graph, table: { ...graph.table, rows } };
    }
    return graph;
  }

  const categoryLabels = graph.xAxis.categories.map((c) => c.label);
  if (isSiteCodeAxis(categoryLabels, allSiteCodes)) {
    const order = categoryLabels
      .map((_, i) => i)
      .sort((a, b) => Number(categoryLabels[a] === siteCode) - Number(categoryLabels[b] === siteCode));
    return {
      ...graph,
      xAxis: { ...graph.xAxis, categories: order.map((i) => graph.xAxis.categories[i]) },
      yAxis: {
        ...graph.yAxis,
        series: graph.yAxis.series.map((s) => ({ ...s, values: order.map((i) => s.values[i]) })),
      },
    };
  }

  const seriesNames = graph.yAxis.series.map((s) => s.name);
  if (isSiteCodeAxis(seriesNames, allSiteCodes)) {
    const series = [...graph.yAxis.series].sort(
      (a, b) => Number(a.name === siteCode) - Number(b.name === siteCode),
    );
    return { ...graph, yAxis: { ...graph.yAxis, series } };
  }

  return graph;
}
