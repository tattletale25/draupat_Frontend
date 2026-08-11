import { CAPABILITIES_BY_SITE, CHART_HEX } from '../data/constants';
import type {
  Category,
  Company,
  CategorySummary,
  CollectionSpreadRow,
  FlaggedGapRow,
  PriceTrendPoint,
  RankMovementRow,
  RankedProduct,
  SiteCapabilities,
  SkuRow,
  TopOfFeedShareRow,
} from '../types';
import {
  getCollectionSpreadRows,
  getFlaggedGapRows,
  getRankMovementRows,
  getRankedProducts,
  getTopOfFeedShareRows,
} from '../data/mock-data';

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
  week_start: string;
  avg_price: number | null;
  sku_count: number;
}

interface CatalogSkuDto {
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

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const NO_CAPABILITIES: SiteCapabilities = {
  categoryRankScore: false,
  rankMovement: false,
  collectionSpread: false,
};

/** GET /sites */
export async function getCompanies(): Promise<Company[]> {
  const rows = await fetchJson<SiteDto[]>('/sites');
  return rows.map((r) => ({
    siteCode: r.site_code,
    brandName: r.brand_name,
    color: CHART_HEX[r.site_code] ?? 'var(--chart-1)',
    // /sites doesn't return this yet — see API_CONTRACT.md "Product Index"
    // for the field this stands in for once the backend adds it.
    capabilities: CAPABILITIES_BY_SITE[r.site_code] ?? NO_CAPABILITIES,
  }));
}

/** GET /analytics/category-summary (all companies/categories — filtering happens client-side) */
export async function getCategorySummary(): Promise<CategorySummary[]> {
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
}

/** GET /analytics/price-trend (all companies/categories — filtering happens client-side) */
export async function getPriceTrendSeries(): Promise<PriceTrendPoint[]> {
  const rows = await fetchJson<PriceTrendDto[]>('/analytics/price-trend');
  return rows.map((r) => ({
    siteCode: r.site_code,
    category: r.category,
    date: r.week_start,
    avgPrice: r.avg_price ?? 0,
    skuCount: r.sku_count,
  }));
}

/** GET /catalog?company=... once per tracked company, flattened — no single
 * "all companies" catalog endpoint exists on the backend. */
export async function getSkuRows(): Promise<SkuRow[]> {
  const companies = await getCompanies();
  const perCompany = await Promise.all(
    companies.map(async (c) => {
      const data = await fetchJson<CatalogResponseDto>(`/catalog?company=${encodeURIComponent(c.siteCode)}`);
      return data.skus
        .filter((s) => s.category !== null)
        .map(
          (s): SkuRow => ({
            skuId: s.sku_id,
            siteCode: c.siteCode,
            category: s.category as Category,
            status: s.status,
            priceTier: (s.pricing_and_margins.price_tier as SkuRow['priceTier']) ?? 'unknown',
            listPrice: s.pricing_and_margins.list_price,
            avgDiscountPct: s.pricing_and_margins.average_discount_percentage,
            isBestSeller: s.performance_data.is_best_seller,
            dateAdded: s.date_added,
          }),
        );
    }),
  );
  return perCompany.flat();
}

/* =====================================================================
 * Product Index. None of these five endpoints exist on the backend yet —
 * see API_CONTRACT.md "Product Index" for the proposed shapes, the SQL
 * views behind them, and (importantly) which sites can populate which
 * metric today. Backed by src/data/mock-data.ts in the meantime; swapping
 * each of these to a real fetchJson() call is the only change needed once
 * the corresponding endpoint ships — same pattern as every function above.
 * ===================================================================== */

/** Future: GET /analytics/category-rank?companies=...&category=... */
export async function getRankedProductsData(): Promise<RankedProduct[]> {
  return getRankedProducts();
}

/** Future: GET /analytics/rank-movement?companies=...&category=... */
export async function getRankMovementData(): Promise<RankMovementRow[]> {
  return getRankMovementRows();
}

/** Future: GET /analytics/flagged-rank-gap?companies=... */
export async function getFlaggedGapData(): Promise<FlaggedGapRow[]> {
  return getFlaggedGapRows();
}

/** Future: GET /analytics/collection-spread?companies=...&category=... */
export async function getCollectionSpreadData(): Promise<CollectionSpreadRow[]> {
  return getCollectionSpreadRows();
}

/** Future: GET /analytics/top-of-feed-share?companies=... */
export async function getTopOfFeedShareData(): Promise<TopOfFeedShareRow[]> {
  return getTopOfFeedShareRows();
}
