import { useEffect, useMemo, useState } from 'react';
import { getCategorySummary, getCompanies, getPriceTrendSeries, getSkuRows } from '../lib/api';
import type { CategorySummary, Company, PriceTrendPoint, SkuRow } from '../types';
import { CATEGORY_LABELS } from '../data/constants';
import { CompetitorFilter } from '../components/dashboard/CompetitorFilter';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { CategoryPriceDistributionChart } from '../components/dashboard/CategoryPriceDistributionChart';
import { CategorySkuCountChart } from '../components/dashboard/CategorySkuCountChart';
import { PriceTrendChart } from '../components/dashboard/PriceTrendChart';
import { SkuTable } from '../components/dashboard/SkuTable';
import { Button } from '../components/ui/Button';
import { IconDownload } from '../components/ui/Icon';
import { downloadCsv } from '../lib/csv-export';

export function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [summaries, setSummaries] = useState<CategorySummary[]>([]);
  const [trend, setTrend] = useState<PriceTrendPoint[]>([]);
  const [skuRows, setSkuRows] = useState<SkuRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCompanies(), getCategorySummary(), getPriceTrendSeries(), getSkuRows()])
      .then(([c, s, t, rows]) => {
        setCompanies(c);
        setSummaries(s);
        setTrend(t);
        setSkuRows(rows);
        setSelected(c.map((x) => x.siteCode));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load competitor data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selected.includes(c.siteCode)),
    [companies, selected],
  );
  const filteredSummaries = useMemo(
    () => summaries.filter((s) => selected.includes(s.siteCode)),
    [summaries, selected],
  );

  function toggleCompany(siteCode: string) {
    setSelected((prev) =>
      prev.includes(siteCode) ? prev.filter((s) => s !== siteCode) : [...prev, siteCode],
    );
  }

  function exportSummaryCsv() {
    downloadCsv(
      `competitor-category-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredSummaries.map((r) => ({
        competitor: companies.find((c) => c.siteCode === r.siteCode)?.brandName ?? r.siteCode,
        category: CATEGORY_LABELS[r.category],
        sku_count: r.skuCount,
        sku_count_in_stock: r.skuCountInStock,
        min_price_inr: r.minPrice,
        avg_price_inr: r.avgPrice,
        median_price_inr: r.medianPrice,
        max_price_inr: r.maxPrice,
        avg_discount_pct: r.avgDiscountPct,
        pct_skus_discounted: r.pctSkusDiscounted,
        entry_band_skus: r.priceBandMix.entry,
        mid_band_skus: r.priceBandMix.mid,
        premium_band_skus: r.priceBandMix.premium,
      })),
    );
  }

  function exportRawSkuCsv() {
    const rows = skuRows.filter((r) => selected.includes(r.siteCode));
    downloadCsv(
      `competitor-sku-detail-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        sku_id: r.skuId,
        competitor: companies.find((c) => c.siteCode === r.siteCode)?.brandName ?? r.siteCode,
        category: CATEGORY_LABELS[r.category],
        status: r.status,
        price_tier: r.priceTier,
        list_price_inr: r.listPrice,
        avg_discount_pct: r.avgDiscountPct,
        is_best_seller: r.isBestSeller,
        date_added: r.dateAdded,
      })),
    );
  }

  if (loading) {
    return <div className="chart-empty">Loading competitor data…</div>;
  }

  if (error) {
    return <div className="chart-empty">Couldn't load competitor data: {error}</div>;
  }

  return (
    <>
      <div className="toolbar">
        <CompetitorFilter
          companies={companies}
          selected={selected}
          onToggle={toggleCompany}
          onSelectAll={() => setSelected(companies.map((c) => c.siteCode))}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" onClick={exportRawSkuCsv}>
            <IconDownload /> Export raw SKUs
          </Button>
          <Button variant="accent" size="sm" onClick={exportSummaryCsv}>
            <IconDownload /> Download CSV
          </Button>
        </div>
      </div>

      <SummaryCards summaries={filteredSummaries} companyCount={selectedCompanies.length} />

      <div className="grid-2">
        <CategoryPriceDistributionChart summaries={filteredSummaries} companies={selectedCompanies} />
        <CategorySkuCountChart summaries={filteredSummaries} companies={selectedCompanies} />
      </div>

      <PriceTrendChart trend={trend} companies={selectedCompanies} />

      <SkuTable summaries={filteredSummaries} companies={companies} />
    </>
  );
}
