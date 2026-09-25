"""Market trends: charts of benchmark prices plus the JSON feeds behind them."""

from flask import Blueprint, jsonify, render_template, request

from .constants import CATEGORIES
from .db import query
from .pricing import (
    category_series,
    latest_category_summary,
    month_label,
    recent_months,
    seasonality,
    verdict_lookup,
)

bp = Blueprint("trends", __name__)

ALLOWED_MONTH_WINDOWS = (6, 12, 24)
DEFAULT_WINDOW = 12


def _month_window() -> int:
    try:
        months = int(request.args.get("months", DEFAULT_WINDOW))
    except (TypeError, ValueError):
        months = DEFAULT_WINDOW
    return months if months in ALLOWED_MONTH_WINDOWS else DEFAULT_WINDOW


def _scope(user) -> tuple[str, str | None]:
    """'mine' narrows the benchmark to the signed-in farmer's district."""
    scope = request.args.get("scope", "all")
    if scope == "mine" and user is not None and user["district"]:
        return "mine", user["district"]
    return "all", None


def _categories_with_data() -> list[str]:
    rows = query("SELECT DISTINCT category FROM market_prices ORDER BY category")
    known = [row["category"] for row in rows]
    return known or list(CATEGORIES)


def _resolve_category(default_category: str | None = None) -> str:
    category = request.args.get("category")
    available = _categories_with_data()
    if category in available:
        return category
    if default_category in available:
        return default_category
    return available[0]


@bp.route("/trends")
def index():
    from flask import g

    user = g.get("user")
    months = _month_window()
    scope, district = _scope(user)

    # Default to the category the farmer has the most stock value in.
    default_category = None
    if user is not None and user["role"] == "farmer":
        default_category = query(
            """
            SELECT category FROM products
            WHERE farmer_id = ? AND is_active = 1
            GROUP BY category
            ORDER BY SUM(quantity_available * price_per_unit) DESC
            LIMIT 1
            """,
            (user["id"],),
            one=True,
        )
        default_category = default_category["category"] if default_category else None

    category = _resolve_category(default_category)
    series = category_series(category, months=months, district=district)

    my_listings = []
    if user is not None and user["role"] == "farmer":
        listings = query(
            """
            SELECT * FROM products
            WHERE farmer_id = ? AND is_active = 1
            ORDER BY quantity_available * price_per_unit DESC
            LIMIT 10
            """,
            (user["id"],),
        )
        lookup = verdict_lookup(
            window_days=90, default_district=district, exclude_farmer_id=user["id"]
        )
        for product in listings:
            my_listings.append({"product": product, "verdict": lookup(product)})

    return render_template(
        "trends/index.html",
        category=category,
        categories=_categories_with_data(),
        months=months,
        months_options=ALLOWED_MONTH_WINDOWS,
        scope=scope,
        district=district,
        series=series,
        summary=latest_category_summary(months=months, district=district),
        season=seasonality(category, months=months, district=district),
        my_listings=my_listings,
    )


# --------------------------------------------------------------------------
# JSON APIs
# --------------------------------------------------------------------------
@bp.get("/api/prices")
def api_prices():
    from flask import g

    scope, district = _scope(g.get("user"))
    months = _month_window()
    category = _resolve_category()
    payload = category_series(category, months=months, district=district)
    payload["scope"] = scope
    payload["currency"] = "INR"
    return jsonify(payload)


@bp.get("/api/summary")
def api_summary():
    from flask import g

    scope, district = _scope(g.get("user"))
    months = _month_window()
    return jsonify(
        {
            "months": months,
            "scope": scope,
            "window": recent_months(months),
            "categories": latest_category_summary(months=months, district=district),
        }
    )


@bp.get("/api/seasonality")
def api_seasonality():
    from flask import g

    scope, district = _scope(g.get("user"))
    months = _month_window()
    category = _resolve_category()
    return jsonify(
        {
            "category": category,
            "scope": scope,
            "months": months,
            "seasonality": seasonality(category, months=months, district=district),
            "labels": [month_label(m) for m in recent_months(months)],
        }
    )
