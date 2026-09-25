# AgriDirect — farmer-friendly agriculture marketplace

A web platform that connects farmers directly with buyers so produce can be sold
without middlemen. Farmers list their harvest, track every sale, and check what
the market is actually paying before they quote a price.

This repo currently implements the **farmer workspace and the market-trends
intelligence layer**, plus a lightweight buyer marketplace so farmers have real
incoming orders to manage.

---

## What works today

**Farmers**
- Email + password accounts with an isolated, per-farmer workspace.
- Listings CRUD: produce name, category, unit, available quantity, asking price,
  harvest date, district and description.
- Stock awareness: in-stock / low-stock / sold-out / paused states, with a
  configurable low-stock threshold.
- Sales ledger for both counter (direct) sales and marketplace orders, with
  filters by listing, status, channel and date range, plus CSV export.
- Order lifecycle: `pending → confirmed → completed`, or `cancelled`. Stock is
  only deducted once an order is confirmed, and is returned if it is cancelled.
- Dashboard KPIs: confirmed revenue, last-30-day revenue with growth vs the
  previous 30 days, average realised price, stock value, low-stock count and
  pending orders, plus a 6-month revenue chart and best-seller ranking.
- **Fair-price alerts**: any listing priced well below the benchmark is flagged
  with the extra money it could earn per unit and on the current stock.

**Buyers**
- Browse and search live listings by produce, farm or village, filter by
  category, and sort by price.
- Listing detail pages with farmer contact details and a transparent
  price-vs-market assessment.
- Place orders (created as `pending` for the farmer to confirm) and review order
  history.

**Market trends (shared)**
- Monthly wholesale (mandi) average price per category across five regional
  markets, 6 / 12 / 24-month windows, dependency-free SVG line chart with hover
  detail, and a district-only ("my district") scope toggle.
- Seasonality panel showing the historically strongest and weakest months for a
  category, plus month-over-month change for every category.
- "Your prices vs the benchmark" table for farmers with the revenue opportunity
  per listing.
- JSON APIs (`/api/prices`, `/api/summary`, `/api/seasonality`) that power the
  UI and can be reused by a mobile client.

---

## Quickstart

```bash
python -m venv .venv          # optional but recommended
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python app.py                 # creates + seeds the database on first run
```

Open <http://127.0.0.1:5000>.

### Demo accounts

| Role   | Email             | Password   |
| ------ | ----------------- | ---------- |
| Farmer | `ramesh@demo.com` | `demo1234` |
| Farmer | `anita@demo.com`  | `demo1234` |
| Buyer  | `sunita@demo.com` | `demo1234` |

The demo dataset (two farms, 15 listings, ~40 sales, 24 months of prices for 8
categories × 5 markets) is generated deterministically on first start.

### Database commands

```bash
flask --app app init-db     # create empty tables
flask --app app seed-db     # wipe and load demo data
flask --app app reset-db    # recreate schema + reseed
```

Set `SECRET_KEY` and (optionally) `AGRI_DATABASE` / `PORT` as environment
variables in production. `AUTO_INIT=0` disables the first-run seeding.

---

## How pricing guidance works

| Question | Answer |
| -------- | ------ |
| Where does the benchmark come from? | `market_prices`: monthly wholesale averages per category and market, seeded for 24 months. |
| Which window is used? | `MARKET_WINDOW_DAYS` (default 90 days) for alerts, or the selected 6/12/24-month window on the trends page. |
| Units differ — is that handled? | Yes. Benchmarks are stored per kg and converted to kg / quintal / tonne / litre before comparison. A per-dozen price has no valid conversion, so it is reported as "no benchmark" instead of a wrong number. |
| No mandi data for a category? | The app falls back to the median asking price of other farmers' live listings in the same category and unit. |
| When is something "below market"? | More than 10% below the benchmark; within ±10% is "fair"; more than 10% above is "above market". |

Benchmarks are decision support, not a promise of sale price — the UI says so on
every page that uses them.

### Stock rules

- `pending` — an order waiting for the farmer. Stock is **not** reserved, so
  several buyers can still enquire about the same lot.
- `confirmed` / `completed` — stock is deducted once, and the action is refused
  if the lot no longer has enough quantity.
- `cancelled` — stock is returned if it had been deducted.

---

## Project layout

```
app.py                    entry point (`python app.py`)
agri/
  __init__.py             app factory, config, Jinja filters
  db.py                   SQLite helpers + `flask` CLI commands
  schema.sql              tables: users, products, orders, market_prices
  security.py             session CSRF protection
  auth.py                 registration, login, role decorators
  market.py               dashboard, listings, sales, marketplace
  trends.py               trends page + JSON APIs
  pricing.py              benchmarks, verdicts, seasonality
  seed.py                 deterministic demo dataset
  templates/              Jinja templates (base, auth, farmer, marketplace, trends)
  static/css|js/          styles and vanilla-JS chart/forms
tests/
  test_app.py             end-to-end flows
  test_pricing.py         analytics unit tests
```

### HTTP API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/prices?category=&months=&scope=` | Monthly series per market for a category |
| `GET` | `/api/summary?months=&scope=` | Latest average + month-over-month change per category |
| `GET` | `/api/seasonality?category=&months=` | Calendar-month averages and peak/trough |
| `GET` | `/sales/export.csv` | Farmer's filtered sales ledger as CSV |

All mutating endpoints are `POST` only and require a CSRF token (issued per
session and embedded as a hidden field in every form).

---

## Tests

```bash
python -m pytest
```

33 tests cover registration and login (including CSRF rejection), listing
validation and ownership isolation, the full sale/order lifecycle with stock
effects, the buyer ordering flow, the trends pages and APIs, unit-converted
benchmarks, peer fallback, and CSV export.

---

## Design notes and next steps

- **No external dependencies** beyond Flask: charts are hand-built SVG, forms are
  plain HTML with server-side validation, and storage is a single SQLite file.
- **Money** is INR and formatted through a `money` Jinja filter; currency comes
  from `app.config["CURRENCY"]`.
- **Demo seeding** does not decrement stock for the historical sales it creates,
  so the listed quantities represent "stock remaining".
- Natural next steps: SMS/WhatsApp notifications when an order arrives, buyer
  ratings, delivery scheduling, per-order chat, weather and sowing advisories,
  and demand forecasting per mandi.
