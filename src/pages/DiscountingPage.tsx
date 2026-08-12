import { useEffect, useMemo, useState } from 'react';
import { getCompanies, getDiscountBreadth, getDiscountDepth } from '../lib/api';
import type { Company, MetricResponse } from '../types';
import { CompetitorFilter } from '../components/dashboard/CompetitorFilter';
import { MetricCaveats } from '../components/dashboard/MetricCaveats';
import { GraphRenderer } from '../components/dashboard/GraphRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { filterGraphByCompanies, moveBrandToEnd } from '../lib/graph-filter';
import type { GraphSpec } from '../types';

/** 4.1 average discount depth + 4.2 % SKUs discounted — kept as two
 * side-by-side heatmaps (same category x brand grid as Assortment's
 * SKU-count tile, per the dataviz spec's call for shared visual grammar)
 * rather than merged into one chart, since depth and breadth are
 * genuinely different competitive signals. */
export function DiscountingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [depth, setDepth] = useState<MetricResponse | null>(null);
  const [breadth, setBreadth] = useState<MetricResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCompanies(), getDiscountDepth(), getDiscountBreadth()])
      .then(([c, d, b]) => {
        setCompanies(c);
        setDepth(d);
        setBreadth(b);
        setSelected(c.map((x) => x.siteCode));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load discounting data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const allSiteCodes = useMemo(() => companies.map((c) => c.siteCode), [companies]);

  // BlueStone trails every metrics-page chart rather than sitting first
  // (where alphabetical order would otherwise put it) — see graph-filter.ts.
  function prepare(graph: GraphSpec): GraphSpec {
    return moveBrandToEnd(filterGraphByCompanies(graph, allSiteCodes, selected), allSiteCodes, 'bluestone');
  }

  function toggleCompany(siteCode: string) {
    setSelected((prev) => (prev.includes(siteCode) ? prev.filter((s) => s !== siteCode) : [...prev, siteCode]));
  }

  if (loading) {
    return <div className="chart-empty">Loading discounting…</div>;
  }
  if (error || !depth || !breadth) {
    return <div className="chart-empty">Couldn't load discounting data{error ? `: ${error}` : ''}.</div>;
  }

  return (
    <>
      <div className="toolbar">
        <CompetitorFilter
          companies={companies}
          selected={selected}
          onToggle={toggleCompany}
          onSelectAll={() => setSelected(allSiteCodes)}
        />
      </div>

      <div className="grid-2">
        <Card>
          <CardHeader>
            <CardTitle>Average discount depth</CardTitle>
            <CardDescription>Advertised discount %, per brand and category</CardDescription>
          </CardHeader>
          <CardContent>
            <GraphRenderer graph={prepare(depth.graph)} />
            <MetricCaveats caveats={depth.caveats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>% SKUs discounted</CardTitle>
            <CardDescription>Breadth of discounting, per brand and category</CardDescription>
          </CardHeader>
          <CardContent>
            <GraphRenderer graph={prepare(breadth.graph)} />
            <MetricCaveats caveats={breadth.caveats} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
