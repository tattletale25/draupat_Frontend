import { useEffect, useMemo, useState } from 'react';
import { getAssortmentSkuCount, getCompanies, getNetCatalogChange } from '../lib/api';
import type { Company, MetricResponse } from '../types';
import { CompetitorFilter } from '../components/dashboard/CompetitorFilter';
import { MetricCaveats } from '../components/dashboard/MetricCaveats';
import { GraphRenderer } from '../components/dashboard/GraphRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { filterGraphByCompanies, moveBrandToEnd } from '../lib/graph-filter';
import type { GraphSpec } from '../types';

/** 2.1 SKU count per category/brand (heatmap) + 2.2 net catalog change
 * (stat tile row) — see the dataviz spec's Assortment section. */
export function AssortmentPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [skuCount, setSkuCount] = useState<MetricResponse | null>(null);
  const [netChange, setNetChange] = useState<MetricResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCompanies(), getAssortmentSkuCount(), getNetCatalogChange()])
      .then(([c, sku, net]) => {
        setCompanies(c);
        setSkuCount(sku);
        setNetChange(net);
        setSelected(c.map((x) => x.siteCode));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load assortment data.');
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
    return <div className="chart-empty">Loading assortment…</div>;
  }
  if (error || !skuCount || !netChange) {
    return <div className="chart-empty">Couldn't load assortment data{error ? `: ${error}` : ''}.</div>;
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

      <Card>
        <CardHeader>
          <CardTitle>SKU count by category, per brand</CardTitle>
          <CardDescription>Catalog breadth at each site's latest scrape — darker = more SKUs</CardDescription>
        </CardHeader>
        <CardContent>
          <GraphRenderer graph={prepare(skuCount.graph)} />
          <MetricCaveats caveats={skuCount.caveats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net catalog change</CardTitle>
          <CardDescription>SKUs added vs. removed since the previous scrape, per brand</CardDescription>
        </CardHeader>
        <CardContent>
          <GraphRenderer graph={prepare(netChange.graph)} preliminary={netChange.caveats.length > 0} />
          <MetricCaveats caveats={netChange.caveats} />
        </CardContent>
      </Card>
    </>
  );
}
