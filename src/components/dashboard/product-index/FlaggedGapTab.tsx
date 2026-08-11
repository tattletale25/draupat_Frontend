import type { Company, FlaggedGapRow } from '../../../types';
import { CATEGORY_LABELS } from '../../../data/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../ui/Table';
import { NotTrackedNotice } from './NotTrackedNotice';

interface Props {
  companies: Company[];
  rows: FlaggedGapRow[];
}

/** Does a bestseller/new-arrival tag actually earn a SKU better shelf
 * placement, or is it cosmetic? Negative gap = flagged SKUs sit closer to
 * the front than the catalog average. */
export function FlaggedGapTab({ companies, rows }: Props) {
  const supported = companies.filter((c) => c.capabilities.categoryRankScore);
  const unsupported = companies.filter((c) => !c.capabilities.categoryRankScore);
  const supportedCodes = new Set(supported.map((c) => c.siteCode));
  const brandName = (siteCode: string) => companies.find((c) => c.siteCode === siteCode)?.brandName ?? siteCode;

  const filtered = rows
    .filter((r) => supportedCodes.has(r.siteCode))
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flagged-vs-catalog placement gap</CardTitle>
        <CardDescription>
          Negative gap = tagged SKUs sit closer to the front than the catalog average — the tag earns real shelf
          space. Zero or positive = the tag looks cosmetic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unsupported.length > 0 && (
          <div className="not-tracked-list">
            {unsupported.map((c) => (
              <NotTrackedNotice
                key={c.siteCode}
                brandName={c.brandName}
                reason="Depends on Category Rank Score, which this site can't populate."
              />
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="chart-empty">No data for the selected competitors.</div>
        ) : (
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Flagged avg score</TableHead>
                  <TableHead>Catalog avg score</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Flagged SKUs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={`${r.siteCode}-${r.category}`}>
                    <TableCell>{brandName(r.siteCode)}</TableCell>
                    <TableCell>{CATEGORY_LABELS[r.category]}</TableCell>
                    <TableCell>{r.flaggedAvgScore !== null ? r.flaggedAvgScore.toFixed(2) : '—'}</TableCell>
                    <TableCell>{r.catalogAvgScore !== null ? r.catalogAvgScore.toFixed(2) : '—'}</TableCell>
                    <TableCell className={r.gap !== null && r.gap < 0 ? 'delta-down' : 'delta-up'}>
                      {r.gap !== null ? r.gap.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell>
                      {r.flaggedCount} / {r.totalCount}
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
