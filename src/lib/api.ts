import { COMPANIES } from '../data/constants';
import { getAllSkuRows, getCategorySummaries, getPriceTrend } from '../data/mock-data';
import type { Company, CategorySummary, PriceTrendPoint, SkuRow } from '../types';

/* =====================================================================
 * Single data-access layer for the whole app. Every component fetches
 * data through these functions instead of importing mock-data.ts
 * directly — that's the one place to change when the real backend is
 * ready. See API_CONTRACT.md at the repo root for the exact endpoints
 * this is designed to call.
 *
 * To switch to the live backend once it's running, replace the bodies
 * below with e.g.:
 *
 *   const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
 *   export async function getCompanies(): Promise<Company[]> {
 *     const res = await fetch(`${API_BASE}/sites`);
 *     return res.json();
 *   }
 *
 * Every function already returns a Promise, so calling code doesn't
 * change either way.
 * ===================================================================== */

const MOCK_LATENCY_MS = 0; // set >0 (e.g. 150) if you want to see loading states

function delay<T>(value: T): Promise<T> {
  return MOCK_LATENCY_MS > 0
    ? new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
    : Promise.resolve(value);
}

/** GET /sites in the real backend. */
export function getCompanies(): Promise<Company[]> {
  return delay(COMPANIES);
}

/** GET /analytics/category-summary?companies=... in the real backend. */
export function getCategorySummary(): Promise<CategorySummary[]> {
  return delay(getCategorySummaries());
}

/** GET /analytics/price-trend?companies=...&months=6 in the real backend. */
export function getPriceTrendSeries(): Promise<PriceTrendPoint[]> {
  return delay(getPriceTrend());
}

/** GET /catalog?company=... (already exists in the real backend) flattened
 * across every tracked company, for the detail table + CSV export. */
export function getSkuRows(): Promise<SkuRow[]> {
  return delay(getAllSkuRows());
}
