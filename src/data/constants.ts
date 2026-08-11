import type { Category, Company, PriceBand, SiteCapabilities } from '../types';

/** Which scraper feeds each site decides which Product Index metrics it can
 * ever report — traced through the backend's ingest/schema_map.py
 * normalizers, not guessed. See API_CONTRACT.md "Product Index" for the
 * full trace. Only shopify_full.py (palmonas/theamethyststore/kushals)
 * populates category_total; only the dedup-across-collections scrapers
 * (caratlane/bluestone/mia) populate n_categories; GIVA's own scraper
 * (giva.py) never visits a collection page at all, so it has none of the
 * three. These are backend facts, not a frontend toggle — flip them here
 * only when the backend view actually starts returning non-null data. */
const SHOPIFY_FULL_CAPS = { categoryRankScore: true, rankMovement: true, collectionSpread: false };
const DEDUP_SCRAPER_CAPS = { categoryRankScore: false, rankMovement: true, collectionSpread: true };
const NO_CAPS = { categoryRankScore: false, rankMovement: false, collectionSpread: false };

/** Tracked competitors — mirrors config/sites.yaml in the backend repo. */
export const COMPANIES: Company[] = [
  { siteCode: 'caratlane', brandName: 'CaratLane', color: 'var(--chart-1)', capabilities: DEDUP_SCRAPER_CAPS },
  { siteCode: 'giva', brandName: 'GIVA', color: 'var(--chart-2)', capabilities: NO_CAPS },
  { siteCode: 'palmonas', brandName: 'Palmonas', color: 'var(--chart-3)', capabilities: SHOPIFY_FULL_CAPS },
  { siteCode: 'theamethyststore', brandName: 'The Amethyst Store', color: 'var(--chart-4)', capabilities: SHOPIFY_FULL_CAPS },
  { siteCode: 'kushals', brandName: "Kushal's Fashion Jewellery", color: 'var(--chart-5)', capabilities: SHOPIFY_FULL_CAPS },
  { siteCode: 'bluestone', brandName: 'BlueStone', color: 'var(--chart-6)', capabilities: DEDUP_SCRAPER_CAPS },
  { siteCode: 'mia', brandName: 'Mia by Tanishq', color: 'var(--chart-7)', capabilities: DEDUP_SCRAPER_CAPS },
];

/** Keyed lookup of the same capabilities, for merging onto GET /sites rows
 * client-side until the backend adds a `capabilities` field to that
 * response itself (see API_CONTRACT.md "Product Index") — same pattern
 * CHART_HEX below uses to attach a chart color the backend doesn't send. */
export const CAPABILITIES_BY_SITE: Record<string, SiteCapabilities> = Object.fromEntries(
  COMPANIES.map((c) => [c.siteCode, c.capabilities]),
);

/** Resolved hex values for the same palette, for use inside inline SVG
 * fills where a CSS var lookup isn't convenient. Keep in sync with
 * src/index.css --chart-1..7. */
export const CHART_HEX: Record<string, string> = {
  caratlane: '#aa3bff',
  giva: '#2563eb',
  palmonas: '#16a34a',
  theamethyststore: '#ea580c',
  kushals: '#db2777',
  bluestone: '#0891b2',
  mia: '#ca8a04',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  rings: 'Rings',
  necklaces: 'Necklaces',
  earrings: 'Earrings',
  bracelets: 'Bracelets',
  pendants: 'Pendants',
};

/** Matches config/sites.yaml price_bands (entry_max / mid_max, INR). */
export const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  entry: 'Entry (< ₹5k)',
  mid: 'Mid (₹5k–25k)',
  premium: 'Premium (> ₹25k)',
};
