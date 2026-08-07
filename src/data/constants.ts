import type { Category, Company, PriceBand } from '../types';

/** Tracked competitors — mirrors config/sites.yaml in the backend repo. */
export const COMPANIES: Company[] = [
  { siteCode: 'caratlane', brandName: 'CaratLane', color: 'var(--chart-1)' },
  { siteCode: 'giva', brandName: 'GIVA', color: 'var(--chart-2)' },
  { siteCode: 'palmonas', brandName: 'Palmonas', color: 'var(--chart-3)' },
  { siteCode: 'theamethyststore', brandName: 'The Amethyst Store', color: 'var(--chart-4)' },
  { siteCode: 'kushals', brandName: "Kushal's Fashion Jewellery", color: 'var(--chart-5)' },
];

/** Resolved hex values for the same palette, for use inside inline SVG
 * fills where a CSS var lookup isn't convenient. Keep in sync with
 * src/index.css --chart-1..5. */
export const CHART_HEX: Record<string, string> = {
  caratlane: '#aa3bff',
  giva: '#2563eb',
  palmonas: '#16a34a',
  theamethyststore: '#ea580c',
  kushals: '#db2777',
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
