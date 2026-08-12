import { useEffect, useMemo, useState } from 'react';
import {
  getCategoryPriceDistribution,
  getCompanies,
  getPriceBandMix,
  getPricePositioningIndex,
  getSkuPricePercentile,
  getSkuPrices,
} from '../lib/api';
import { CATEGORIES } from '../types';
import type { Category, Company, MetricResponse } from '../types';
import { CATEGORY_LABELS } from '../data/constants';
import { CompetitorFilter } from '../components/dashboard/CompetitorFilter';
import { MetricCaveats } from '../components/dashboard/MetricCaveats';
import { GraphRenderer } from '../components/dashboard/GraphRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { filterGraphByCompanies } from '../lib/graph-filter';

type DetailTab = 'prices' | 'percentile';

const DETAIL_TAB_OPTIONS: { value: DetailTab; label: string }[] = [
  { value: 'prices', label: 'By Price' },
  { value: 'percentile', label: 'By Percentile' },
];

/** 3.2-3.5 — see the dataviz spec's Pricing section. 3.4 (positioning
 * index) is the flagship visual, shown one category facet at a time via a
 * Select (same pattern as PriceTrendChart); 3.3 (category distribution)
 * shows every category facet at once as small multiples, since comparing
 * across categories is the point there. 3.1/3.5 are per-SKU drill-down
 * tables, tabbed rather than both shown at once. */
export function PricingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [positioningIndex, setPositioningIndex] = useState<MetricResponse | null>(null);
  const [priceBandMix, setPriceBandMix] = useState<MetricResponse | null>(null);
  const [categoryDistribution, setCategoryDistribution] = useState<MetricResponse | null>(null);
  const [skuPrices, setSkuPrices] = useState<MetricResponse | null>(null);
  const [skuPercentile, setSkuPercentile] = useState<MetricResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState<Category>('rings');
  const [detailTab, setDetailTab] = useState<DetailTab>('prices');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getCompanies(),
      getPricePositioningIndex(),
      getPriceBandMix(),
      getCategoryPriceDistribution(),
      getSkuPrices(),
      getSkuPricePercentile(),
    ])
      .then(([c, idx, mix, dist, prices, pct]) => {
        setCompanies(c);
        setPositioningIndex(idx);
        setPriceBandMix(mix);
        setCategoryDistribution(dist);
        setSkuPrices(prices);
        setSkuPercentile(pct);
        setSelected(c.map((x) => x.siteCode));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load pricing data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const allSiteCodes = useMemo(() => companies.map((c) => c.siteCode), [companies]);

  function toggleCompany(siteCode: string) {
    setSelected((prev) => (prev.includes(siteCode) ? prev.filter((s) => s !== siteCode) : [...prev, siteCode]));
  }

  if (loading) {
    return <div className="chart-empty">Loading pricing…</div>;
  }
  if (error || !positioningIndex || !priceBandMix || !categoryDistribution || !skuPrices || !skuPercentile) {
    return <div className="chart-empty">Couldn't load pricing data{error ? `: ${error}` : ''}.</div>;
  }

  const filteredIndex = filterGraphByCompanies(positioningIndex.graph, allSiteCodes, selected);
  const indexFacet = filteredIndex.facets.find((f) => f.title === category) ?? filteredIndex.facets[0];
  const filteredMix = filterGraphByCompanies(priceBandMix.graph, allSiteCodes, selected);
  const filteredDistribution = filterGraphByCompanies(categoryDistribution.graph, allSiteCodes, selected);
  const filteredPrices = filterGraphByCompanies(skuPrices.graph, allSiteCodes, selected);
  const filteredPercentile = filterGraphByCompanies(skuPercentile.graph, allSiteCodes, selected);

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
        <CardHeader className="row">
          <div>
            <CardTitle>Cross-brand price positioning index</CardTitle>
            <CardDescription>
              &gt;1 = priced above the cross-brand median for this category, &lt;1 = below
            </CardDescription>
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardContent>
          {indexFacet ? <GraphRenderer graph={indexFacet} /> : <div className="chart-empty">No data.</div>}
          <MetricCaveats caveats={positioningIndex.caveats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price-band mix</CardTitle>
          <CardDescription>Entry / mid / premium share of catalog, per brand</CardDescription>
        </CardHeader>
        <CardContent>
          <GraphRenderer graph={filteredMix} />
          <MetricCaveats caveats={priceBandMix.caveats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category price distribution</CardTitle>
          <CardDescription>Min – max price span with median tick, per brand and category</CardDescription>
        </CardHeader>
        <CardContent>
          <GraphRenderer graph={filteredDistribution} />
          <MetricCaveats caveats={categoryDistribution.caveats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="row">
          <div>
            <CardTitle>SKU price detail</CardTitle>
            <CardDescription>Per-SKU drill-down — not a top-level tile, just a lookup</CardDescription>
          </div>
          <Tabs value={detailTab} onChange={setDetailTab} options={DETAIL_TAB_OPTIONS} />
        </CardHeader>
        <CardContent>
          {detailTab === 'prices' ? <GraphRenderer graph={filteredPrices} /> : <GraphRenderer graph={filteredPercentile} />}
        </CardContent>
      </Card>
    </>
  );
}
