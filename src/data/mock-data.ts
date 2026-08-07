import { CATEGORIES, type Category, type CategorySummary, type PriceBand, type PriceTrendPoint, type SkuRow } from '../types';
import { COMPANIES } from './constants';
import { hashSeed, mulberry32 } from '../lib/utils';

/* =====================================================================
 * Synthetic competitor catalog + price-history data.
 *
 * Real scraping only started 2026-08-07 (one day of history so far — see
 * the backend repo's README "Known limitations"), so there isn't yet a
 * few months of real price history to chart. This generator produces a
 * deterministic (seeded, not random-every-reload), realistic-looking
 * dataset in the exact shape the real backend views will eventually
 * return, so the dashboard works today and swapping src/lib/api.ts to
 * real fetch() calls later is a drop-in change — nothing else changes.
 * ===================================================================== */

const TODAY = new Date('2026-08-08T00:00:00Z');
const HISTORY_WEEKS = 26; // ~6 months

// Relative price positioning per competitor (fine jewellery vs. fashion
// jewellery brands sit at very different price points in this market).
const COMPANY_PRICE_MULTIPLIER: Record<string, number> = {
  caratlane: 1.65, // fine gold/diamond jewellery — premium
  giva: 0.55, // affordable silver jewellery
  palmonas: 0.48, // trendy gold-plated/silver, budget
  theamethyststore: 0.62, // boho silver, mid-affordable
  kushals: 0.16, // fashion/artificial jewellery — mass, cheap
};

// Relative catalog breadth per competitor.
const COMPANY_CATALOG_SIZE: Record<string, number> = {
  caratlane: 230,
  giva: 170,
  palmonas: 135,
  theamethyststore: 115,
  kushals: 310,
};

const CATEGORY_BASE_PRICE: Record<Category, number> = {
  rings: 12000,
  necklaces: 18000,
  earrings: 7000,
  bracelets: 9000,
  pendants: 8000,
};

const CATEGORY_WEIGHT: Record<Category, number> = {
  rings: 0.3,
  necklaces: 0.2,
  earrings: 0.25,
  bracelets: 0.15,
  pendants: 0.1,
};

function priceBandOf(price: number): PriceBand {
  if (price < 5000) return 'entry';
  if (price <= 25000) return 'mid';
  return 'premium';
}

function isoWeeksAgo(weeksAgo: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - weeksAgo * 7);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

interface CellData {
  siteCode: string;
  category: Category;
  skuRows: SkuRow[];
  trend: PriceTrendPoint[];
}

function buildCell(siteCode: string, category: Category): CellData {
  const rand = mulberry32(hashSeed(`${siteCode}:${category}`));
  const catalogSize = COMPANY_CATALOG_SIZE[siteCode] ?? 150;
  const count = Math.max(8, Math.round(catalogSize * CATEGORY_WEIGHT[category] * (0.75 + rand() * 0.5)));
  const baseAvg = CATEGORY_BASE_PRICE[category] * (COMPANY_PRICE_MULTIPLIER[siteCode] ?? 1) * (0.9 + rand() * 0.2);

  const skuRows: SkuRow[] = [];
  for (let i = 0; i < count; i++) {
    const spread = 0.55 + rand() * 0.9; // ~0.55x - 1.45x of category/company average
    const listPrice = Math.round((baseAvg * spread) / 10) * 10;
    const discounted = rand() < 0.35;
    const avgDiscountPct = discounted ? Math.round((5 + rand() * 30) * 10) / 10 : 0;
    const isBestSeller = rand() < 0.08;
    const status: SkuRow['status'] = rand() < 0.05 ? 'Inactive' : 'Live';
    const dateAdded = isoDaysAgo(Math.round(rand() * 365));
    skuRows.push({
      skuId: `${siteCode.slice(0, 3).toUpperCase()}-${category.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      siteCode,
      category,
      status,
      priceTier: priceBandOf(listPrice),
      listPrice,
      avgDiscountPct,
      isBestSeller,
      dateAdded,
    });
  }

  // Weekly category-level average price trend: a random walk starting
  // ~6 months ago and drifting toward today's computed average, with
  // occasional multi-week "sale" dips (discount events).
  const actualAvg = skuRows.reduce((s, r) => s + (r.listPrice ?? 0), 0) / skuRows.length;
  const trend: PriceTrendPoint[] = [];
  let level = actualAvg * (0.9 + rand() * 0.25); // starting level ~6 months ago
  let saleWeeksLeft = 0;
  for (let w = HISTORY_WEEKS; w >= 0; w--) {
    if (saleWeeksLeft > 0) saleWeeksLeft--;
    else if (rand() < 0.1) saleWeeksLeft = 1 + Math.floor(rand() * 2);
    const drift = (rand() - 0.47) * 0.025;
    const saleEffect = saleWeeksLeft > 0 ? -(0.08 + rand() * 0.09) : 0;
    level = Math.max(200, level * (1 + drift + saleEffect));
    trend.push({
      siteCode,
      category,
      date: isoWeeksAgo(w),
      avgPrice: Math.round(level),
      skuCount: Math.max(1, Math.round(count * (0.9 + rand() * 0.2))),
    });
  }
  // Nudge the final (today) point to match the SKU-level computed average
  // so the trend chart and the summary cards agree on "today".
  trend[trend.length - 1] = {
    ...trend[trend.length - 1],
    avgPrice: Math.round(actualAvg),
    skuCount: count,
  };

  return { siteCode, category, skuRows, trend };
}

let _cells: CellData[] | null = null;
function cells(): CellData[] {
  if (_cells) return _cells;
  const out: CellData[] = [];
  for (const company of COMPANIES) {
    for (const category of CATEGORIES) {
      out.push(buildCell(company.siteCode, category));
    }
  }
  _cells = out;
  return out;
}

export function getAllSkuRows(): SkuRow[] {
  return cells().flatMap((c) => c.skuRows);
}

export function getCategorySummaries(): CategorySummary[] {
  return cells().map((c) => {
    const prices = c.skuRows.map((r) => r.listPrice ?? 0).sort((a, b) => a - b);
    const n = prices.length;
    const mid = Math.floor(n / 2);
    const median = n % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
    const avg = prices.reduce((s, p) => s + p, 0) / n;
    const bandMix: Record<PriceBand, number> = { entry: 0, mid: 0, premium: 0 };
    let discountedCount = 0;
    let discountSum = 0;
    let inStock = 0;
    for (const row of c.skuRows) {
      bandMix[row.priceTier as PriceBand]++;
      if ((row.avgDiscountPct ?? 0) > 0) discountedCount++;
      discountSum += row.avgDiscountPct ?? 0;
      if (row.status === 'Live') inStock++;
    }
    return {
      siteCode: c.siteCode,
      category: c.category,
      skuCount: n,
      skuCountInStock: inStock,
      minPrice: prices[0] ?? 0,
      avgPrice: Math.round(avg),
      maxPrice: prices[n - 1] ?? 0,
      medianPrice: Math.round(median),
      avgDiscountPct: Math.round((discountSum / n) * 10) / 10,
      pctSkusDiscounted: Math.round((discountedCount / n) * 1000) / 10,
      priceBandMix: bandMix,
    } satisfies CategorySummary;
  });
}

export function getPriceTrend(): PriceTrendPoint[] {
  return cells().flatMap((c) => c.trend);
}
