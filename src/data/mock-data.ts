import {
  CATEGORIES,
  type Category,
  type CategorySummary,
  type CollectionSpreadRow,
  type FlaggedGapRow,
  type PriceBand,
  type PriceTrendPoint,
  type RankMovementRow,
  type RankedProduct,
  type SkuRow,
  type TopOfFeedShareRow,
} from '../types';
import { CHART_HEX, COMPANIES } from './constants';
import { hashSeed, mulberry32 } from '../lib/utils';
import { placeholderProductImage } from '../lib/placeholder';

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

const CATEGORY_SINGULAR: Record<Category, string> = {
  rings: 'Ring',
  necklaces: 'Necklace',
  earrings: 'Earrings',
  bracelets: 'Bracelet',
  pendants: 'Pendant',
};

const MATERIALS = [
  'Gold-Plated',
  'Silver',
  'Rose Gold',
  'Oxidised Silver',
  'American Diamond',
  'Kundan',
  'Pearl',
  'Temple',
  'Minimal',
  'Statement',
];

function productName(rand: () => number, category: Category): string {
  const material = MATERIALS[Math.floor(rand() * MATERIALS.length)];
  return `${material} ${CATEGORY_SINGULAR[category]}`;
}

/** Fisher-Yates shuffle of [0..n-1], seeded. */
function shuffledIndices(n: number, rand: () => number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Turns a feed order (feedOrder[position] = sku index) into a lookup from
 * sku index -> its 0-based position in that feed. */
function positionsFromFeedOrder(feedOrder: number[]): number[] {
  const positionOf = new Array<number>(feedOrder.length);
  feedOrder.forEach((skuIdx, pos) => {
    positionOf[skuIdx] = pos;
  });
  return positionOf;
}

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
  names: string[]; // parallel to skuRows
  isNewArrival: boolean[]; // parallel to skuRows
  positionToday: number[]; // parallel to skuRows — 0-based on-page slot, today
  positionYesterday: number[]; // parallel to skuRows — 0-based on-page slot, prior scrape
  nCategories: number[]; // parallel to skuRows
}

function buildCell(siteCode: string, category: Category): CellData {
  const rand = mulberry32(hashSeed(`${siteCode}:${category}`));
  const catalogSize = COMPANY_CATALOG_SIZE[siteCode] ?? 150;
  const count = Math.max(8, Math.round(catalogSize * CATEGORY_WEIGHT[category] * (0.75 + rand() * 0.5)));
  const baseAvg = CATEGORY_BASE_PRICE[category] * (COMPANY_PRICE_MULTIPLIER[siteCode] ?? 1) * (0.9 + rand() * 0.2);

  const skuRows: SkuRow[] = [];
  const names: string[] = [];
  const isNewArrival: boolean[] = [];
  const nCategories: number[] = [];
  for (let i = 0; i < count; i++) {
    const spread = 0.55 + rand() * 0.9; // ~0.55x - 1.45x of category/company average
    const listPrice = Math.round((baseAvg * spread) / 10) * 10;
    const discounted = rand() < 0.35;
    const avgDiscountPct = discounted ? Math.round((5 + rand() * 30) * 10) / 10 : 0;
    const isBestSeller = rand() < 0.08;
    const status: SkuRow['status'] = rand() < 0.05 ? 'Inactive' : 'Live';
    const daysAgo = Math.round(rand() * 365);
    const dateAdded = isoDaysAgo(daysAgo);
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
    names.push(productName(rand, category));
    isNewArrival.push(daysAgo <= 30);
    // Collection spread: most SKUs sit in a couple of listings, a handful
    // of "hero" pieces get cross-merchandised into many more.
    nCategories.push(rand() < 0.08 ? 5 + Math.floor(rand() * 4) : 1 + Math.floor(rand() * 3));
  }

  // On-page shelf order: today's feed order, and yesterday's — close to
  // today's (a handful of bounded local swaps) rather than an independent
  // reshuffle, so deltas look like real day-to-day movement instead of noise.
  const todayOrder = shuffledIndices(count, rand);
  const yesterdayOrder = [...todayOrder];
  const swaps = Math.round(count * 0.4);
  for (let s = 0; s < swaps; s++) {
    const a = Math.floor(rand() * count);
    const span = Math.min(count - 1, 3);
    const b = Math.min(count - 1, Math.max(0, a + Math.floor(rand() * (span * 2 + 1)) - span));
    [yesterdayOrder[a], yesterdayOrder[b]] = [yesterdayOrder[b], yesterdayOrder[a]];
  }
  const positionToday = positionsFromFeedOrder(todayOrder);
  const positionYesterday = positionsFromFeedOrder(yesterdayOrder);

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

  return { siteCode, category, skuRows, trend, names, isNewArrival, positionToday, positionYesterday, nCategories };
}

function capabilitiesOf(siteCode: string) {
  return COMPANIES.find((c) => c.siteCode === siteCode)?.capabilities;
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

/* ---------------------------------------------------------------------
 * Product Index — merchandising rank, movement, tag-vs-placement gap,
 * collection spread, top-of-feed concentration. Which sites can populate
 * which of these is deliberately uneven (see Company.capabilities and
 * API_CONTRACT.md "Product Index") — it mirrors a real backend gap, not a
 * mock-data shortcut.
 * ------------------------------------------------------------------- */

export function getRankedProducts(): RankedProduct[] {
  return cells().flatMap((c) => {
    const supported = capabilitiesOf(c.siteCode)?.categoryRankScore ?? false;
    const color = CHART_HEX[c.siteCode] ?? '#71717a';
    const n = c.skuRows.length;
    return c.skuRows.map((row, i): RankedProduct => {
      const categoryIndex = supported ? c.positionToday[i] : null;
      const categoryTotal = supported ? n : null;
      const rankScore = supported ? (n > 1 ? categoryIndex! / (n - 1) : 0) : null;
      return {
        skuId: row.skuId,
        siteCode: row.siteCode,
        category: row.category,
        name: c.names[i],
        imageUrl: placeholderProductImage(row.skuId, color),
        price: row.listPrice ?? 0,
        categoryIndex,
        categoryTotal,
        rankScore,
        isBestSeller: row.isBestSeller,
        isNewArrival: c.isNewArrival[i],
      };
    });
  });
}

export function getRankMovementRows(): RankMovementRow[] {
  return cells().flatMap((c) => {
    if (!capabilitiesOf(c.siteCode)?.rankMovement) return [];
    const color = CHART_HEX[c.siteCode] ?? '#71717a';
    return c.skuRows.map((row, i): RankMovementRow => {
      const positionToday = c.positionToday[i] + 1; // 1-based for display
      const positionYesterday = c.positionYesterday[i] + 1;
      return {
        skuId: row.skuId,
        siteCode: row.siteCode,
        category: row.category,
        name: c.names[i],
        imageUrl: placeholderProductImage(row.skuId, color),
        positionToday,
        positionYesterday,
        delta: positionToday - positionYesterday,
      };
    });
  });
}

/** Groups rank-scored products by site+category, dropping anything without
 * a score — used by both the flagged-gap and top-of-feed-share rollups,
 * which are both derived aggregates over getRankedProducts(). */
function groupScoredBySiteCategory(products: RankedProduct[]): Map<string, RankedProduct[]> {
  const map = new Map<string, RankedProduct[]>();
  for (const p of products) {
    if (p.rankScore === null) continue;
    const key = `${p.siteCode}:${p.category}`;
    const list = map.get(key);
    if (list) list.push(p);
    else map.set(key, [p]);
  }
  return map;
}

function avgScore(list: RankedProduct[]): number | null {
  return list.length ? list.reduce((s, p) => s + (p.rankScore ?? 0), 0) / list.length : null;
}

export function getFlaggedGapRows(): FlaggedGapRow[] {
  const groups = groupScoredBySiteCategory(getRankedProducts());
  return Array.from(groups.entries()).map(([key, products]): FlaggedGapRow => {
    const [siteCode, category] = key.split(':') as [string, Category];
    const flagged = products.filter((p) => p.isBestSeller || p.isNewArrival);
    const flaggedAvgScore = avgScore(flagged);
    const catalogAvgScore = avgScore(products);
    return {
      siteCode,
      category,
      flaggedAvgScore,
      catalogAvgScore,
      gap: flaggedAvgScore !== null && catalogAvgScore !== null ? flaggedAvgScore - catalogAvgScore : null,
      flaggedCount: flagged.length,
      totalCount: products.length,
    };
  });
}

export function getCollectionSpreadRows(): CollectionSpreadRow[] {
  return cells().flatMap((c) => {
    if (!capabilitiesOf(c.siteCode)?.collectionSpread) return [];
    const color = CHART_HEX[c.siteCode] ?? '#71717a';
    return c.skuRows.map((row, i): CollectionSpreadRow => ({
      skuId: row.skuId,
      siteCode: row.siteCode,
      category: row.category,
      name: c.names[i],
      imageUrl: placeholderProductImage(row.skuId, color),
      nCategories: c.nCategories[i],
    }));
  });
}

export function getTopOfFeedShareRows(): TopOfFeedShareRow[] {
  const groups = groupScoredBySiteCategory(getRankedProducts());
  return Array.from(groups.entries()).map(([key, products]): TopOfFeedShareRow => {
    const [siteCode, category] = key.split(':') as [string, Category];
    const inTopDecile = products.filter((p) => (p.rankScore ?? 1) <= 0.1).length;
    return {
      siteCode,
      category,
      pctTopDecile: Math.round((inTopDecile / products.length) * 1000) / 10,
      skuCount: products.length,
    };
  });
}
