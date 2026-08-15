/** Shared domain types. These mirror the shape the real draupat backend
 * views already produce (see db/metrics_views.sql / db/api_views.sql in the
 * backend repo) so swapping src/lib/api.ts from mock data to real fetch()
 * calls later doesn't require touching any component. */

/** What a site's scraper actually instruments today. All three are backend
 * data-availability facts, not permissions — see API_CONTRACT.md "Product
 * Index". A site can be missing one and have the others (e.g. CaratLane has
 * rankMovement but not categoryRankScore). */
export interface SiteCapabilities {
  categoryRankScore: boolean; // category_index AND category_total both populated
  rankMovement: boolean; // any category-position signal at all, day over day
  collectionSpread: boolean; // n_categories populated
}

export interface Company {
  siteCode: string; // e.g. 'caratlane' — matches sites.site_code
  brandName: string; // e.g. 'CaratLane'
  color: string; // chart color assigned to this competitor
  capabilities: SiteCapabilities;
}

export type PriceBand = 'entry' | 'mid' | 'premium';

export const CATEGORIES = [
  'rings',
  'necklaces',
  'earrings',
  'bracelets',
  'pendants',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** One row per (company, category) at the latest scrape date — backs the
 * category-wise price distribution + SKU count charts.
 * Maps to v_daily_category_price_band filtered to the latest scrape_date. */
export interface CategorySummary {
  siteCode: string;
  category: Category;
  skuCount: number;
  skuCountInStock: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  medianPrice: number;
  avgDiscountPct: number;
  pctSkusDiscounted: number;
  priceBandMix: Record<PriceBand, number>; // sku count per band
}

/** One point in a category-level average price trend line — maps to
 * v_daily_category_price_band grouped by scrape_date. */
export interface PriceTrendPoint {
  siteCode: string;
  category: Category;
  date: string; // ISO date
  avgPrice: number;
  skuCount: number;
}

/** A single SKU row, for the detail table + CSV export. Maps to
 * GET /catalog?company=... (v_api_skus). */
export interface SkuRow {
  skuId: string;
  siteCode: string;
  category: Category;
  status: 'Live' | 'Inactive';
  priceTier: PriceBand | 'unknown';
  listPrice: number | null;
  avgDiscountPct: number | null;
  isBestSeller: boolean;
  dateAdded: string;
}

/* =====================================================================
 * Product Index (left-nav page, 5 tabs). See API_CONTRACT.md "Product
 * Index" for the backing views, per-site support matrix, and the
 * category_index-vs-category_position fix these types assume.
 * ===================================================================== */

/** One SKU's on-page merchandising rank within its own category feed, at
 * the latest scrape_date. Maps to GET /analytics/category-rank
 * (v_api_category_rank). `rankScore` is null whenever the site's
 * capabilities.categoryRankScore is false — always, not intermittently. */
export interface RankedProduct {
  skuId: string;
  siteCode: string;
  category: Category;
  name: string;
  imageUrl: string;
  price: number;
  categoryIndex: number | null; // 0-based slot in its on-page category feed
  categoryTotal: number | null; // size of that feed
  rankScore: number | null; // categoryIndex / (categoryTotal - 1); 0 = most prominent
  isBestSeller: boolean;
  isNewArrival: boolean;
}

/** A SKU's shelf-position delta between the two most recent scrape dates.
 * Maps to GET /analytics/rank-movement (v_api_rank_movement). Only ever one
 * row per SKU — a single observation, not a trend (see caveat in contract).
 * Gated on capabilities.rankMovement, not categoryRankScore — a site can
 * report movement without ever having a category_total. */
export interface RankMovementRow {
  skuId: string;
  siteCode: string;
  category: Category;
  name: string;
  imageUrl: string;
  positionToday: number;
  positionYesterday: number;
  delta: number; // positionToday - positionYesterday; negative = moved toward front (improved)
}

/** Per site+category: does a bestseller/new-arrival tag actually correlate
 * with better shelf placement? Maps to GET /analytics/flagged-rank-gap
 * (v_api_flagged_rank_gap). Gated on capabilities.categoryRankScore. */
export interface FlaggedGapRow {
  siteCode: string;
  category: Category;
  flaggedAvgScore: number | null;
  catalogAvgScore: number | null;
  gap: number | null; // flaggedAvgScore - catalogAvgScore; negative = tag earns real placement
  flaggedCount: number;
  totalCount: number;
}

/** How many distinct collections/categories a SKU appears in — a proxy for
 * how hard a brand is pushing that SKU across its own site. Maps to
 * GET /analytics/collection-spread (v_api_collection_spread). Gated on
 * capabilities.collectionSpread — NOT the same site set as categoryRankScore
 * (in fact today it's the complementary set — see contract). */
export interface CollectionSpreadRow {
  skuId: string;
  siteCode: string;
  category: Category;
  name: string;
  imageUrl: string;
  nCategories: number;
}

/** Per (site, category): avg/max collections-per-SKU + SKU count — computed
 * server-side via SQL GROUP BY (not aggregated from the raw per-SKU rows in
 * JS anymore, which was both unbounded and silently wrong once any cap was
 * applied to the source data). Maps to GET /analytics/collection-spread's
 * `summary` array. */
export interface CollectionSpreadSummaryRow {
  siteCode: string;
  category: Category;
  avgNCategories: number;
  maxNCategories: number;
  skuCount: number;
}

/** GET /analytics/collection-spread's full response: a small SQL-computed
 * `summary` plus a bounded global `leaderboard` (top 100 SKUs by
 * nCategories, not per-brand). */
export interface CollectionSpreadResponse {
  summary: CollectionSpreadSummaryRow[];
  leaderboard: CollectionSpreadRow[];
}

/** Per site+category: % of SKUs sitting in the top decile of shelf position
 * — how concentrated vs. flat a brand's merchandising is. Maps to
 * GET /analytics/top-of-feed-share (v_api_top_of_feed_share). Gated on
 * capabilities.categoryRankScore. */
export interface TopOfFeedShareRow {
  siteCode: string;
  category: Category;
  pctTopDecile: number; // 0-100
  skuCount: number;
}

/* =====================================================================
 * Ask Away (left-nav page, below Product Index). Free-text question in,
 * grounded text answer + an optional chart/table out. Maps to POST /query
 * (backend/app/nl_query — see that repo's app/graphs/schema.py:GraphSpec,
 * the exact shape every /metrics/* endpoint there also returns). Prefixed
 * `Graph*` rather than `Chart*` to avoid colliding with the domain
 * `Category` type above — these are chart-rendering primitives, not
 * jewellery categories.
 * ===================================================================== */

export type GraphChartType =
  | 'bar'
  | 'stacked_bar'
  | 'line'
  | 'heatmap'
  | 'diverging_bar'
  | 'dumbbell'
  | 'meter'
  | 'stat'
  | 'table';

export interface GraphCategory {
  label: string;
  color: string | null;
}

export interface GraphSeries {
  name: string;
  values: (number | null)[]; // aligned with GraphAxis.categories
  color: string | null;
}

export interface GraphAxis {
  title: string;
  categories: GraphCategory[];
}

export interface GraphValueAxis {
  title: string;
  series: GraphSeries[];
}

export interface GraphTableColumn {
  key: string;
  label: string;
}

export interface GraphTableData {
  columns: GraphTableColumn[];
  rows: Record<string, string | number | boolean | null>[];
}

/** One chart/table spec. `facets` (small multiples, e.g. one dumbbell per
 * category) holds nested GraphSpecs — when present, render those instead
 * of this node's own (empty) xAxis/yAxis. The NL-query agent never
 * produces facets (only the /metrics/* endpoints do), but the shape
 * allows for it. */
export interface GraphSpec {
  applicable: boolean;
  chartType: GraphChartType;
  title: string;
  description: string;
  unit: string;
  baseline: number | null;
  target: number | null;
  xAxis: GraphAxis;
  yAxis: GraphValueAxis;
  table: GraphTableData | null;
  facets: GraphSpec[];
}

/** POST /query response. */
export interface AskAwayResult {
  answer: string;
  comment: string;
  graph: GraphSpec;
}

/* =====================================================================
 * Assortment / Pricing / Discounting / Availability pages. Every
 * GET /metrics/* endpoint (backend/app/routes/metrics.py) returns this
 * same envelope around a GraphSpec — see API_CONTRACT.md for the full
 * endpoint list. `caveats` are backend-verified data-quality notes (e.g.
 * "only one scrape_date exists so far"), not generic boilerplate — surface
 * them near the chart they apply to instead of dropping them.
 * ===================================================================== */
export interface MetricResponse {
  metric: string;
  graph: GraphSpec;
  caveats: string[];
  asOf: string | null;
}
