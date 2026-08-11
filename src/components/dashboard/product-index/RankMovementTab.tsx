import type { Category, Company, RankMovementRow } from '../../../types';
import { CATEGORY_LABELS } from '../../../data/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../ui/Table';
import { ProductThumb } from './ProductThumb';
import { NotTrackedNotice } from './NotTrackedNotice';

interface Props {
  companies: Company[];
  rows: RankMovementRow[];
  category: Category;
}

/** Biggest shelf-position movers (either direction) between the two most
 * recent scrapes, for the selected category. A single day-pair delta per
 * SKU — a signed table, not a trend line (see contract caveat on 1.2). */
export function RankMovementTab({ companies, rows, category }: Props) {
  const supported = companies.filter((c) => c.capabilities.rankMovement);
  const unsupported = companies.filter((c) => !c.capabilities.rankMovement);
  const supportedCodes = new Set(supported.map((c) => c.siteCode));
  const brandName = (siteCode: string) => companies.find((c) => c.siteCode === siteCode)?.brandName ?? siteCode;

  const filtered = rows
    .filter((r) => supportedCodes.has(r.siteCode) && r.category === category)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rank movement — {CATEGORY_LABELS[category]}</CardTitle>
        <CardDescription>
          One delta per SKU, scrape over scrape. Negative = moved toward the front (improved). Sorted by biggest
          move, either direction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unsupported.length > 0 && (
          <div className="not-tracked-list">
            {unsupported.map((c) => (
              <NotTrackedNotice
                key={c.siteCode}
                brandName={c.brandName}
                reason="This site's scraper never records an on-page position."
              />
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="chart-empty">No movement data for the selected filters.</div>
        ) : (
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Yesterday</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead>Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={`${r.siteCode}-${r.skuId}`}>
                    <TableCell>
                      <div className="product-row">
                        <ProductThumb src={r.imageUrl} alt={r.name} size={32} />
                        {r.name}
                      </div>
                    </TableCell>
                    <TableCell>{brandName(r.siteCode)}</TableCell>
                    <TableCell>#{r.positionYesterday}</TableCell>
                    <TableCell>#{r.positionToday}</TableCell>
                    <TableCell className={r.delta < 0 ? 'delta-down' : r.delta > 0 ? 'delta-up' : undefined}>
                      {r.delta === 0 ? '—' : r.delta < 0 ? `▲ ${Math.abs(r.delta)}` : `▼ ${r.delta}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        )}
      </CardContent>
    </Card>
  );
}
