import { CHART_HEX } from '../data/constants';
import type {
  AskAwayResult,
  Category,
  Company,
  CategorySummary,
  CollectionSpreadRow,
  FlaggedGapRow,
  GraphSpec,
  MetricResponse,
  PriceTrendPoint,
  RankMovementRow,
  RankedProduct,
  SkuRow,
  TopOfFeedShareRow,
} from '../types';

/* =====================================================================
 * Single data-access layer for the whole app. Every component fetches
 * data through these functions instead of calling fetch() directly —
 * this is the one place that talks to the backend. See API_CONTRACT.md
 * at the repo root for the exact endpoints/response shapes this calls.
 * ===================================================================== */

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface SiteDto {
  site_code: string;
  brand_name: string;
  capabilities: {
    category_rank_score: boolean;
    rank_movement: boolean;
    collection_spread: boolean;
  };
}

interface CategorySummaryDto {
  site_code: string;
  category: Category;
  sku_count: number;
  sku_count_in_stock: number;
  min_price: number | null;
  avg_price: number | null;
  median_price: number | null;
  max_price: number | null;
  avg_discount_pct: number | null;
  pct_skus_discounted: number | null;
  price_band_mix: { entry: number; mid: number; premium: number };
}

interface PriceTrendDto {
  site_code: string;
  category: Category;
  scrape_date: string;
  avg_price: number | null;
  sku_count: number;
}

interface CatalogSkuDto {
  company: string;
  sku_id: string;
  status: 'Live' | 'Inactive';
  date_added: string;
  category: Category | null;
  design_attributes: { base_material: string | null; stone_type: string | null };
  pricing_and_margins: {
    price_tier: string;
    list_price: number | null;
    average_discount_percentage: number | null;
  };
  performance_data: { is_best_seller: boolean };
}

interface CatalogResponseDto {
  skus: CatalogSkuDto[];
}

// Every GET below reflects a once-daily data refresh (see README), so
// caching for the lifetime of the page is safe: repeat calls (e.g.
// re-visiting a tab, or getSkuRows() pulling in getCompanies()) reuse the
// same in-flight/resolved promise instead of re-hitting the network.
// Failed requests are evicted so the next call retries.
const requestCache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = requestCache.get(key);
  if (hit) return hit as Promise<T>;
  const promise = load().catch((err: unknown) => {
    requestCache.delete(key);
    throw err;
  });
  requestCache.set(key, promise);
  return promise;
}

async function fetchJson<T>(path: string): Promise<T> {
  // ngrok's free tier serves an HTML interstitial to browser requests
  // unless this header is set; harmless against non-ngrok API_BASE values.
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** GET /sites */
export function getCompanies(): Promise<Company[]> {
  return cached('sites', async () => {
    const rows = await fetchJson<SiteDto[]>('/sites');
    return rows.map((r) => ({
      siteCode: r.site_code,
      brandName: r.brand_name,
      color: CHART_HEX[r.site_code] ?? 'var(--chart-1)',
      capabilities: {
        categoryRankScore: r.capabilities.category_rank_score,
        rankMovement: r.capabilities.rank_movement,
        collectionSpread: r.capabilities.collection_spread,
      },
    }));
  });
}

/** GET /analytics/category-summary (all companies/categories — filtering happens client-side) */
export function getCategorySummary(): Promise<CategorySummary[]> {
  return cached('category-summary', async () => {
    const rows = await fetchJson<CategorySummaryDto[]>('/analytics/category-summary');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      skuCount: r.sku_count,
      skuCountInStock: r.sku_count_in_stock,
      minPrice: r.min_price ?? 0,
      avgPrice: r.avg_price ?? 0,
      maxPrice: r.max_price ?? 0,
      medianPrice: r.median_price ?? 0,
      avgDiscountPct: r.avg_discount_pct ?? 0,
      pctSkusDiscounted: r.pct_skus_discounted ?? 0,
      priceBandMix: r.price_band_mix,
    }));
  });
}

/** GET /analytics/price-trend (all companies/categories — filtering happens client-side) */
export function getPriceTrendSeries(): Promise<PriceTrendPoint[]> {
  return cached('price-trend', async () => {
    const rows = await fetchJson<PriceTrendDto[]>('/analytics/price-trend');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      date: r.scrape_date,
      avgPrice: r.avg_price ?? 0,
      skuCount: r.sku_count,
    }));
  });
}

/** GET /catalog?company=...&company=...  — one request for every tracked
 * company (the backend accepts repeated `company` params and runs a single
 * set-scoped query), rather than N parallel per-company requests. Each row
 * carries its own `company` field so the combined response stays
 * attributable. This is still the heaviest call (full raw SKU detail), so
 * callers should only invoke it when the raw data is actually needed (e.g.
 * the CSV export), not as part of a page's initial load. */
export function getSkuRows(): Promise<SkuRow[]> {
  return cached('sku-rows', async () => {
    const companies = await getCompanies();
    const qs = companies.map((c) => `company=${encodeURIComponent(c.siteCode)}`).join('&');
    const data = await fetchJson<CatalogResponseDto>(`/catalog?${qs}`);
    return data.skus
      .filter((s) => s.category !== null)
      .map(
        (s): SkuRow => ({
          skuId: s.sku_id,
          siteCode: s.company,
          category: s.category as Category,
          status: s.status,
          priceTier: (s.pricing_and_margins.price_tier as SkuRow['priceTier']) ?? 'unknown',
          listPrice: s.pricing_and_margins.list_price,
          avgDiscountPct: s.pricing_and_margins.average_discount_percentage,
          isBestSeller: s.performance_data.is_best_seller,
          dateAdded: s.date_added,
        }),
      );
  });
}

/* =====================================================================
 * Product Index. See API_CONTRACT.md "Product Index" for the full per-site
 * support matrix — every function below fetches ALL companies/categories
 * (filtering happens client-side, same pattern as getCategorySummary/
 * getPriceTrendSeries above) since ProductIndexPage lets the user flip
 * the selected category without a refetch.
 * ===================================================================== */

interface RankedProductDto {
  site_code: string;
  category: Category;
  sku_id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  category_index: number | null;
  category_total: number | null;
  rank_score: number | null;
  is_best_seller: boolean;
  is_new_arrival: boolean;
}

interface RankMovementDto {
  site_code: string;
  category: Category;
  sku_id: string;
  name: string;
  image_url: string | null;
  position_today: number;
  position_yesterday: number;
  delta: number;
}

interface FlaggedGapDto {
  site_code: string;
  category: Category;
  flagged_avg_score: number | null;
  catalog_avg_score: number | null;
  gap: number | null;
  flagged_count: number;
  total_count: number;
}

interface CollectionSpreadDto {
  site_code: string;
  category: Category;
  sku_id: string;
  name: string;
  image_url: string | null;
  n_categories: number;
}

interface TopOfFeedShareDto {
  site_code: string;
  category: Category;
  pct_top_decile: number | null;
  sku_count: number;
}

/** GET /analytics/category-rank */
export function getRankedProductsData(): Promise<RankedProduct[]> {
  return cached('category-rank', async () => {
    const rows = await fetchJson<RankedProductDto[]>('/analytics/category-rank');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      skuId: r.sku_id,
      name: r.name,
      imageUrl: r.image_url ?? '',
      price: r.price ?? 0,
      categoryIndex: r.category_index,
      categoryTotal: r.category_total,
      rankScore: r.rank_score,
      isBestSeller: r.is_best_seller,
      isNewArrival: r.is_new_arrival,
    }));
  });
}

/** GET /analytics/rank-movement */
export function getRankMovementData(): Promise<RankMovementRow[]> {
  return cached('rank-movement', async () => {
    const rows = await fetchJson<RankMovementDto[]>('/analytics/rank-movement');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      skuId: r.sku_id,
      name: r.name,
      imageUrl: r.image_url ?? '',
      positionToday: r.position_today,
      positionYesterday: r.position_yesterday,
      delta: r.delta,
    }));
  });
}

/** GET /analytics/flagged-rank-gap */
export function getFlaggedGapData(): Promise<FlaggedGapRow[]> {
  return cached('flagged-rank-gap', async () => {
    const rows = await fetchJson<FlaggedGapDto[]>('/analytics/flagged-rank-gap');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      flaggedAvgScore: r.flagged_avg_score,
      catalogAvgScore: r.catalog_avg_score,
      gap: r.gap,
      flaggedCount: r.flagged_count,
      totalCount: r.total_count,
    }));
  });
}

/** GET /analytics/collection-spread */
export function getCollectionSpreadData(): Promise<CollectionSpreadRow[]> {
  return cached('collection-spread', async () => {
    const rows = await fetchJson<CollectionSpreadDto[]>('/analytics/collection-spread');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      skuId: r.sku_id,
      name: r.name,
      imageUrl: r.image_url ?? '',
      nCategories: r.n_categories,
    }));
  });
}

/** GET /analytics/top-of-feed-share */
export function getTopOfFeedShareData(): Promise<TopOfFeedShareRow[]> {
  return cached('top-of-feed-share', async () => {
    const rows = await fetchJson<TopOfFeedShareDto[]>('/analytics/top-of-feed-share');
    return rows.map((r) => ({
      siteCode: r.site_code,
      category: r.category,
      pctTopDecile: r.pct_top_decile ?? 0,
      skuCount: r.sku_count,
    }));
  });
}

/* =====================================================================
 * Ask Away — free-text question in, grounded answer + optional chart out.
 * ===================================================================== */

interface GraphSpecDto {
  applicable: boolean;
  chart_type: GraphSpec['chartType'];
  title: string;
  description: string;
  unit: string;
  baseline: number | null;
  target: number | null;
  x_axis: { title: string; categories: { label: string; color: string | null }[] };
  y_axis: { title: string; series: { name: string; values: (number | null)[]; color: string | null }[] };
  table: { columns: { key: string; label: string }[]; rows: Record<string, string | number | boolean | null>[] } | null;
  facets: GraphSpecDto[];
}

interface AskAwayResultDto {
  answer: string;
  comment: string;
  graph: GraphSpecDto;
}

function mapGraphSpec(g: GraphSpecDto): GraphSpec {
  return {
    applicable: g.applicable,
    chartType: g.chart_type,
    title: g.title,
    description: g.description,
    unit: g.unit,
    baseline: g.baseline,
    target: g.target,
    xAxis: { title: g.x_axis.title, categories: g.x_axis.categories },
    yAxis: { title: g.y_axis.title, series: g.y_axis.series },
    table: g.table,
    facets: (g.facets ?? []).map(mapGraphSpec),
  };
}

/** POST /query — no conversation memory: each call sends only the current
 * question, nothing from earlier turns in the thread. */
export async function askQuery(query: string): Promise<AskAwayResult> {
  const data = await postJson<AskAwayResultDto>('/query', { query });
  return { answer: data.answer, comment: data.comment, graph: mapGraphSpec(data.graph) };
}

/* =====================================================================
 * Assortment / Pricing / Discounting / Availability. Every GET below is
 * a thin wrapper over one /metrics/* endpoint (backend/app/routes/
 * metrics.py) — all of them return the exact same MetricResponseDto
 * envelope, so there's a single mapper (mapMetricResponse, reusing the
 * mapGraphSpec above) instead of a bespoke shape per metric. Like
 * getCategorySummary/getPriceTrendSeries, every fetch here pulls ALL
 * companies unfiltered (no `companies=`/`category=` query params) —
 * pages filter client-side via filterGraphByCompanies (src/lib/
 * graph-filter.ts) so switching the CompetitorFilter chips never refetches.
 * ===================================================================== */

interface MetricResponseDto {
  metric: string;
  graph: GraphSpecDto;
  caveats: string[];
  as_of: string | null;
}

function mapMetricResponse(d: MetricResponseDto): MetricResponse {
  return { metric: d.metric, graph: mapGraphSpec(d.graph), caveats: d.caveats, asOf: d.as_of };
}

function getMetric(path: string): Promise<MetricResponse> {
  return cached(`metric:${path}`, async () => mapMetricResponse(await fetchJson<MetricResponseDto>(path)));
}

/** GET /metrics/assortment/sku-count — 2.1, heatmap (category x brand). */
export function getAssortmentSkuCount(): Promise<MetricResponse> {
  return getMetric('/metrics/assortment/sku-count');
}

/** GET /metrics/assortment/net-catalog-change — 2.2, stat tile row. */
export function getNetCatalogChange(): Promise<MetricResponse> {
  return getMetric('/metrics/assortment/net-catalog-change');
}

/** GET /metrics/pricing/positioning-index — 3.4, diverging bar faceted by
 * category (no `category` param passed, so every category comes back as
 * its own facet — the page shows one facet at a time via a Select). */
export function getPricePositioningIndex(): Promise<MetricResponse> {
  return getMetric('/metrics/pricing/positioning-index');
}

/** GET /metrics/pricing/price-band-mix — 3.2, stacked bar (brand x band). */
export function getPriceBandMix(): Promise<MetricResponse> {
  return getMetric('/metrics/pricing/price-band-mix');
}

/** GET /metrics/pricing/category-distribution — 3.3, dumbbell faceted by
 * category (small multiples — rendered together, not one-at-a-time). */
export function getCategoryPriceDistribution(): Promise<MetricResponse> {
  return getMetric('/metrics/pricing/category-distribution');
}

/** GET /metrics/pricing/sku-prices — 3.1, per-SKU detail table. */
export function getSkuPrices(): Promise<MetricResponse> {
  return getMetric('/metrics/pricing/sku-prices');
}

/** GET /metrics/pricing/sku-percentile — 3.5, per-SKU detail table. */
export function getSkuPricePercentile(): Promise<MetricResponse> {
  return getMetric('/metrics/pricing/sku-percentile');
}

/** GET /metrics/discounting/depth — 4.1, heatmap (category x brand). */
export function getDiscountDepth(): Promise<MetricResponse> {
  return getMetric('/metrics/discounting/depth');
}

/** GET /metrics/discounting/breadth — 4.2, heatmap (category x brand). */
export function getDiscountBreadth(): Promise<MetricResponse> {
  return getMetric('/metrics/discounting/breadth');
}

/** GET /metrics/availability/in-stock-rate[?by_category=true] — 5.1. Two
 * genuinely different response shapes (brand meter vs. brand x category
 * heatmap), not client-filterable, so this takes the flag directly rather
 * than always fetching the unfiltered/all-companies variant. */
export function getInStockRate(byCategory = false): Promise<MetricResponse> {
  return getMetric(`/metrics/availability/in-stock-rate${byCategory ? '?by_category=true' : ''}`);
}
