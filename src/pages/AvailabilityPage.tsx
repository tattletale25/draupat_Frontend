import { useEffect, useMemo, useState } from 'react';
import { getCompanies, getInStockRate } from '../lib/api';
import type { Company, MetricResponse } from '../types';
import { CompetitorFilter } from '../components/dashboard/CompetitorFilter';
import { MetricCaveats } from '../components/dashboard/MetricCaveats';
import { GraphRenderer } from '../components/dashboard/GraphRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { filterGraphByCompanies } from '../lib/graph-filter';

type ViewMode = 'meter' | 'heatmap';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'meter', label: 'By Brand' },
  { value: 'heatmap', label: 'By Category' },
];

/** 5.1 in-stock rate — a meter row by default (a fixed 0-100% ceiling
 * reads faster as a meter than a bar, per the dataviz spec), with a
 * toggle to the brand x category heatmap drill-down. Both variants are
 * fetched up front on mount so the toggle never refetches. */
export function AvailabilityPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [meter, setMeter] = useState<MetricResponse | null>(null);
  const [heatmap, setHeatmap] = useState<MetricResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('meter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCompanies(), getInStockRate(false), getInStockRate(true)])
      .then(([c, m, h]) => {
        setCompanies(c);
        setMeter(m);
        setHeatmap(h);
        setSelected(c.map((x) => x.siteCode));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load availability data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const allSiteCodes = useMemo(() => companies.map((c) => c.siteCode), [companies]);

  function toggleCompany(siteCode: string) {
    setSelected((prev) => (prev.includes(siteCode) ? prev.filter((s) => s !== siteCode) : [...prev, siteCode]));
  }

  if (loading) {
    return <div className="chart-empty">Loading availability…</div>;
  }
  if (error || !meter || !heatmap) {
    return <div className="chart-empty">Couldn't load availability data{error ? `: ${error}` : ''}.</div>;
  }

  const active = view === 'meter' ? meter : heatmap;

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
            <CardTitle>In-stock rate</CardTitle>
            <CardDescription>% of catalog actually purchasable right now</CardDescription>
          </div>
          <Tabs value={view} onChange={setView} options={VIEW_OPTIONS} />
        </CardHeader>
        <CardContent>
          <GraphRenderer graph={filterGraphByCompanies(active.graph, allSiteCodes, selected)} />
          <MetricCaveats caveats={active.caveats} />
        </CardContent>
      </Card>
    </>
  );
}
