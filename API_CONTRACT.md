# API contract — competitor dashboard

The dashboard currently runs on **seeded mock data** (`src/data/mock-data.ts`,
served through `src/lib/api.ts`) because the real `draupat` backend only has
one day of scrape history so far and wasn't running in this environment.
Everything below is already implemented on the backend side and ready to
switch on.

## What's new on the backend

The backend repo (`Dhaupt/`) already had `GET /catalog?company=...`. Three
endpoints were added, additively — nothing existing was touched:

| Endpoint | Purpose | Backing SQL view |
|---|---|---|
| `GET /sites` | List tracked competitors (for the filter chips) | `sites` table |
| `GET /analytics/category-summary` | Price distribution (min/avg/median/max) + SKU counts, per company × category | `v_api_category_summary` |
| `GET /analytics/price-trend` | Weekly average price per company × category over time | `v_api_price_trend` |

New files:
- `Dhaupt/db/analytics_api_views.sql` — the two new views, run after `schema.sql` + `metrics_views.sql`
- `Dhaupt/backend/app/routes/analytics.py` — the three endpoints above
- `Dhaupt/backend/app/main.py` — registers the new router + adds CORS for `localhost:5173`
- `Dhaupt/docker-compose.yml` — mounts the new SQL file so it applies automatically on first `docker compose up`

## Response shapes

**`GET /sites`**
```json
[{ "site_code": "caratlane", "brand_name": "CaratLane" }]
```

**`GET /analytics/category-summary?companies=caratlane&companies=giva`** (omit `companies` for all)
```json
[{
  "site_code": "caratlane",
  "category": "rings",
  "sku_count": 212,
  "sku_count_in_stock": 201,
  "min_price": 3200,
  "avg_price": 18450.5,
  "median_price": 16200,
  "max_price": 84000,
  "avg_discount_pct": 9.2,
  "pct_skus_discounted": 34.1,
  "price_band_mix": { "entry": 40, "mid": 130, "premium": 42 }
}]
```

**`GET /analytics/price-trend?companies=caratlane&category=rings`** (both filters optional)
```json
[{
  "site_code": "caratlane",
  "category": "rings",
  "week_start": "2026-02-09",
  "avg_price": 17800.0,
  "sku_count": 205
}]
```

## Switching the frontend from mock to live data

Edit `src/lib/api.ts` only — every component already calls through this
file, so nothing else changes:

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export async function getCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/sites`);
  const rows: { site_code: string; brand_name: string }[] = await res.json();
  return rows.map((r, i) => ({ siteCode: r.site_code, brandName: r.brand_name, color: CHART_HEX[r.site_code] }));
}
// ...same pattern for getCategorySummary / getPriceTrendSeries / getSkuRows
```

`getSkuRows()` (the raw per-SKU export) already has a real backend
equivalent too — call `GET /catalog?company=<site_code>` once per tracked
company and flatten the `skus` arrays.

## Known gap: real price history is thin

Scraping only started 2026-08-07, so `v_api_price_trend` will return a
single week of real data until the daily scrape (`scripts/run_daily_scrape.sh`)
has run for a while. The chart will simply fill in over time — no code
change needed. The mock data simulates ~6 months of history so the chart
isn't empty today; that's clearly a stand-in, not a claim about real
history depth.
