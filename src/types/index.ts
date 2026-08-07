/** Shared domain types. These mirror the shape the real draupat backend
 * views already produce (see db/metrics_views.sql / db/api_views.sql in the
 * backend repo) so swapping src/lib/api.ts from mock data to real fetch()
 * calls later doesn't require touching any component. */

export interface Company {
  siteCode: string; // e.g. 'caratlane' — matches sites.site_code
  brandName: string; // e.g. 'CaratLane'
  color: string; // chart color assigned to this competitor
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
