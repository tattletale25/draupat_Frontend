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

## Product Index (proposed — none of this exists on the backend yet)

New left-nav page (`src/pages/ProductIndexPage.tsx`), 5 tabs, backing five
metrics defined against `product_daily_snapshot`'s on-page merchandising
columns (`category_index`/`category_position`/`category_total`/
`n_categories`). Traced end to end through `Dhaupt/ingest/schema_map.py`
and every scraper before writing this — two things below are corrections
to the metric spec as originally written, not just caveats:

1. **`category_position` is not 0-based everywhere.** `shopify_full.py`
   writes it as `category_index + 1` (1-based); CaratLane/BlueStone/Mia's
   normalizers write the raw dict index (0-based). Any rank-score formula
   must read `category_index` where it exists and fall back to
   `category_position` only where `category_index` is never written —
   see `v_api_category_rank` below. Reading `category_position` directly
   breaks the "0 = most prominent, 0–1 scale" definition for every
   shopify_full-sourced site.
2. **`category_total` and `n_categories` are each populated by a disjoint
   set of 3 of the 7 tracked sites — not "mostly available, verify
   CaratLane."** Confirmed by reading every `normalize_*` function in
   `schema_map.py`, not inferred:

| site_code | scraper | `category_total` (→ rank score) | `n_categories` (→ collection spread) | any position at all (→ movement) |
|---|---|---|---|---|
| `palmonas` | `shopify_full.py` | ✅ | ❌ | ✅ |
| `theamethyststore` | `shopify_full.py` | ✅ | ❌ | ✅ |
| `kushals` | `shopify_full.py` | ✅ | ❌ | ✅ |
| `caratlane` | `caratlane_gql.py` | ❌ never written | ✅ | ✅ |
| `bluestone` | `bluestone_scraper.py` | ❌ never written | ✅ | ✅ |
| `mia` | `mia_scrape.py` | ❌ never written | ✅ | ✅ |
| `giva` | `giva.py` | ❌ never written | ❌ never written | ❌ never written |

`giva.py` never crawls a collection page at all — this isn't a mapping
gap fixable in `schema_map.py`, it needs the scraper itself extended (or
swapped for `shopify_full.py`, like the other Shopify sites) before GIVA
can appear on 4 of these 5 tabs. Ship v1 against this matrix as-is —
don't backfill nulls with 0s or hide the gap.

### `GET /sites` — add a `capabilities` field

```json
[{ "site_code": "giva", "brand_name": "GIVA", "capabilities": { "category_rank_score": false, "rank_movement": false, "collection_spread": false } }]
```

Compute it from actual data, not a hardcoded scraper list, so it
self-corrects the day GIVA's scraper is upgraded:

```sql
CREATE OR REPLACE VIEW v_site_capabilities AS
SELECT
    s.site_id,
    EXISTS (SELECT 1 FROM product_daily_snapshot pds
            WHERE pds.site_id = s.site_id AND pds.category_total IS NOT NULL)      AS category_rank_score,
    EXISTS (SELECT 1 FROM product_daily_snapshot pds
            WHERE pds.site_id = s.site_id
              AND COALESCE(pds.category_index, pds.category_position) IS NOT NULL) AS rank_movement,
    EXISTS (SELECT 1 FROM product_daily_snapshot pds
            WHERE pds.site_id = s.site_id AND pds.n_categories IS NOT NULL)        AS collection_spread
FROM sites s;
```

Until this ships, the frontend merges a hardcoded `CAPABILITIES_BY_SITE`
map (`src/data/constants.ts`) onto the `/sites` response — same pattern
already used there for `CHART_HEX`.

### New views (`Dhaupt/db/product_index_views.sql`, run after `analytics_api_views.sql`)

```sql
-- 1.1 Category Rank Score. rank_score is NULL wherever category_total is
-- NULL (see support matrix above) — that's intentional, not a bug to patch.
CREATE OR REPLACE VIEW v_api_category_rank AS
SELECT
    s.site_code, pds.category, p.sku AS sku_id, p.name, pds.image_url, pds.price,
    COALESCE(pds.category_index, pds.category_position)                      AS category_index,
    pds.category_total,
    CASE WHEN pds.category_total > 1
         THEN COALESCE(pds.category_index, pds.category_position)::numeric / (pds.category_total - 1)
    END                                                                      AS rank_score,
    pds.is_bestseller, pds.is_new_arrival
FROM v_latest_snapshot pds
JOIN sites s ON s.site_id = pds.site_id
JOIN products p ON p.product_key = pds.product_key
WHERE pds.category IS NOT NULL;

-- 1.2 Rank Movement. Self-joins today's snapshot against each site's prior
-- scrape_date (not "yesterday" literally — sites don't all scrape in lockstep).
CREATE OR REPLACE VIEW v_prior_scrape_date AS
SELECT DISTINCT ON (pds.site_id) pds.site_id, pds.scrape_date AS prior_date
FROM product_daily_snapshot pds
JOIN v_latest_scrape_date l ON l.site_id = pds.site_id
WHERE pds.scrape_date < l.latest_date
ORDER BY pds.site_id, pds.scrape_date DESC;

CREATE OR REPLACE VIEW v_api_rank_movement AS
SELECT
    s.site_code, today.category, p.sku AS sku_id, p.name, today.image_url,
    COALESCE(today.category_index, today.category_position) + 1 AS position_today,
    COALESCE(y.category_index, y.category_position) + 1          AS position_yesterday,
    COALESCE(today.category_index, today.category_position)
      - COALESCE(y.category_index, y.category_position)          AS delta
FROM v_latest_snapshot today
JOIN sites s ON s.site_id = today.site_id
JOIN products p ON p.product_key = today.product_key
JOIN v_prior_scrape_date pr ON pr.site_id = today.site_id
JOIN product_daily_snapshot y
  ON y.product_key = today.product_key AND y.scrape_date = pr.prior_date
WHERE today.category IS NOT NULL
  AND COALESCE(today.category_index, today.category_position) IS NOT NULL
  AND COALESCE(y.category_index, y.category_position) IS NOT NULL;

-- 1.3 Flagged-vs-Catalog Index Gap
CREATE OR REPLACE VIEW v_api_flagged_rank_gap AS
SELECT
    site_code, category,
    ROUND(AVG(rank_score) FILTER (WHERE is_bestseller OR is_new_arrival), 3) AS flagged_avg_score,
    ROUND(AVG(rank_score), 3)                                                AS catalog_avg_score,
    ROUND(AVG(rank_score) FILTER (WHERE is_bestseller OR is_new_arrival) - AVG(rank_score), 3) AS gap,
    COUNT(*) FILTER (WHERE is_bestseller OR is_new_arrival)                  AS flagged_count,
    COUNT(*)                                                                 AS total_count
FROM v_api_category_rank
WHERE rank_score IS NOT NULL
GROUP BY site_code, category;

-- 1.4 Collection Spread
CREATE OR REPLACE VIEW v_api_collection_spread AS
SELECT s.site_code, pds.category, p.sku AS sku_id, p.name, pds.image_url, pds.n_categories
FROM v_latest_snapshot pds
JOIN sites s ON s.site_id = pds.site_id
JOIN products p ON p.product_key = pds.product_key
WHERE pds.category IS NOT NULL AND pds.n_categories IS NOT NULL;

-- 1.5 Top-of-Feed Share
CREATE OR REPLACE VIEW v_api_top_of_feed_share AS
SELECT
    site_code, category,
    ROUND(100.0 * COUNT(*) FILTER (WHERE rank_score <= 0.1) / NULLIF(COUNT(*), 0), 1) AS pct_top_decile,
    COUNT(*)                                                                          AS sku_count
FROM v_api_category_rank
WHERE rank_score IS NOT NULL
GROUP BY site_code, category;
```

### Endpoints + response shapes

| Endpoint | Backing view |
|---|---|
| `GET /analytics/category-rank?companies=...&category=...` | `v_api_category_rank` |
| `GET /analytics/rank-movement?companies=...&category=...` | `v_api_rank_movement` |
| `GET /analytics/flagged-rank-gap?companies=...` | `v_api_flagged_rank_gap` |
| `GET /analytics/collection-spread?companies=...&category=...` | `v_api_collection_spread` |
| `GET /analytics/top-of-feed-share?companies=...` | `v_api_top_of_feed_share` |

```json
// GET /analytics/category-rank?companies=palmonas&category=rings
[{ "site_code": "palmonas", "category": "rings", "sku_id": "PAL-RIN-0007", "name": "Kundan Ring",
   "image_url": "https://.../kundan-ring.jpg", "price": 4600,
   "category_index": 0, "category_total": 38, "rank_score": 0.0,
   "is_best_seller": true, "is_new_arrival": false }]

// GET /analytics/rank-movement?companies=caratlane&category=rings
[{ "site_code": "caratlane", "category": "rings", "sku_id": "CL-4471", "name": "American Diamond Ring",
   "image_url": "https://.../ad-ring.jpg", "position_today": 10, "position_yesterday": 6, "delta": 4 }]

// GET /analytics/flagged-rank-gap?companies=palmonas
[{ "site_code": "palmonas", "category": "pendants", "flagged_avg_score": 0.36,
   "catalog_avg_score": 0.50, "gap": -0.14, "flagged_count": 3, "total_count": 15 }]

// GET /analytics/collection-spread?companies=caratlane&category=pendants
[{ "site_code": "caratlane", "category": "pendants", "sku_id": "CL-9012", "name": "Kundan Pendant",
   "image_url": "https://.../kundan-pendant.jpg", "n_categories": 8 }]

// GET /analytics/top-of-feed-share?companies=palmonas
[{ "site_code": "palmonas", "category": "rings", "pct_top_decile": 10.5, "sku_count": 38 }]
```

### Frontend wiring

`src/lib/api.ts` already has the five client functions
(`getRankedProductsData`, `getRankMovementData`, `getFlaggedGapData`,
`getCollectionSpreadData`, `getTopOfFeedShareData`) — right now each just
returns `src/data/mock-data.ts`'s generators, which reproduce the support
matrix above exactly (see `Company.capabilities` in `src/types/index.ts`).
Swapping each to a real `fetchJson()` call against the endpoints above is
the only change needed once they ship — same drop-in pattern as every
other function in that file. Delete `CAPABILITIES_BY_SITE` from
`src/data/constants.ts` once `GET /sites` returns `capabilities` itself.
