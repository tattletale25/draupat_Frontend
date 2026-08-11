import type { Category, CollectionSpreadRow, Company } from '../../../types';
import { CATEGORY_LABELS } from '../../../data/constants';
import { formatNumber } from '../../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../ui/Table';
import { ProductThumb } from './ProductThumb';
import { NotTrackedNotice } from './NotTrackedNotice';

interface Props {
  companies: Company[];
  rows: CollectionSpreadRow[];
}

interface SpreadSummary {
  siteCode: string;
  category: Category;
  avg: number;
  max: number;
  count: number;
}

/** How many distinct collections each SKU is cross-merchandised into — a
 * proxy for how hard a brand is pushing it. Complementary site coverage to
 * Category Rank Score, not the same three sites (see contract). */
export function CollectionSpreadTab({ companies, rows }: Props) {
  const supported = companies.filter((c) => c.capabilities.collectionSpread);
  const unsupported = companies.filter((c) => !c.capabilities.collectionSpread);
  const supportedCodes = new Set(supported.map((c) => c.siteCode));
  const brandName = (siteCode: string) => companies.find((c) => c.siteCode === siteCode)?.brandName ?? siteCode;

  const scoped = rows.filter((r) => supportedCodes.has(r.siteCode));

  const summaryMap = new Map<string, { siteCode: string; category: Category; values: number[] }>();
  for (const r of scoped) {
    const key = `${r.siteCode}:${r.category}`;
    const entry = summaryMap.get(key);
    if (entry) entry.values.push(r.nCategories);
    else summaryMap.set(key, { siteCode: r.siteCode, category: r.category, values: [r.nCategories] });
  }
  const summaryRows: SpreadSummary[] = Array.from(summaryMap.values()).map((s) => ({
    siteCode: s.siteCode,
    category: s.category,
    avg: s.values.reduce((a, b) => a + b, 0) / s.values.length,
    max: Math.max(...s.values),
    count: s.values.length,
  }));

  const leaderboard = [...scoped].sort((a, b) => b.nCategories - a.nCategories).slice(0, 10);

  return (
    <div className="tab-stack">
      <Card>
        <CardHeader>
          <CardTitle>Collection spread by category</CardTitle>
          <CardDescription>Average number of distinct collections a SKU is cross-merchandised into.</CardDescription>
        </CardHeader>
        <CardContent>
          {unsupported.length > 0 && (
            <div className="not-tracked-list">
              {unsupported.map((c) => (
                <NotTrackedNotice
                  key={c.siteCode}
                  brandName={c.brandName}
                  reason="n_categories is never populated for this site's scraper."
                />
              ))}
            </div>
          )}
          {summaryRows.length === 0 ? (
            <div className="chart-empty">No data for the selected competitors.</div>
          ) : (
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Avg. collections/SKU</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>SKUs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((s) => (
                    <TableRow key={`${s.siteCode}-${s.category}`}>
                      <TableCell>{brandName(s.siteCode)}</TableCell>
                      <TableCell>{CATEGORY_LABELS[s.category]}</TableCell>
                      <TableCell>{s.avg.toFixed(1)}</TableCell>
                      <TableCell>{s.max}</TableCell>
                      <TableCell>{formatNumber(s.count)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most cross-merchandised SKUs</CardTitle>
            <CardDescription>Highest collection count — the SKUs each brand is pushing hardest across its own site.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="product-grid">
              {leaderboard.map((r) => (
                <div key={`${r.siteCode}-${r.skuId}`} className="product-card">
                  <div className="product-card-rank">{r.nCategories}×</div>
                  <ProductThumb src={r.imageUrl} alt={r.name} size={72} />
                  <div className="product-card-name">{r.name}</div>
                  <div className="text-muted product-card-meta">
                    {brandName(r.siteCode)} · {CATEGORY_LABELS[r.category]}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
