# Competitor jewellery dashboard

Compares CaratLane, GIVA, Palmonas, The Amethyst Store, and Kushal's on:
category-wise price distribution, category-wise SKU count, and category
price fluctuation history — with a CSV export of everything shown.

Currently runs on seeded mock data. See `API_CONTRACT.md` for the real
backend endpoints it's built to call, and how to switch over.

## Why no Tailwind/shadcn CLI/Radix/recharts/react-router

This was built in a sandbox with no npm registry access, so nothing beyond
what Vite scaffolded (`react`, `react-dom`, `vite`, `typescript`) could be
installed. Everything that would normally come from shadcn/ui + Tailwind +
Radix + recharts + react-router-dom is hand-authored instead, in the same
visual style and with the same component boundaries, so swapping any of
them in later (on a machine with normal internet access) is a drop-in
replacement, not a rewrite:

- **Styling**: `src/index.css` (design tokens) + `src/styles/components.css`
  (component classes) — a plain-CSS shadcn "New York" theme instead of
  Tailwind utility classes.
- **Routing**: `src/router/` — a ~15 line hash-based router instead of
  react-router-dom.
- **Charts**: `src/components/charts/` — hand-rolled SVG bar/line charts
  instead of recharts.
- **Icons**: `src/components/ui/Icon.tsx` — a few inline SVGs instead of
  lucide-react.

## Running it

```bash
npm install   # already done in this environment
npm run dev
npm run build
```

## Adding a new page

1. Create `src/pages/YourPage.tsx`.
2. Add one entry to the `ROUTES` array in `src/router/routes.tsx`
   (path, label, description, icon, component).

The sidebar nav and the router both read from that same array, so that's
the only file that needs to change.

## Project layout

```
src/
  types/            shared domain types (Company, CategorySummary, ...)
  data/             constants.ts (tracked competitors, categories)
                     mock-data.ts (seeded synthetic dataset)
  lib/
    api.ts            single data-access layer — swap this to real fetch()
                       calls per API_CONTRACT.md, nothing else changes
    csv-export.ts      generic "download as .csv" utility
    utils.ts           cn(), formatters, seeded RNG helpers
  components/
    ui/               Button, Card, Table, Select, Tabs, Badge, Chip, Icon
    charts/           BarChart, LineChart (generic, reusable)
    dashboard/        the dashboard-specific widgets
    layout/           Sidebar, AppShell
  pages/
    DashboardPage.tsx  the one page today
  router/             routes.tsx (nav config) + useHashRoute.ts
```
