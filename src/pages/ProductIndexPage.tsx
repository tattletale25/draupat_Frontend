import { useEffect, useMemo, useState } from 'react';
import {
  getCollectionSpreadData,
  getCompanies,
  getFlaggedGapData,
  getRankMovementData,
  getRankedProductsData,
  getTopOfFeedShareData,
} from '../lib/api';
import { CATEGORIES } from '../types';
import type {
  Category,
  CollectionSpreadRow,
  Company,
  FlaggedGapRow,
  RankMovementRow,
  RankedProduct,
  TopOfFeedShareRow,
} from '../types';
import { CATEGORY_LABELS } from '../data/constants';
import { CompetitorFilter } from '../components/dashboard/CompetitorFilter';
import { Tabs } from '../components/ui/Tabs';
import { Select } from '../components/ui/Select';
import { CategoryRankTab } from '../components/dashboard/product-index/CategoryRankTab';
import { RankMovementTab } from '../components/dashboard/product-index/RankMovementTab';
import { FlaggedGapTab } from '../components/dashboard/product-index/FlaggedGapTab';
import { CollectionSpreadTab } from '../components/dashboard/product-index/CollectionSpreadTab';
import { TopOfFeedShareTab } from '../components/dashboard/product-index/TopOfFeedShareTab';

type TabKey = 'rank' | 'movement' | 'gap' | 'spread' | 'share';

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: 'rank', label: 'Category Rank Score' },
  { value: 'movement', label: 'Rank Movement' },
  { value: 'gap', label: 'Flagged vs. Catalog' },
  { value: 'spread', label: 'Collection Spread' },
  { value: 'share', label: 'Top-of-Feed Share' },
];

// These two tabs browse one category at a time (product grids/tables get
// unreadable across all 5 at once); the other three compare across
// categories, so they use their own category axis instead.
const CATEGORY_SCOPED_TABS: TabKey[] = ['rank', 'movement'];

export function ProductIndexPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ranked, setRanked] = useState<RankedProduct[]>([]);
  const [movement, setMovement] = useState<RankMovementRow[]>([]);
  const [gap, setGap] = useState<FlaggedGapRow[]>([]);
  const [spread, setSpread] = useState<CollectionSpreadRow[]>([]);
  const [share, setShare] = useState<TopOfFeedShareRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState<Category>('rings');
  const [tab, setTab] = useState<TabKey>('rank');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getCompanies(),
      getRankedProductsData(),
      getRankMovementData(),
      getFlaggedGapData(),
      getCollectionSpreadData(),
      getTopOfFeedShareData(),
    ])
      .then(([c, r, m, g, s, sh]) => {
        setCompanies(c);
        setRanked(r);
        setMovement(m);
        setGap(g);
        setSpread(s);
        setShare(sh);
        setSelected(c.map((x) => x.siteCode));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load product index data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selected.includes(c.siteCode)),
    [companies, selected],
  );

  function toggleCompany(siteCode: string) {
    setSelected((prev) =>
      prev.includes(siteCode) ? prev.filter((s) => s !== siteCode) : [...prev, siteCode],
    );
  }

  if (loading) {
    return <div className="chart-empty">Loading product index…</div>;
  }
  if (error) {
    return <div className="chart-empty">Couldn't load product index: {error}</div>;
  }

  return (
    <>
      <div className="toolbar">
        <CompetitorFilter
          companies={companies}
          selected={selected}
          onToggle={toggleCompany}
          onSelectAll={() => setSelected(companies.map((c) => c.siteCode))}
        />
        {CATEGORY_SCOPED_TABS.includes(tab) && (
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Tabs value={tab} onChange={setTab} options={TAB_OPTIONS} />

      {tab === 'rank' && (
        <CategoryRankTab companies={selectedCompanies} products={ranked} category={category} />
      )}
      {tab === 'movement' && (
        <RankMovementTab companies={selectedCompanies} rows={movement} category={category} />
      )}
      {tab === 'gap' && <FlaggedGapTab companies={selectedCompanies} rows={gap} />}
      {tab === 'spread' && <CollectionSpreadTab companies={selectedCompanies} rows={spread} />}
      {tab === 'share' && <TopOfFeedShareTab companies={selectedCompanies} rows={share} />}
    </>
  );
}
