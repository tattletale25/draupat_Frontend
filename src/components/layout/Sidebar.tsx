import { ROUTES } from '../../router/routes';
import { IconShovel } from '../ui/Icon';

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ activePath, onNavigate }: SidebarProps) {
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
        Data refreshes daily from 5 tracked competitor sites.
      </div>
    </aside>
  );
}
