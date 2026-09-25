PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS market_prices;
DROP TABLE IF EXISTS users;

-- Farmers and buyers share one table; `role` decides what they can do.
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    role          TEXT    NOT NULL DEFAULT 'farmer'
                          CHECK (role IN ('farmer', 'buyer')),
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT,
    password_hash TEXT    NOT NULL,
    farm_name     TEXT,
    village       TEXT,
    district      TEXT,
    state         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- A listing. `quantity_available` is live stock in `unit`s.
CREATE TABLE products (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               TEXT    NOT NULL,
    category           TEXT    NOT NULL,
    unit               TEXT    NOT NULL DEFAULT 'kg',
    quantity_available REAL    NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    price_per_unit     REAL    NOT NULL CHECK (price_per_unit > 0),
    description        TEXT,
    harvest_date       TEXT,
    district           TEXT,
    is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_farmer ON products (farmer_id, is_active);
CREATE INDEX idx_products_category ON products (category);

-- Every sale lives here: both off-platform ("direct") cash sales the farmer
-- records and marketplace orders placed by buyers.
CREATE TABLE orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    farmer_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    buyer_name   TEXT    NOT NULL,
    buyer_phone  TEXT,
    quantity     REAL    NOT NULL CHECK (quantity > 0),
    unit_price   REAL    NOT NULL CHECK (unit_price > 0),
    total_amount REAL    NOT NULL CHECK (total_amount >= 0),
    channel      TEXT    NOT NULL DEFAULT 'direct'
                         CHECK (channel IN ('direct', 'marketplace')),
    -- Stock is only taken out of inventory once an order reaches
    -- 'confirmed' or 'completed'; 'pending' is a soft reservation.
    status       TEXT    NOT NULL DEFAULT 'completed'
                         CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes        TEXT,
    ordered_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_farmer ON orders (farmer_id, ordered_at);
CREATE INDEX idx_orders_product ON orders (product_id);
CREATE INDEX idx_orders_status ON orders (status);

-- Historical wholesale/Mandi prices used for the market-trends charts.
CREATE TABLE market_prices (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    category      TEXT    NOT NULL,
    market        TEXT    NOT NULL,
    district      TEXT,
    unit          TEXT    NOT NULL DEFAULT 'kg',
    price_per_unit REAL   NOT NULL CHECK (price_per_unit > 0),
    recorded_on   TEXT    NOT NULL
);

CREATE INDEX idx_market_prices_lookup ON market_prices (category, recorded_on);
