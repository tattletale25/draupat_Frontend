import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { AppRoute } from '../../router/routes';

interface AppShellProps {
  activePath: string;
  onNavigate: (path: string) => void;
  route: AppRoute;
  children: ReactNode;
}

export function AppShell({ activePath, onNavigate, route, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar activePath={activePath} onNavigate={onNavigate} />
      <div className="app-main">
        <header className="topbar">
          <div>
            <h1>{route.label}</h1>
            <div className="desc">{route.description}</div>
          </div>
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
