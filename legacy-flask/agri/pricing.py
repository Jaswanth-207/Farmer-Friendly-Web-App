"""Market price analytics: monthly series, benchmarks and fair-price verdicts."""

from datetime import date
from statistics import median

from .constants import UNIT_IN_KG
from .db import query, scalar

# Benchmark data is stored per kg, so a listing priced per quintal/tonne/litre
# still needs a conversion before it can be compared.
COMPARABLE_UNITS = set(UNIT_IN_KG)


def recent_months(count: int = 12, today: date | None = None) -> list[str]:
    """Return the last `count` months as 'YYYY-MM', oldest first."""
    today = today or date.today()
    months = []
    for step in range(count - 1, -1, -1):
        raw = today.month - step
        year = today.year + (raw - 1) // 12
        month = (raw - 1) % 12 + 1
        months.append(f"{year:04d}-{month:02d}")
    return months


def month_label(value: str) -> str:
    if not value:
        return "-"
    year, month = value[:7].split("-")
    names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    return f"{names[int(month) - 1]} '{year[2:]}"


def _window_start(months: int) -> str:
    return recent_months(months)[0] + "-01"


def category_series(category: str, months: int = 12, district: str | None = None) -> dict:
    """Monthly average price per market for one category."""
    window = recent_months(months)
    start = _window_start(months)
    params: list = [category, start]
    district_clause = ""
    if district:
        district_clause = " AND district = ?"
        params.append(district)

    rows = query(
        f"""
        SELECT market,
               substr(recorded_on, 1, 7) AS month,
               AVG(price_per_unit)       AS avg_price,
               MAX(unit)                 AS unit
        FROM market_prices
        WHERE category = ? AND recorded_on >= ?{district_clause}
        GROUP BY market, month
        ORDER BY market, month
        """,
        params,
    )

    by_market: dict[str, dict] = {}
    for row in rows:
        by_market.setdefault(row["market"], {})[row["month"]] = round(row["avg_price"], 2)

    series = [
        {
            "market": market,
            "unit": "kg",
            "points": [{"month": m, "label": month_label(m), "price": points.get(m)} for m in window],
        }
        for market, points in sorted(by_market.items())
    ]

    overall_rows = query(
        f"""
        SELECT substr(recorded_on, 1, 7) AS month, AVG(price_per_unit) AS avg_price
        FROM market_prices
        WHERE category = ? AND recorded_on >= ?{district_clause}
        GROUP BY month
        ORDER BY month
        """,
        params,
    )
    overall_map = {row["month"]: round(row["avg_price"], 2) for row in overall_rows}
    overall = [
        {"month": m, "label": month_label(m), "price": overall_map.get(m)} for m in window
    ]

    filled = [p["price"] for p in overall if p["price"] is not None]
    trend_pct = None
    if len(filled) >= 2 and filled[0]:
        trend_pct = round((filled[-1] - filled[0]) / filled[0] * 100, 1)

    return {
        "category": category,
        "months": window,
        "series": series,
        "overall": overall,
        "average": round(sum(filled) / len(filled), 2) if filled else None,
        "latest": filled[-1] if filled else None,
        "trend_pct": trend_pct,
        "district": district,
        "has_data": bool(rows),
        "unit": "kg",
    }


def latest_category_summary(months: int = 12, district: str | None = None) -> list[dict]:
    """Latest monthly average + month-over-month change for every category."""
    start = _window_start(months)
    params: list = [start]
    district_clause = ""
    if district:
        district_clause = " AND district = ?"
        params.append(district)

    rows = query(
        f"""
        SELECT category,
               substr(recorded_on, 1, 7) AS month,
               AVG(price_per_unit)       AS avg_price
        FROM market_prices
        WHERE recorded_on >= ?{district_clause}
        GROUP BY category, month
        ORDER BY category, month
        """,
        params,
    )

    grouped: dict[str, list] = {}
    for row in rows:
        grouped.setdefault(row["category"], []).append(
            (row["month"], row["avg_price"])
        )

    summary = []
    for category, points in grouped.items():
        latest_month, latest_price = points[-1]
        change_pct = None
        if len(points) >= 2 and points[-2][1]:
            previous = points[-2][1]
            change_pct = round((latest_price - previous) / previous * 100, 1)
        summary.append(
            {
                "category": category,
                "month": latest_month,
                "latest": round(latest_price, 2),
                "change_pct": change_pct,
                "unit": "kg",
            }
        )
    summary.sort(key=lambda item: item["category"])
    return summary


def market_average(category: str, window_days: int = 90, district: str | None = None) -> dict | None:
    """Average benchmark price (per kg) for a category over a recent window."""
    start = (date.today().toordinal() - window_days)
    start_date = date.fromordinal(start).isoformat()
    params: list = [category, start_date]
    district_clause = ""
    if district:
        district_clause = " AND district = ?"
        params.append(district)

    row = query(
        f"""
        SELECT AVG(price_per_unit) AS avg_price,
               MAX(unit)           AS unit,
               COUNT(*)            AS samples,
               MIN(recorded_on)    AS from_date,
               MAX(recorded_on)    AS to_date
        FROM market_prices
        WHERE category = ? AND recorded_on >= ?{district_clause}
        """,
        params,
        one=True,
    )
    if row is None or row["avg_price"] is None:
        return None
    return {
        "avg_price": row["avg_price"],
        "unit": row["unit"] or "kg",
        "samples": row["samples"],
        "from_date": row["from_date"],
        "to_date": row["to_date"],
    }


def peer_price(category: str, unit: str, exclude_farmer_id: int | None = None) -> dict | None:
    """Median asking price of other farmers' live listings in the same category."""
    params: list = [category, unit]
    exclude_clause = ""
    if exclude_farmer_id is not None:
        exclude_clause = " AND farmer_id != ?"
        params.append(exclude_farmer_id)

    prices = [
        row["price_per_unit"]
        for row in query(
            f"""
            SELECT price_per_unit FROM products
            WHERE category = ? AND unit = ? AND is_active = 1
              AND quantity_available > 0{exclude_clause}
            """,
            params,
        )
    ]
    if not prices:
        return None
    return {"median_price": round(median(prices), 2), "samples": len(prices)}


def benchmark_for(
    category: str,
    unit: str,
    *,
    district: str | None = None,
    window_days: int = 90,
    exclude_farmer_id: int | None = None,
) -> dict:
    """The price a listing unit *should* fetch, from mandi data or peer prices."""
    benchmark = market_average(category, window_days=window_days, district=district)
    if benchmark and benchmark["unit"] == "kg" and unit in COMPARABLE_UNITS:
        return {
            "available": True,
            "source": "mandi",
            "expected": benchmark["avg_price"] * UNIT_IN_KG[unit],
            "samples": benchmark["samples"],
        }

    peers = peer_price(category, unit, exclude_farmer_id=exclude_farmer_id)
    if peers:
        return {
            "available": True,
            "source": "peers",
            "expected": peers["median_price"],
            "samples": peers["samples"],
        }

    return {"available": False, "source": None, "expected": None, "samples": 0}


def classify(price: float, benchmark: dict) -> dict:
    """Turn a benchmark comparison into a below / fair / above verdict."""
    if not benchmark["available"] or not benchmark["expected"]:
        return {
            "available": False,
            "verdict": "unknown",
            "source": benchmark["source"],
            "expected": None,
            "delta_pct": None,
            "gain_per_unit": None,
            "samples": benchmark["samples"],
        }

    expected = benchmark["expected"]
    delta_pct = round((price - expected) / expected * 100, 1)
    if delta_pct <= -10:
        verdict = "below"
    elif delta_pct >= 10:
        verdict = "above"
    else:
        verdict = "fair"

    return {
        "available": True,
        "verdict": verdict,
        "source": benchmark["source"],
        "expected": round(expected, 2),
        "delta_pct": delta_pct,
        "gain_per_unit": round(expected - price, 2) if expected > price else 0.0,
        "samples": benchmark["samples"],
    }


def fair_price_verdict(
    price: float,
    unit: str,
    category: str,
    *,
    district: str | None = None,
    window_days: int = 90,
    exclude_farmer_id: int | None = None,
) -> dict:
    """Compare one listing price against the market, then against peer listings."""
    benchmark = benchmark_for(
        category,
        unit,
        district=district,
        window_days=window_days,
        exclude_farmer_id=exclude_farmer_id,
    )
    return classify(price, benchmark)


def verdict_lookup(
    *,
    window_days: int = 90,
    default_district: str | None = None,
    exclude_farmer_id: int | None = None,
):
    """Return a cached ``product -> verdict`` function.

    Sellers often list several products in the same category, unit and district;
    caching the benchmark keeps this to one market query per combination.
    """
    cache: dict[tuple, dict] = {}

    def lookup(product) -> dict:
        district = product["district"] or default_district
        key = (product["category"], product["unit"], district)
        if key not in cache:
            cache[key] = benchmark_for(
                key[0],
                key[1],
                district=key[2],
                window_days=window_days,
                exclude_farmer_id=exclude_farmer_id,
            )
        return classify(product["price_per_unit"], cache[key])

    return lookup


MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def seasonality(category: str, months: int = 24, district: str | None = None) -> dict:
    """Average price per calendar month, to show when a crop peaks."""
    start = _window_start(months)
    params: list = [category, start]
    district_clause = ""
    if district:
        district_clause = " AND district = ?"
        params.append(district)

    rows = query(
        f"""
        SELECT substr(recorded_on, 6, 2) AS month_num,
               AVG(price_per_unit)       AS avg_price,
               COUNT(*)                  AS samples
        FROM market_prices
        WHERE category = ? AND recorded_on >= ?{district_clause}
        GROUP BY month_num
        ORDER BY month_num
        """,
        params,
    )
    if not rows:
        return {"available": False, "points": [], "best": None, "worst": None, "average": None}

    average = sum(row["avg_price"] for row in rows) / len(rows)
    points = []
    for row in rows:
        month_num = int(row["month_num"])
        points.append(
            {
                "month_num": month_num,
                "label": MONTH_NAMES[month_num - 1],
                "avg_price": round(row["avg_price"], 2),
                "samples": row["samples"],
                "delta_pct": round((row["avg_price"] - average) / average * 100, 1)
                if average
                else None,
            }
        )
    best = max(points, key=lambda p: p["avg_price"])
    worst = min(points, key=lambda p: p["avg_price"])
    peak = max((abs(p["delta_pct"] or 0) for p in points), default=0) or 1
    for point in points:
        point["bar_pct"] = round(abs(point["delta_pct"] or 0) / peak * 100, 1)
    return {
        "available": True,
        "points": points,
        "best": best,
        "worst": worst,
        "average": round(average, 2),
    }


def total_market_samples() -> int:
    return scalar("SELECT COUNT(*) FROM market_prices")
