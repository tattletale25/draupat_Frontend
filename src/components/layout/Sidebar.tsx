import { useEffect, useState } from 'react';
import { ROUTES } from '../../router/routes';
import { IconShovel } from '../ui/Icon';
import { getCompanies } from '../../lib/api';

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ activePath, onNavigate }: SidebarProps) {
  // Reuses getCompanies()'s cached promise (every page already fetches it),
  // so this costs no extra network round trip — just keeps the tracked-site
  // count from silently drifting out of sync with /sites as brands are
  // added/removed.
  const [siteCount, setSiteCount] = useState<number | null>(null);

  useEffect(() => {
    getCompanies()
      .then((companies) => setSiteCount(companies.length))
      .catch(() => setSiteCount(null));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="mark">
          <IconShovel width={14} height={14} />
        </div>
        <div>
          <div className="name">draupat</div>
          <div className="sub">Competitor intel</div>
        </div>
      </div>

      <div className="sidebar-section-label">Analytics</div>
      {ROUTES.map((route) => (
        <button
          key={route.path}
          type="button"
          className="sidebar-link"
          data-active={activePath === route.path}
          onClick={() => onNavigate(route.path)}
        >
          <route.icon />
          <span className="label">{route.label}</span>
        </button>
      ))}

      <div className="sidebar-foot">
        {siteCount === null
          ? 'Data refreshes daily.'
          : `Data refreshes daily from ${siteCount} tracked competitor sites.`}
      </div>
    </aside>
  );
}
