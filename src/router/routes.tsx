import type { ComponentType } from 'react';
import { IconDashboard, IconLayers } from '../components/ui/Icon';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductIndexPage } from '../pages/ProductIndexPage';

export interface AppRoute {
  path: string; // hash path, e.g. '/dashboard'
  label: string; // sidebar label
  description: string; // topbar subtitle
  icon: ComponentType<{ className?: string }>;
  Component: ComponentType;
}

/**
 * Single source of truth for navigation. To add a new page later:
 *   1. Create src/pages/YourPage.tsx
 *   2. Add one entry to this array
 * Both the sidebar links and the router pick it up automatically —
 * nothing else needs to change.
 */
export const ROUTES: AppRoute[] = [
  {
    path: '/dashboard',
    label: 'Competitor Dashboard',
    description: 'Category price, SKU counts, and price history across tracked competitors',
    icon: IconDashboard,
    Component: DashboardPage,
  },
  {
    path: '/product-index',
    label: 'Product Index',
    description: 'On-page merchandising rank, movement, and cross-listing spread across tracked competitors',
    icon: IconLayers,
    Component: ProductIndexPage,
  },
];

export const DEFAULT_ROUTE = ROUTES[0].path;
