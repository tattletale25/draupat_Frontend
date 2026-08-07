import type { Company } from '../../types';
import { ChipToggle } from '../ui/Chip';
import { Button } from '../ui/Button';

interface CompetitorFilterProps {
  companies: Company[];
  selected: string[];
  onToggle: (siteCode: string) => void;
  onSelectAll: () => void;
}

export function CompetitorFilter({ companies, selected, onToggle, onSelectAll }: CompetitorFilterProps) {
  const allSelected = selected.length === companies.length;
  return (
    <div className="filter-row">
      {companies.map((c) => (
        <ChipToggle
          key={c.siteCode}
          label={c.brandName}
          color={c.color}
          checked={selected.includes(c.siteCode)}
          onChange={() => onToggle(c.siteCode)}
        />
      ))}
      {!allSelected && (
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          Select all
        </Button>
      )}
    </div>
  );
}
