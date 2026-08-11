import type { Category, Company, RankedProduct } from '../../../types';
import { CATEGORY_LABELS } from '../../../data/constants';
import { formatINR, formatNumber } from '../../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { ProductThumb } from './ProductThumb';
import { NotTrackedNotice } from './NotTrackedNotice';

interface Props {
  companies: Company[];
  products: RankedProduct[];
  category: Category;
}

/** One section per selected company: its top 10 most prominently
 * merchandised SKUs in the chosen category, ordered by on-page position. */
export function CategoryRankTab({ companies, products, category }: Props) {
  return (
    <div className="rank-sections">
      {companies.map((company) => {
        if (!company.capabilities.categoryRankScore) {
          return (
            <Card key={company.siteCode}>
              <CardContent>
                <NotTrackedNotice
                  brandName={company.brandName}
                  reason="category_total is never populated for this site's scraper — see API_CONTRACT.md 'Product Index'."
                />
              </CardContent>
            </Card>
          );
        }

        const top10 = products
          .filter((p) => p.siteCode === company.siteCode && p.category === category)
          .sort((a, b) => (a.rankScore ?? 1) - (b.rankScore ?? 1))
          .slice(0, 10);

        return (
          <Card key={company.siteCode}>
            <CardHeader className="row">
              <div>
                <CardTitle>{company.brandName}</CardTitle>
                <CardDescription>
                  Top 10 most prominent {CATEGORY_LABELS[category].toLowerCase()} on-page, by shelf position
                </CardDescription>
              </div>
              {top10.length > 0 && (
                <Badge variant="outline">{formatNumber(top10[0].categoryTotal)} SKUs in feed</Badge>
              )}
            </CardHeader>
            <CardContent>
              {top10.length === 0 ? (
                <div className="chart-empty">No {CATEGORY_LABELS[category].toLowerCase()} tracked for this competitor.</div>
              ) : (
                <div className="product-grid">
                  {top10.map((p, i) => (
                    <div key={p.skuId} className="product-card">
                      <div className="product-card-rank">#{i + 1}</div>
                      <ProductThumb src={p.imageUrl} alt={p.name} size={72} />
                      <div className="product-card-name">{p.name}</div>
                      <div className="product-card-price">{formatINR(p.price, { compact: true })}</div>
                      {(p.isBestSeller || p.isNewArrival) && (
                        <div className="product-card-badges">
                          {p.isBestSeller && <Badge variant="accent">Bestseller</Badge>}
                          {p.isNewArrival && <Badge variant="secondary">New</Badge>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
