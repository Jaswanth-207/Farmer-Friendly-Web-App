"""Deterministic demo dataset so the app is usable the moment it starts."""

import math
import random
from datetime import date, datetime, timedelta

from werkzeug.security import generate_password_hash

from .db import get_db

RANDOM_SEED = 20260925

DEMO_PASSWORD = "demo1234"

FARMERS = [
    {
        "name": "Ramesh Patil",
        "email": "ramesh@demo.com",
        "phone": "9820011223",
        "farm_name": "Patil Farms",
        "village": "Shirur",
        "district": "Nashik",
        "state": "Maharashtra",
    },
    {
        "name": "Anita Devi",
        "email": "anita@demo.com",
        "phone": "9410055667",
        "farm_name": "Devi Organics",
        "village": "Barwani",
        "district": "Indore",
        "state": "Madhya Pradesh",
    },
]

BUYER = {
    "name": "Sunita Traders",
    "email": "sunita@demo.com",
    "phone": "9873344556",
    "farm_name": "Sunita Wholesale",
    "village": "Nashik Road",
    "district": "Nashik",
    "state": "Maharashtra",
}

# Benchmark wholesale price per kg, and how sharply it swings with the season.
CATEGORY_BASE_PRICE = {
    "Vegetables": 28.0,
    "Fruits": 66.0,
    "Grains": 24.0,
    "Pulses": 92.0,
    "Dairy": 48.0,
    "Spices": 315.0,
    "Oilseeds": 58.0,
    "Other": 35.0,
}
CATEGORY_PHASE = {
    "Vegetables": 2.0,
    "Fruits": 5.5,
    "Grains": 9.0,
    "Pulses": 8.0,
    "Dairy": 1.0,
    "Spices": 6.5,
    "Oilseeds": 7.5,
    "Other": 4.0,
}
CATEGORY_VOLATILITY = {
    "Vegetables": 0.22,
    "Fruits": 0.18,
    "Grains": 0.08,
    "Pulses": 0.11,
    "Dairy": 0.05,
    "Spices": 0.16,
    "Oilseeds": 0.09,
    "Other": 0.12,
}

MARKETS = [
    ("Nashik APMC", "Nashik", 0.98),
    ("Pune Market Yard", "Pune", 1.06),
    ("Indore Krishi Upaj Mandi", "Indore", 0.95),
    ("Raipur Mandi", "Raipur", 0.92),
    ("Azadpur Mandi", "Delhi", 1.12),
]

MARKET_PRICE_MONTHS = 24

# (name, category, unit, asking price, stock, description)
LISTINGS = {
    "ramesh@demo.com": [
        ("Tomatoes", "Vegetables", "kg", 29.5, 900, "Fresh hybrid tomatoes, hand-picked this week."),
        ("Onions", "Vegetables", "kg", 21.0, 1500, "Firm red onions, stored dry and graded."),
        ("Grapes (Thompson)", "Fruits", "kg", 68.0, 400, "Export-quality seedless grapes from Nashik."),
        ("Pomegranate", "Fruits", "kg", 92.0, 250, "Bhagwa variety, medium to large fruit."),
        ("Wheat (Sharbati)", "Grains", "quintal", 2480.0, 60, "Clean, moisture-checked Sharbati wheat."),
        ("Tur Dal", "Pulses", "kg", 82.0, 300, "Unpolished tur dal, machine cleaned."),
        ("Groundnut", "Oilseeds", "quintal", 5900.0, 40, "Bold groundnut, sun dried."),
        ("Cow Milk", "Dairy", "litre", 52.0, 120, "Daily morning collection, chilled."),
        ("Turmeric", "Spices", "kg", 318.0, 120, "Sangli turmeric fingers, 5% curcumin."),
        ("Green Chilli", "Vegetables", "kg", 15.0, 18, "Pungent local chilli - last of the lot, priced to clear."),
    ],
    "anita@demo.com": [
        ("Soybean", "Oilseeds", "quintal", 4620.0, 80, "Locally grown soybean, low moisture."),
        ("Chickpeas (Chana)", "Pulses", "quintal", 5350.0, 35, "Desi chana, hand sorted."),
        ("Red Chilli", "Spices", "kg", 208.0, 200, "Sun-dried Guntur-style red chilli."),
        ("Bhindi (Okra)", "Vegetables", "kg", 31.0, 150, "Tender okra, cut every morning."),
        ("Buffalo Milk", "Dairy", "litre", 58.0, 90, "Rich buffalo milk, 6.5% fat."),
    ],
}

BUYER_NAMES = [
    "Sunita Traders",
    "Kisan Retail Mart",
    "Green Basket Foods",
    "Hotel Annapurna",
    "Shree Wholesale",
    "Local Haat Vendor",
    "Fresh Cart Groceries",
    "Maa Bhagwati Kirana",
]


def _iso_month_start(offset_months: int, today: date) -> str:
    raw = today.month - offset_months
    year = today.year + (raw - 1) // 12
    month = (raw - 1) % 12 + 1
    return f"{year:04d}-{month:02d}-01"


def _seed_market_prices(rng: random.Random, db) -> None:
    today = date.today()
    rows = []
    for offset in range(MARKET_PRICE_MONTHS - 1, -1, -1):
        recorded_on = _iso_month_start(offset, today)
        year = int(recorded_on[:4])
        month = int(recorded_on[5:7])
        for category, base in CATEGORY_BASE_PRICE.items():
            phase = CATEGORY_PHASE[category]
            volatility = CATEGORY_VOLATILITY[category]
            seasonal = 1 + volatility * math.sin(2 * math.pi * (month + phase) / 12)
            # Gentle multi-year drift so long-range charts show a real trend.
            drift = 1 + 0.012 * ((year * 12 + month) - (today.year * 12 + today.month))
            for market, district, market_factor in MARKETS:
                noise = 1 + rng.uniform(-0.035, 0.035)
                price = base * seasonal * market_factor * drift * noise
                rows.append(
                    (category, market, district, "kg", round(price, 2), recorded_on)
                )
    db.executemany(
        """
        INSERT INTO market_prices (category, market, district, unit, price_per_unit, recorded_on)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def _seed_users(db) -> dict:
    password_hash = generate_password_hash(DEMO_PASSWORD)
    ids = {}
    created = (datetime.now() - timedelta(days=210)).strftime("%Y-%m-%d %H:%M:%S")
    for farmer in FARMERS:
        cur = db.execute(
            """
            INSERT INTO users (role, name, email, phone, password_hash, farm_name,
                               village, district, state, created_at)
            VALUES ('farmer', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                farmer["name"],
                farmer["email"],
                farmer["phone"],
                password_hash,
                farmer["farm_name"],
                farmer["village"],
                farmer["district"],
                farmer["state"],
                created,
            ),
        )
        ids[farmer["email"]] = cur.lastrowid
    cur = db.execute(
        """
        INSERT INTO users (role, name, email, phone, password_hash, farm_name,
                           village, district, state, created_at)
        VALUES ('buyer', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            BUYER["name"],
            BUYER["email"],
            BUYER["phone"],
            password_hash,
            BUYER["farm_name"],
            BUYER["village"],
            BUYER["district"],
            BUYER["state"],
            (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
    )
    ids[BUYER["email"]] = cur.lastrowid
    return ids


def _seed_listings(rng: random.Random, db, farmer_ids: dict) -> list[tuple]:
    """Insert listings and return (product_id, price, stock, unit) for order seeding."""
    created_products = []
    for email, items in LISTINGS.items():
        farmer_id = farmer_ids[email]
        district = next(f for f in FARMERS if f["email"] == email)["district"]
        for name, category, unit, price, stock, description in items:
            listing_age = rng.randint(20, 95)
            created = (datetime.now() - timedelta(days=listing_age)).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            updated = (datetime.now() - timedelta(days=rng.randint(0, 12))).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            harvest = (date.today() - timedelta(days=rng.randint(2, 40))).isoformat()
            cur = db.execute(
                """
                INSERT INTO products (farmer_id, name, category, unit, quantity_available,
                                      price_per_unit, description, harvest_date, district,
                                      is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    farmer_id,
                    name,
                    category,
                    unit,
                    float(stock),
                    float(price),
                    description,
                    harvest,
                    district,
                    created,
                    updated,
                ),
            )
            created_products.append((farmer_id, cur.lastrowid, float(price), unit))
    return created_products


def _seed_orders(rng: random.Random, db, farmer_ids: dict, products: list[tuple]) -> None:
    buyer_id = farmer_ids[BUYER["email"]]
    by_farmer: dict[int, list] = {}
    for farmer_id, product_id, price, unit in products:
        by_farmer.setdefault(farmer_id, []).append((product_id, price, unit))

    rows = []
    for farmer_id, farmer_products in by_farmer.items():
        sales_count = 26 if len(farmer_products) > 6 else 16
        for _ in range(sales_count):
            product_id, base_price, unit = rng.choice(farmer_products)
            # A typical lot: a few units of a quintal-priced crop, more of a per-kg one.
            if unit in {"quintal", "tonne"}:
                quantity = rng.choice([1, 2, 3, 4, 5])
            elif unit == "litre":
                quantity = rng.choice([20, 40, 60, 80, 100])
            else:
                quantity = rng.choice([15, 25, 40, 60, 90, 120, 180])
            # Prices are negotiated, so they wander a little around the asking price.
            unit_price = round(base_price * rng.uniform(0.86, 1.06), 2)
            roll = rng.random()
            if roll < 0.78:
                status = "completed"
            elif roll < 0.87:
                status = "confirmed"
            elif roll < 0.95:
                status = "pending"
            else:
                status = "cancelled"
            channel = "marketplace" if rng.random() < 0.35 else "direct"
            ordered_at = (
                datetime.now() - timedelta(days=rng.randint(0, 150), hours=rng.randint(0, 20))
            ).strftime("%Y-%m-%d %H:%M:%S")
            buyer_name = BUYER["name"] if channel == "marketplace" else rng.choice(BUYER_NAMES)
            rows.append(
                (
                    product_id,
                    farmer_id,
                    buyer_id if channel == "marketplace" else None,
                    buyer_name,
                    None,
                    float(quantity),
                    unit_price,
                    round(quantity * unit_price, 2),
                    channel,
                    status,
                    None,
                    ordered_at,
                    ordered_at,
                )
            )
    db.executemany(
        """
        INSERT INTO orders (product_id, farmer_id, buyer_id, buyer_name, buyer_phone,
                            quantity, unit_price, total_amount, channel, status, notes,
                            ordered_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def seed() -> None:
    """Populate an empty database with demo users, listings, sales and prices."""
    rng = random.Random(RANDOM_SEED)
    db = get_db()
    farmer_ids = _seed_users(db)
    products = _seed_listings(rng, db, farmer_ids)
    _seed_orders(rng, db, farmer_ids, products)
    _seed_market_prices(rng, db)
    db.commit()
