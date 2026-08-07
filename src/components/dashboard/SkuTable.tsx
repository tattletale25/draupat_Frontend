import type { CategorySummary, Company } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { CATEGORY_LABELS } from '../../data/constants';
import { formatINR, formatNumber, formatPct } from '../../lib/utils';

interface Props {
  summaries: CategorySummary[];
  companies: Company[];
}

export function SkuTable({ summaries, companies }: Props) {
  const brandName = (siteCode: string) => companies.find((c) => c.siteCode === siteCode)?.brandName ?? siteCode;

  const rows = [...summaries].sort((a, b) => b.skuCount - a.skuCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category detail</CardTitle>
        <CardDescription>
          Every competitor &times; category combination behind the charts above — this is exactly what gets
          exported to CSV.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU count</TableHead>
                <TableHead>In stock</TableHead>
                <TableHead>Min price</TableHead>
                <TableHead>Avg price</TableHead>
                <TableHead>Median price</TableHead>
                <TableHead>Max price</TableHead>
                <TableHead>Avg discount</TableHead>
                <TableHead>Price band mix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.siteCode}-${r.category}`}>
                  <TableCell>{brandName(r.siteCode)}</TableCell>
                  <TableCell>{CATEGORY_LABELS[r.category]}</TableCell>
                  <TableCell>{formatNumber(r.skuCount)}</TableCell>
                  <TableCell>{formatNumber(r.skuCountInStock)}</TableCell>
                  <TableCell>{formatINR(r.minPrice)}</TableCell>
                  <TableCell>{formatINR(r.avgPrice)}</TableCell>
                  <TableCell>{formatINR(r.medianPrice)}</TableCell>
                  <TableCell>{formatINR(r.maxPrice)}</TableCell>
                  <TableCell>{formatPct(r.avgDiscountPct)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">E {r.priceBandMix.entry}</Badge>{' '}
                    <Badge variant="outline">M {r.priceBandMix.mid}</Badge>{' '}
                    <Badge variant="outline">P {r.priceBandMix.premium}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      </CardContent>
    </Card>
  );
}
