# Project Understanding — AgriDirect (`farmer-app`)

> **Architecture Note:** This is a **frontend-only** React application. There is no backend server or external database; all data and demo authentication state are stored locally in the browser's `localStorage`. *(Note: The repository root also contains legacy Flask/Python files — `app.py`, `agri/`, `tests/`, `requirements.txt` — from an earlier iteration, while the active frontend application resides in `farmer-app/`.)*

---

## 1. Project Overview

**AgriDirect** is a client-side web application designed as a direct **farmer-to-buyer agricultural marketplace** with integrated **APMC Mandi price benchmarking**.

- **Problem Solved:** Small and regional farmers often rely on intermediaries, lack visibility into historical wholesale (Mandi) rates, and track cash/online sales in disconnected records. Buyers similarly lack a transparent view of local farm inventory and fair pricing.
- **Purpose:** Provide farmers with a unified workspace to list harvests, track inventory and revenue, record both direct counter sales and marketplace orders, and benchmark their asking prices against 24-month regional Mandi data—while allowing buyers to discover produce and place purchase orders directly.

---

## 2. Project Functionality

### Public & Discovery Features
- **Home (`/`)**: Hero overview, quick demo login credentials, a **Live Market Benchmarks** table (latest average ₹/kg and month-over-month trend across 6 crop categories), a **Freshly Listed Produce** grid (up to 6 active listings), and 3 feature highlight cards.
- **Buyer Marketplace (`/marketplace`)**: Search produce by crop name, farm name, district, or village; filter by category (dropdown + quick-filter pills); and sort by recently added, price low-to-high, or price high-to-low.
- **Marketplace Listing Detail (`/marketplace/:id`)**: Shows produce details, farmer/farm origin, a **Fair-Price Benchmark** badge comparing the asking price to the 6-month Mandi average, and a **Purchase Order** form (quantity, contact phone, delivery/pickup notes, live total calculation). Requires sign-in and blocks farmers from ordering their own listings.
- **Mandi Price Trends (`/trends`)**: Interactive Recharts area/line chart comparing the overall Mandi average against 5 regional hubs (*Nashik APMC*, *Pune Market Yard*, *Indore Krishi Upaj Mandi*, *Raipur Mandi*, *Azadpur Mandi*) across **6, 12, or 24 months** for 8 crop categories, paired with KPI cards and a category comparison table.

### Authentication & Role-Based Access
- **Sign In (`/login`) & Register (`/register`)**: Role selection (`farmer` or `buyer`) with preset demo accounts (`ramesh@demo.com`, `anita@demo.com`, `sunita@demo.com`, password `demo1234`).
- **Route Guards (`App.jsx`)**: `FarmerRoute` restricts `/dashboard`, `/products/*`, and `/sales/*` to signed-in farmers; `BuyerRoute` restricts `/orders` to signed-in users.

### Farmer Workspace
- **Dashboard (`/dashboard`)**: Displays 4 KPI cards (30-day revenue & MoM change, active stock value, completed sales & units sold, pending orders & low-stock alerts), a custom animated **6-Month Revenue Trend** bar chart, **My Produce Stock** table, and **Recent Sales Ledger**.
- **Harvest Listings (`/products`, `/products/new`, `/products/:id`, `/products/:id/edit`)**:
  - Search and filter listings by category and stock status (`in-stock` > 25, `low` ≤ 25, `sold-out` ≤ 0, `inactive`/paused).
  - Create/edit listings with automatic default unit selection per category (`UNIT_BY_CATEGORY`).
  - View listing-level KPIs, Fair-Price Mandi comparison banner, and per-product sales history; pause/relist or delete/retire listings.
- **Sales & Orders Ledger (`/sales`, `/sales/new`)**:
  - Filter sales by buyer/produce, status (`pending`, `confirmed`, `completed`, `cancelled`), or product.
  - Update order statuses inline, export filtered sales to **CSV**, and record offline/direct cash sales (`/sales/new`) with automatic stock deduction for `confirmed`/`completed` entries.

### Buyer Workspace
- **My Purchase Orders (`/orders`)**: Lists the signed-in buyer's placed orders sorted by date, showing quantity, unit price, total amount, channel, notes, and status badges.

---

## 3. Technology Stack

| Layer | Technology | Version (from `package.json`) | Purpose |
|---|---|---|---|
| UI Library | React | `^19.3.1` | Component-based UI |
| Build Tool | Vite + `@vitejs/plugin-react` | `^8.3.6` / `^6.1.2` | Dev server & production bundling |
| Routing | `react-router-dom` | `^7.18.5` | Client-side SPA routing & guards |
| Animations | `framer-motion` | `^14.12.0` | Page transitions & card animations |
| Charts | `recharts` | `^3.10.1` | Interactive Mandi price trend charts |
| Icons | `lucide-react` | `^1.72.0` | UI iconography |
| Linting | `oxlint` | `^1.90.0` | Fast JS/React linting (`.oxlintrc.json`) |
| Styling | Custom CSS + Google Fonts (`Inter`) | — | Dark-theme design tokens & responsive layout |
| Persistence | Browser `localStorage` | — | Client-side state for users, products, orders, prices |
| Deployment | Vercel (`vercel.json`) | — | SPA rewrite rules (`/(.*)` → `/index.html`) |

---

## 4. Project Structure

```text
Farmer-Friendly-Web-App/
├── README.md                      # Root documentation (references farmer-app/)
├── PROJECT_UNDERSTANDING.md       # Project architecture & milestone analysis
├── legacy-flask/                  # Relocated legacy Flask/Python files (app.py, agri/, tests/, requirements.txt)
└── farmer-app/                    # Active frontend-only React + Vite application
    ├── .oxlintrc.json             # Oxlint configuration (react, oxc plugins)
    ├── index.html                 # HTML entry point, favicon link & Google Fonts (Inter)
    ├── package.json               # Scripts (dev, build, lint, preview) & dependencies
    ├── pnpm-lock.yaml             # Lockfile
    ├── vercel.json                # Vercel SPA routing rewrites
    ├── vite.config.js             # Vite configuration
    ├── public/                    # Static assets (favicon.svg)
    └── src/
        ├── main.jsx               # React root mount + initStore() seed call
        ├── App.jsx                # Lazy-loaded SPA router setup & route guards
        ├── styles/
        │   └── index.css          # Global dark-theme CSS variables, layout, cards, tables, responsive rules
        ├── layouts/
        │   └── Layout.jsx         # Sticky header, role-based nav, mobile menu, footer
        ├── context/
        │   ├── contexts.js        # React Context objects (AuthContext, ToastContext)
        │   ├── AuthContext.jsx    # Session state, login(), register(), logout()
        │   └── ToastContext.jsx   # ToastProvider notification stack
        ├── hooks/
        │   ├── useAuth.js         # Custom hook for AuthContext
        │   └── useToast.js        # Custom hook for ToastContext
        ├── components/
        │   ├── PageTransition.jsx # Framer Motion route transition wrapper
        │   ├── ProductCard.jsx    # Reusable produce card for Home & Marketplace
        │   └── RouteGuards.jsx    # FarmerRoute & BuyerRoute guards
        ├── data/
        │   └── seed.js            # Demo users, 15 products, 42 orders, 960 Mandi prices
        ├── services/
        │   └── storageService.js  # localStorage CRUD, KPIs, series/summary aggregators
        ├── utils/
        │   └── formatters.js      # Currency/qty/date formatters & kg unit normalization
        └── pages/
            ├── Home.jsx           # Landing page & live benchmark preview
            ├── Login.jsx          # Sign-in form with demo presets
            ├── Register.jsx       # Farmer/Buyer registration form
            ├── Dashboard.jsx      # Farmer KPIs, 6-month revenue chart, stock & sales
            ├── Products.jsx       # Farmer listings table with filters & actions
            ├── ProductForm.jsx    # Create / edit produce listing form
            ├── ProductDetail.jsx  # Listing KPIs, Mandi fair-price verdict, sales log
            ├── Sales.jsx          # Sales & orders ledger with status updates & CSV export
            ├── SaleForm.jsx       # Record direct cash/counter sale form
            ├── Marketplace.jsx    # Public produce search, filter & sort
            ├── MarketplaceDetail.jsx # Produce detail, unit-normalized Mandi verdict & order placement
            ├── Orders.jsx         # Buyer purchase orders history
            ├── Trends.jsx         # Interactive Recharts Mandi price trends
            └── NotFound.jsx       # 404 fallback page
```

---

## 5. Existing Implementation Status

### Completed
- Complete 14-page SPA with role-aware navigation (`Layout.jsx`) and route guards (`App.jsx`).
- Deterministic seeded `localStorage` dataset (`seed.js`) and data-access/KPI layer (`store.js`).
- Full Farmer CRUD for listings, direct sale recording, order status management, and CSV export.
- Buyer marketplace browsing, filtering, sorting, order placement, and order tracking.
- Interactive Recharts Mandi price visualization across 5 markets and 3 time horizons.
- Toast notifications and Framer Motion transitions.

### Partially Completed / Observed Issues
1. **Registration Password Handling (`AuthContext.jsx` / `Register.jsx`)**: `Register.jsx` validates a password input, but `register()` never stores it, and `login()` checks every user against the hardcoded `DEMO_PASSWORD` (`"demo1234"`).
2. **Stock Sync on Order Status Change (`store.js`)**: `addOrder()` deducts product stock when an order is created as `confirmed` or `completed`, but `updateOrderStatus()` does not deduct stock when a `pending` marketplace order is confirmed/completed (nor restore it if cancelled).
3. **Mandi Benchmark Unit Mismatch (`ProductDetail.jsx` / `MarketplaceDetail.jsx`)**: Market prices in `seed.js` are all in `₹/kg`, whereas Grain and Oilseed listings use `quintal` (100 kg). Comparing a ₹2,480/quintal wheat listing directly against a ~₹24/kg benchmark produces distorted percentage differences.
4. **Unused Template Files & Props**: `src/App.css`, `src/assets/*`, and `public/icons.svg` are leftover Vite starter files. `ProductCard.jsx` declares `onToggle` and `onDelete` props that are unused; `NotFound.jsx` and `Trends.jsx` have unused icon/chart imports.
5. **Mobile & UX Rough Edges**: `Dashboard.jsx` uses `minmax(400px, 1fr)` for its two-column grid (risking horizontal overflow on small phones), and `Products.jsx` / `ProductDetail.jsx` use native `window.confirm()` dialogs instead of custom UI modals.
6. **Repository Clutter**: Legacy Flask files (`app.py`, `agri/`, `tests/`, `requirements.txt`) remain in the root alongside `farmer-app/`, and `resetStore()` in `seed.js` has no UI button to reset demo data.

### Missing
- Frontend automated tests (component/unit tests) and a UI control to reset demo `localStorage` data.
- Clean repository organization separating or removing legacy backend files if strictly frontend-only.

---

## 6. Three Academic Reviews (Chronological Milestones)

### Review 1 — Foundation, Design System & Public Discovery
- **Scope**: Project architecture, Vite + React setup, dark-theme CSS design system (`index.css`), shared layout & navigation (`Layout.jsx`, `PageTransition.jsx`, `Toast.jsx`), seeded `localStorage` data layer (`seed.js`, `store.js`), **Home** landing page (`Home.jsx`), **Marketplace** browsing/filtering (`Marketplace.jsx`, `ProductCard.jsx`), and **Mandi Price Trends** (`Trends.jsx`).
- **Outcome**: Working public-facing UI demonstrating the problem statement, visual design, seeded regional Mandi analytics, and produce discovery.

### Review 2 — Role-Based Workflows, CRUD & Order Lifecycle
- **Scope**: Client-side authentication & protected routes (`AuthContext.jsx`, `Login.jsx`, `Register.jsx`), **Farmer Dashboard** (`Dashboard.jsx`), **Harvest Listings CRUD** (`Products.jsx`, `ProductForm.jsx`, `ProductDetail.jsx`), **Sales & Direct Sale Recording** (`Sales.jsx`, `SaleForm.jsx`) with CSV export, and **Buyer Order Placement & Tracking** (`MarketplaceDetail.jsx`, `Orders.jsx`).
- **Outcome**: End-to-end interactive farmer and buyer workflows operating on `localStorage`.

### Review 3 — Bug Fixes, Cleanup, Optimization & Deployment Readiness
- **Scope**:
  - Fix unit normalization in Fair-Price Mandi comparisons (`kg` vs `quintal`/`tonne`).
  - Synchronize product stock on order confirmation/cancellation in `store.js`.
  - Fix registration/login password handling in `AuthContext.jsx` (while clearly documenting demo client-side storage).
  - Remove unused Vite starter files (`App.css`, unused assets), clean unused imports/props, and organize/clean legacy root files.
  - Improve mobile responsiveness (`Dashboard.jsx` grid, tables) and replace `window.confirm` with accessible confirmation UI.
  - Run `oxlint` and `vite build`, verify all routes and responsive breakpoints, update `README.md`, and validate Vercel SPA deployment (`vercel.json`).
