import type { ComponentType } from 'react';
import {
  IconCheckCircle,
  IconDashboard,
  IconLayers,
  IconMessageCircle,
  IconPackage,
  IconTag,
  IconTrendingUp,
} from '../components/ui/Icon';
import { AskAwayPage } from '../pages/AskAwayPage';
import { AssortmentPage } from '../pages/AssortmentPage';
import { AvailabilityPage } from '../pages/AvailabilityPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DiscountingPage } from '../pages/DiscountingPage';
import { PricingPage } from '../pages/PricingPage';
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
  {
    path: '/assortment',
    label: 'Assortment',
    description: 'SKU count per category and net catalog change, across tracked competitors',
    icon: IconPackage,
    Component: AssortmentPage,
  },
  {
    path: '/pricing',
    label: 'Pricing',
    description: 'Price positioning, price-band mix, and category price distribution across tracked competitors',
    icon: IconTag,
    Component: PricingPage,
  },
  {
    path: '/discounting',
    label: 'Discounting',
    description: 'Average discount depth and breadth, across tracked competitors',
    icon: IconTrendingUp,
    Component: DiscountingPage,
  },
  {
    path: '/availability',
    label: 'Availability',
    description: 'In-stock rate by brand and category, across tracked competitors',
    icon: IconCheckCircle,
    Component: AvailabilityPage,
  },
  {
    path: '/ask-away',
    label: 'Ask Away',
    description: 'Free-text Q&A over the tracked competitor data, with a chart when one helps',
    icon: IconMessageCircle,
    Component: AskAwayPage,
  },
];

export const DEFAULT_ROUTE = ROUTES[0].path;
