"""Farmer workspace (dashboard, listings, sales) plus the buyer marketplace."""

import csv
import io
from datetime import date, datetime, timedelta

from flask import (
    Blueprint,
    Response,
    abort,
    current_app,
    flash,
    g,
    redirect,
    render_template,
    request,
    url_for,
)

from .auth import farmer_required, login_required
from .constants import (
    CATEGORIES,
    CHANNEL_LABELS,
    ORDER_STATUSES,
    STOCK_TAKING_STATUSES,
    UNITS,
    UNIT_BY_CATEGORY,
)
from .db import execute, query, scalar
from .pricing import (
    fair_price_verdict,
    latest_category_summary,
    month_label,
    recent_months,
    verdict_lookup,
)

bp = Blueprint("market", __name__)


# --------------------------------------------------------------------------
# shared helpers
# --------------------------------------------------------------------------
def stock_state(product, low_stock: int) -> str:
    if not product["is_active"]:
        return "inactive"
    if product["quantity_available"] <= 0:
        return "sold-out"
    if product["quantity_available"] <= low_stock:
        return "low"
    return "in-stock"


STATE_LABELS = {
    "in-stock": "In stock",
    "low": "Low stock",
    "sold-out": "Sold out",
    "inactive": "Paused",
}


def _ordered_at_from_form(raw: str | None) -> str:
    """Store sale timestamps as 'YYYY-MM-DD HH:MM:SS'."""
    if not raw:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        parsed = datetime.strptime(raw[:10], "%Y-%m-%d")
    except ValueError:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return parsed.strftime("%Y-%m-%d 12:00:00")


def _adjust_stock(product_id: int, delta: float) -> None:
    execute(
        """
        UPDATE products
        SET quantity_available = MAX(0, quantity_available + ?), updated_at = datetime('now')
        WHERE id = ?
        """,
        (delta, product_id),
    )


def _own_product_or_404(product_id: int, farmer_id: int):
    product = query(
        "SELECT * FROM products WHERE id = ? AND farmer_id = ?",
        (product_id, farmer_id),
        one=True,
    )
    if product is None:
        abort(404)
    return product


def _validate_product(form, farmer_id: int) -> tuple[dict, dict]:
    values = {
        "name": (form.get("name") or "").strip(),
        "category": (form.get("category") or "").strip(),
        "unit": (form.get("unit") or "").strip(),
        "quantity_available": (form.get("quantity_available") or "").strip(),
        "price_per_unit": (form.get("price_per_unit") or "").strip(),
        "description": (form.get("description") or "").strip(),
        "harvest_date": (form.get("harvest_date") or "").strip(),
        "district": (form.get("district") or "").strip(),
    }
    errors: dict[str, str] = {}

    if len(values["name"]) < 2:
        errors["name"] = "Give the produce a name (at least 2 characters)."
    elif len(values["name"]) > 80:
        errors["name"] = "Keep names under 80 characters."
    if values["category"] not in CATEGORIES:
        errors["category"] = "Pick a valid category."
    if values["unit"] not in UNITS:
        errors["unit"] = "Pick a valid unit."

    try:
        values["quantity_available"] = float(values["quantity_available"])
        if values["quantity_available"] < 0:
            errors["quantity_available"] = "Quantity cannot be negative."
    except ValueError:
        errors["quantity_available"] = "Enter a number, e.g. 250."

    try:
        values["price_per_unit"] = float(values["price_per_unit"])
        if values["price_per_unit"] <= 0:
            errors["price_per_unit"] = "Price must be greater than zero."
    except ValueError:
        errors["price_per_unit"] = "Enter a number, e.g. 24.50."

    if values["harvest_date"]:
        try:
            datetime.strptime(values["harvest_date"], "%Y-%m-%d")
        except ValueError:
            errors["harvest_date"] = "Use a valid date."

    if len(values["description"]) > 600:
        errors["description"] = "Description is too long (600 characters max)."

    return values, errors


def _farmer_kpis(farmer_id: int) -> dict:
    low_stock = current_app.config["LOW_STOCK_THRESHOLD"]
    listings = query(
        """
        SELECT COUNT(*)                                              AS total_listings,
               COALESCE(SUM(is_active), 0)                            AS active_listings,
               COALESCE(SUM(CASE WHEN is_active = 1
                                 THEN quantity_available * price_per_unit
                                 ELSE 0 END), 0)                      AS stock_value,
               COALESCE(SUM(CASE WHEN is_active = 1 AND quantity_available <= ?
                                 THEN 1 ELSE 0 END), 0)                AS low_stock_count
        FROM products
        WHERE farmer_id = ?
        """,
        (low_stock, farmer_id),
        one=True,
    )

    sales = query(
        """
        SELECT COALESCE(SUM(quantity), 0)     AS units_sold,
               COALESCE(SUM(total_amount), 0) AS revenue,
               COUNT(*)                       AS sales_count
        FROM orders
        WHERE farmer_id = ? AND status IN ('confirmed', 'completed')
        """,
        (farmer_id,),
        one=True,
    )

    pending = scalar(
        "SELECT COUNT(*) FROM orders WHERE farmer_id = ? AND status = 'pending'",
        (farmer_id,),
    )

    def revenue_window(clause: str) -> float:
        return scalar(
            f"""
            SELECT COALESCE(SUM(total_amount), 0) FROM orders
            WHERE farmer_id = ? AND status IN ('confirmed', 'completed') AND {clause}
            """,
            (farmer_id,),
        ) or 0.0

    last_30 = revenue_window("ordered_at >= datetime('now', '-30 days')")
    prev_30 = revenue_window(
        "ordered_at >= datetime('now', '-60 days') AND ordered_at < datetime('now', '-30 days')"
    )
    change_pct = None
    if prev_30:
        change_pct = round((last_30 - prev_30) / prev_30 * 100, 1)
    elif last_30:
        change_pct = 100.0

    return {
        "total_listings": listings["total_listings"],
        "active_listings": listings["active_listings"],
        "stock_value": listings["stock_value"],
        "low_stock_count": listings["low_stock_count"],
        "units_sold": sales["units_sold"],
        "revenue": sales["revenue"],
        "sales_count": sales["sales_count"],
        "avg_price_realised": round(sales["revenue"] / sales["units_sold"], 2)
        if sales["units_sold"]
        else 0,
        "pending_orders": pending,
        "revenue_30d": last_30,
        "revenue_30d_prev": prev_30,
        "revenue_change_pct": change_pct,
    }


def _monthly_revenue(farmer_id: int, months: int = 6) -> list[dict]:
    window = recent_months(months)
    rows = query(
        """
        SELECT substr(ordered_at, 1, 7)   AS month,
               SUM(total_amount)          AS revenue,
               SUM(quantity)              AS units
        FROM orders
        WHERE farmer_id = ? AND status IN ('confirmed', 'completed') AND ordered_at >= ?
        GROUP BY month
        """,
        (farmer_id, window[0] + "-01"),
    )
    by_month = {row["month"]: row for row in rows}
    series = [
        {
            "month": month,
            "label": month_label(month),
            "revenue": by_month[month]["revenue"] if month in by_month else 0.0,
            "units": by_month[month]["units"] if month in by_month else 0.0,
        }
        for month in window
    ]
    peak = max((point["revenue"] for point in series), default=0) or 1
    for point in series:
        point["height_pct"] = round(point["revenue"] / peak * 100, 1)
    return series


def _top_products(farmer_id: int, limit: int = 5) -> list:
    return query(
        """
        SELECT p.id, p.name, p.unit,
               SUM(o.quantity)     AS units,
               SUM(o.total_amount) AS revenue
        FROM orders o
        JOIN products p ON p.id = o.product_id
        WHERE o.farmer_id = ? AND o.status IN ('confirmed', 'completed')
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT ?
        """,
        (farmer_id, limit),
    )


def price_alerts(farmer_id: int, district: str | None, limit: int = 6) -> list[dict]:
    """Every underpriced listing, biggest missed revenue first."""
    products = query(
        """
        SELECT * FROM products
        WHERE farmer_id = ? AND is_active = 1 AND quantity_available > 0
        """,
        (farmer_id,),
    )
    lookup = verdict_lookup(
        window_days=current_app.config["MARKET_WINDOW_DAYS"],
        default_district=district,
        exclude_farmer_id=farmer_id,
    )
    alerts = []
    for product in products:
        verdict = lookup(product)
        if verdict["verdict"] == "below" and verdict["gain_per_unit"]:
            alerts.append(
                {
                    "product": product,
                    "verdict": verdict,
                    "upside_per_unit": round(verdict["gain_per_unit"], 2),
                    "upside_total": round(
                        verdict["gain_per_unit"] * product["quantity_available"], 2
                    ),
                }
            )
    alerts.sort(key=lambda alert: alert["upside_total"], reverse=True)
    return alerts[:limit] if limit else alerts


# --------------------------------------------------------------------------
# public pages
# --------------------------------------------------------------------------
@bp.route("/")
def home():
    if g.user is not None:
        if g.user["role"] == "farmer":
            return redirect(url_for("market.dashboard"))
        return redirect(url_for("market.browse"))

    featured = query(
        """
        SELECT p.*, u.name AS farmer_name, u.farm_name, u.village, u.district AS farmer_district
        FROM products p
        JOIN users u ON u.id = p.farmer_id
        WHERE p.is_active = 1 AND p.quantity_available > 0
        ORDER BY p.created_at DESC
        LIMIT 6
        """
    )
    return render_template(
        "home.html",
        featured=featured,
        summary=latest_category_summary(months=12)[:6],
        low_stock=current_app.config["LOW_STOCK_THRESHOLD"],
    )


# --------------------------------------------------------------------------
# farmer dashboard
# --------------------------------------------------------------------------
@bp.route("/dashboard")
@farmer_required
def dashboard():
    farmer_id = g.user["id"]
    kpis = _farmer_kpis(farmer_id)
    low_stock = current_app.config["LOW_STOCK_THRESHOLD"]

    listings = query(
        """
        SELECT * FROM products WHERE farmer_id = ?
        ORDER BY is_active DESC, quantity_available ASC, name
        LIMIT 12
        """,
        (farmer_id,),
    )
    listing_rows = [
        {"product": product, "state": stock_state(product, low_stock)} for product in listings
    ]

    recent_sales = query(
        """
        SELECT o.*, p.name AS product_name, p.unit
        FROM orders o
        JOIN products p ON p.id = o.product_id
        WHERE o.farmer_id = ?
        ORDER BY o.ordered_at DESC
        LIMIT 8
        """,
        (farmer_id,),
    )

    return render_template(
        "farmer/dashboard.html",
        kpis=kpis,
        listing_rows=listing_rows,
        recent_sales=recent_sales,
        monthly_revenue=_monthly_revenue(farmer_id),
        top_products=_top_products(farmer_id),
        alerts=price_alerts(farmer_id, g.user["district"]),
        state_labels=STATE_LABELS,
        low_stock=low_stock,
    )


# --------------------------------------------------------------------------
# listings CRUD
# --------------------------------------------------------------------------
@bp.route("/products")
@farmer_required
def products():
    farmer_id = g.user["id"]
    low_stock = current_app.config["LOW_STOCK_THRESHOLD"]
    search = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    state_filter = (request.args.get("state") or "").strip()

    clauses = ["farmer_id = ?"]
    params: list = [farmer_id]
    if search:
        clauses.append("(name LIKE ? OR description LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    if category in CATEGORIES:
        clauses.append("category = ?")
        params.append(category)

    rows = query(
        f"""
        SELECT p.*,
               COALESCE((SELECT SUM(o.quantity) FROM orders o
                         WHERE o.product_id = p.id
                           AND o.status IN ('confirmed', 'completed')), 0) AS units_sold,
               COALESCE((SELECT SUM(o.total_amount) FROM orders o
                         WHERE o.product_id = p.id
                           AND o.status IN ('confirmed', 'completed')), 0) AS revenue
        FROM products p
        WHERE {' AND '.join(clauses)}
        ORDER BY is_active DESC, name
        """,
        params,
    )

    items = []
    for row in rows:
        state = stock_state(row, low_stock)
        if state_filter and state_filter != state:
            continue
        items.append({"product": row, "state": state})

    return render_template(
        "farmer/products.html",
        items=items,
        state_labels=STATE_LABELS,
        search=search,
        category=category,
        state_filter=state_filter,
        low_stock=low_stock,
    )


@bp.route("/products/new", methods=("GET", "POST"))
@farmer_required
def new_product():
    if request.method == "POST":
        values, errors = _validate_product(request.form, g.user["id"])
        if errors:
            for message in dict.fromkeys(errors.values()):
                flash(message, "error")
            return render_template(
                "farmer/product_form.html", values=values, errors=errors, product=None
            ), 400

        product_id = execute(
            """
            INSERT INTO products (farmer_id, name, category, unit, quantity_available,
                                  price_per_unit, description, harvest_date, district)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                g.user["id"],
                values["name"],
                values["category"],
                values["unit"],
                values["quantity_available"],
                values["price_per_unit"],
                values["description"] or None,
                values["harvest_date"] or None,
                values["district"] or g.user["district"],
            ),
        )
        flash(f"'{values['name']}' is now listed.", "success")
        return redirect(url_for("market.product_detail_owner", product_id=product_id))

    values = {
        "category": "Vegetables",
        "unit": UNIT_BY_CATEGORY["Vegetables"],
        "district": g.user["district"] or "",
        "harvest_date": date.today().isoformat(),
    }
    return render_template(
        "farmer/product_form.html", values=values, errors={}, product=None
    )


@bp.route("/products/<int:product_id>/edit", methods=("GET", "POST"))
@farmer_required
def edit_product(product_id: int):
    product = _own_product_or_404(product_id, g.user["id"])

    if request.method == "POST":
        values, errors = _validate_product(request.form, g.user["id"])
        if errors:
            for message in dict.fromkeys(errors.values()):
                flash(message, "error")
            return render_template(
                "farmer/product_form.html", values=values, errors=errors, product=product
            ), 400

        execute(
            """
            UPDATE products
            SET name = ?, category = ?, unit = ?, quantity_available = ?,
                price_per_unit = ?, description = ?, harvest_date = ?, district = ?,
                updated_at = datetime('now')
            WHERE id = ?
            """,
            (
                values["name"],
                values["category"],
                values["unit"],
                values["quantity_available"],
                values["price_per_unit"],
                values["description"] or None,
                values["harvest_date"] or None,
                values["district"] or None,
                product_id,
            ),
        )
        flash(f"'{values['name']}' updated.", "success")
        return redirect(url_for("market.product_detail_owner", product_id=product_id))

    values = {key: product[key] for key in product.keys()}
    values["description"] = product["description"] or ""
    values["harvest_date"] = product["harvest_date"] or ""
    values["district"] = product["district"] or ""
    return render_template(
        "farmer/product_form.html", values=values, errors={}, product=product
    )


@bp.route("/products/<int:product_id>")
@farmer_required
def product_detail_owner(product_id: int):
    product = _own_product_or_404(product_id, g.user["id"])
    low_stock = current_app.config["LOW_STOCK_THRESHOLD"]
    sales = query(
        """
        SELECT * FROM orders WHERE product_id = ? ORDER BY ordered_at DESC LIMIT 25
        """,
        (product_id,),
    )
    totals = query(
        """
        SELECT COALESCE(SUM(quantity), 0)     AS units,
               COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders WHERE product_id = ? AND status IN ('confirmed', 'completed')
        """,
        (product_id,),
        one=True,
    )
    verdict = fair_price_verdict(
        product["price_per_unit"],
        product["unit"],
        product["category"],
        district=product["district"] or g.user["district"],
        window_days=current_app.config["MARKET_WINDOW_DAYS"],
        exclude_farmer_id=g.user["id"],
    )
    return render_template(
        "farmer/product_detail.html",
        product=product,
        state=stock_state(product, low_stock),
        state_labels=STATE_LABELS,
        sales=sales,
        totals=totals,
        verdict=verdict,
    )


@bp.post("/products/<int:product_id>/toggle")
@farmer_required
def toggle_product(product_id: int):
    product = _own_product_or_404(product_id, g.user["id"])
    execute(
        "UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
        (0 if product["is_active"] else 1, product_id),
    )
    action = "paused" if product["is_active"] else "relisted"
    flash(f"'{product['name']}' {action}.", "success")
    return redirect(request.referrer or url_for("market.products"))


@bp.post("/products/<int:product_id>/delete")
@farmer_required
def delete_product(product_id: int):
    product = _own_product_or_404(product_id, g.user["id"])
    sales_count = scalar("SELECT COUNT(*) FROM orders WHERE product_id = ?", (product_id,))
    if sales_count:
        execute("UPDATE products SET is_active = 0 WHERE id = ?", (product_id,))
        flash(
            f"'{product['name']}' has {sales_count} recorded sale(s), so it was paused instead of deleted "
            "to keep your sales history intact.",
            "warning",
        )
    else:
        execute("DELETE FROM products WHERE id = ?", (product_id,))
        flash(f"'{product['name']}' deleted.", "success")
    return redirect(url_for("market.products"))


# --------------------------------------------------------------------------
# sales tracking
# --------------------------------------------------------------------------
def _sales_filters(farmer_id: int) -> tuple[str, list, dict]:
    filters = {
        "product": request.args.get("product", ""),
        "status": request.args.get("status", ""),
        "start": request.args.get("start", ""),
        "end": request.args.get("end", ""),
        "channel": request.args.get("channel", ""),
    }
    clauses = ["o.farmer_id = ?"]
    params: list = [farmer_id]
    if filters["product"].isdigit():
        clauses.append("o.product_id = ?")
        params.append(int(filters["product"]))
    if filters["status"] in ORDER_STATUSES:
        clauses.append("o.status = ?")
        params.append(filters["status"])
    if filters["channel"] in CHANNEL_LABELS:
        clauses.append("o.channel = ?")
        params.append(filters["channel"])
    if filters["start"]:
        clauses.append("o.ordered_at >= ?")
        params.append(filters["start"] + " 00:00:00")
    if filters["end"]:
        clauses.append("o.ordered_at <= ?")
        params.append(filters["end"] + " 23:59:59")
    return " AND ".join(clauses), params, filters


@bp.route("/sales")
@farmer_required
def sales():
    farmer_id = g.user["id"]
    where, params, filters = _sales_filters(farmer_id)
    rows = query(
        f"""
        SELECT o.*, p.name AS product_name, p.unit
        FROM orders o
        JOIN products p ON p.id = o.product_id
        WHERE {where}
        ORDER BY o.ordered_at DESC
        LIMIT 200
        """,
        params,
    )
    totals = query(
        f"""
        SELECT COUNT(*)                                                         AS orders,
               COALESCE(SUM(CASE WHEN o.status IN ('confirmed', 'completed')
                                 THEN o.total_amount ELSE 0 END), 0)            AS revenue,
               COALESCE(SUM(CASE WHEN o.status IN ('confirmed', 'completed')
                                 THEN o.quantity ELSE 0 END), 0)                AS units,
               COALESCE(SUM(CASE WHEN o.status = 'pending'
                                 THEN o.total_amount ELSE 0 END), 0)            AS pending_value
        FROM orders o
        WHERE {where}
        """,
        params,
        one=True,
    )
    product_options = query(
        "SELECT id, name FROM products WHERE farmer_id = ? ORDER BY name", (farmer_id,)
    )
    return render_template(
        "farmer/sales.html",
        sales=rows,
        totals=totals,
        filters=filters,
        product_options=product_options,
    )


@bp.route("/sales/new", methods=("GET", "POST"))
@farmer_required
def new_sale():
    farmer_id = g.user["id"]
    product_id = request.args.get("product_id", type=int)

    if request.method == "POST":
        raw_product = request.form.get("product_id", "")
        quantity_raw = (request.form.get("quantity") or "").strip()
        price_raw = (request.form.get("unit_price") or "").strip()
        buyer_name = (request.form.get("buyer_name") or "").strip()
        status = (request.form.get("status") or "completed").strip()
        notes = (request.form.get("notes") or "").strip()
        ordered_at = _ordered_at_from_form(request.form.get("ordered_at"))

        product = (
            _own_product_or_404(int(raw_product), farmer_id)
            if raw_product.isdigit()
            else None
        )
        errors = []
        if product is None:
            errors.append("Choose one of your listings.")
        try:
            quantity = float(quantity_raw)
            if quantity <= 0:
                errors.append("Quantity must be greater than zero.")
        except ValueError:
            quantity = 0
            errors.append("Enter a valid quantity.")
        try:
            unit_price = float(price_raw) if price_raw else float(product["price_per_unit"])
            if unit_price <= 0:
                errors.append("Unit price must be greater than zero.")
        except (ValueError, TypeError):
            unit_price = 0
            errors.append("Enter a valid unit price.")
        if len(buyer_name) < 2:
            errors.append("Record who bought the produce.")
        if status not in ORDER_STATUSES:
            errors.append("Pick a valid status.")
        if (
            product is not None
            and quantity
            and status in STOCK_TAKING_STATUSES
            and quantity > product["quantity_available"]
        ):
            errors.append(
                f"Only {product['quantity_available']:g} {product['unit']} of "
                f"'{product['name']}' is available."
            )

        if errors:
            for message in errors:
                flash(message, "error")
            return (
                render_template(
                    "farmer/sale_form.html",
                    product_options=query(
                        "SELECT * FROM products WHERE farmer_id = ? AND is_active = 1 ORDER BY name",
                        (farmer_id,),
                    ),
                    values=request.form,
                    selected_product=product,
                ),
                400,
            )

        order_id = execute(
            """
            INSERT INTO orders (product_id, farmer_id, buyer_id, buyer_name, buyer_phone,
                                quantity, unit_price, total_amount, channel, status, notes, ordered_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'direct', ?, ?, ?)
            """,
            (
                product["id"],
                farmer_id,
                buyer_name,
                (request.form.get("buyer_phone") or "").strip() or None,
                quantity,
                unit_price,
                round(quantity * unit_price, 2),
                status,
                notes or None,
                ordered_at,
            ),
        )
        if status in STOCK_TAKING_STATUSES:
            _adjust_stock(product["id"], -quantity)
        flash("Sale recorded.", "success")
        return redirect(url_for("market.sales"))

    options = query(
        "SELECT * FROM products WHERE farmer_id = ? AND is_active = 1 ORDER BY name",
        (farmer_id,),
    )
    selected = next((p for p in options if p["id"] == product_id), None)
    values = {
        "ordered_at": date.today().isoformat(),
        "status": "completed",
        "unit_price": selected["price_per_unit"] if selected else "",
    }
    return render_template(
        "farmer/sale_form.html",
        product_options=options,
        values=values,
        selected_product=selected,
    )


@bp.post("/sales/<int:order_id>/status")
@farmer_required
def update_sale_status(order_id: int):
    farmer_id = g.user["id"]
    order = query(
        "SELECT * FROM orders WHERE id = ? AND farmer_id = ?", (order_id, farmer_id), one=True
    )
    if order is None:
        abort(404)

    new_status = (request.form.get("status") or "").strip()
    if new_status not in ORDER_STATUSES:
        flash("Unknown status.", "error")
        return redirect(request.referrer or url_for("market.sales"))
    if order["status"] == new_status:
        return redirect(request.referrer or url_for("market.sales"))
    if order["status"] == "cancelled":
        flash("Cancelled sales cannot be reopened.", "warning")
        return redirect(request.referrer or url_for("market.sales"))

    was_taking_stock = order["status"] in STOCK_TAKING_STATUSES
    will_take_stock = new_status in STOCK_TAKING_STATUSES

    if not was_taking_stock and will_take_stock:
        product = query("SELECT * FROM products WHERE id = ?", (order["product_id"],), one=True)
        if product is None:
            abort(404)
        if order["quantity"] > product["quantity_available"]:
            flash(
                f"Cannot confirm: only {product['quantity_available']:g} {product['unit']} of "
                f"'{product['name']}' left in stock.",
                "error",
            )
            return redirect(request.referrer or url_for("market.sales"))
        _adjust_stock(order["product_id"], -order["quantity"])
    elif was_taking_stock and not will_take_stock:
        _adjust_stock(order["product_id"], order["quantity"])

    execute(
        "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
        (new_status, order_id),
    )
    flash(f"Sale marked as {new_status}.", "success")
    return redirect(request.referrer or url_for("market.sales"))


@bp.route("/sales/export.csv")
@farmer_required
def export_sales():
    farmer_id = g.user["id"]
    where, params, _ = _sales_filters(farmer_id)
    rows = query(
        f"""
        SELECT o.ordered_at, p.name AS product_name, o.buyer_name, o.quantity, p.unit,
               o.unit_price, o.total_amount, o.status, o.channel
        FROM orders o
        JOIN products p ON p.id = o.product_id
        WHERE {where}
        ORDER BY o.ordered_at DESC
        """,
        params,
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Date", "Produce", "Buyer", "Quantity", "Unit", "Unit price", "Total", "Status", "Channel"]
    )
    for row in rows:
        writer.writerow(
            [
                row["ordered_at"],
                row["product_name"],
                row["buyer_name"],
                row["quantity"],
                row["unit"],
                row["unit_price"],
                row["total_amount"],
                row["status"],
                CHANNEL_LABELS.get(row["channel"], row["channel"]),
            ]
        )
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales.csv"},
    )


# --------------------------------------------------------------------------
# buyer marketplace
# --------------------------------------------------------------------------
@bp.route("/marketplace")
def browse():
    search = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    sort = request.args.get("sort", "recent")

    clauses = ["p.is_active = 1", "p.quantity_available > 0"]
    params: list = []
    if search:
        clauses.append("(p.name LIKE ? OR u.farm_name LIKE ? OR u.village LIKE ?)")
        params.extend([f"%{search}%"] * 3)
    if category in CATEGORIES:
        clauses.append("p.category = ?")
        params.append(category)

    order_by = {
        "cheap": "p.price_per_unit ASC",
        "expensive": "p.price_per_unit DESC",
        "recent": "p.updated_at DESC",
    }.get(sort, "p.updated_at DESC")

    listings = query(
        f"""
        SELECT p.*, u.name AS farmer_name, u.farm_name, u.village,
               u.district AS farmer_district, u.phone AS farmer_phone
        FROM products p
        JOIN users u ON u.id = p.farmer_id
        WHERE {' AND '.join(clauses)}
        ORDER BY {order_by}
        LIMIT 60
        """,
        params,
    )
    return render_template(
        "marketplace/browse.html",
        listings=listings,
        search=search,
        category=category,
        sort=sort,
        summary=latest_category_summary(months=6, district=None),
    )


@bp.route("/marketplace/<int:product_id>")
def listing_detail(product_id: int):
    product = query(
        """
        SELECT p.*, u.name AS farmer_name, u.farm_name, u.village,
               u.district AS farmer_district, u.state AS farmer_state, u.phone AS farmer_phone
        FROM products p
        JOIN users u ON u.id = p.farmer_id
        WHERE p.id = ? AND p.is_active = 1
        """,
        (product_id,),
        one=True,
    )
    if product is None:
        abort(404)
    verdict = fair_price_verdict(
        product["price_per_unit"],
        product["unit"],
        product["category"],
        district=product["district"],
        window_days=current_app.config["MARKET_WINDOW_DAYS"],
        exclude_farmer_id=product["farmer_id"],
    )
    return render_template("marketplace/detail.html", product=product, verdict=verdict)


@bp.post("/marketplace/<int:product_id>/order")
@login_required
def place_order(product_id: int):
    product = query(
        "SELECT * FROM products WHERE id = ? AND is_active = 1",
        (product_id,),
        one=True,
    )
    if product is None:
        abort(404)
    if product["farmer_id"] == g.user["id"]:
        flash("That is your own listing.", "warning")
        return redirect(url_for("market.listing_detail", product_id=product_id))

    try:
        quantity = float(request.form.get("quantity") or 0)
    except ValueError:
        quantity = 0
    if quantity <= 0:
        flash("Enter the quantity you want to buy.", "error")
        return redirect(url_for("market.listing_detail", product_id=product_id))
    if quantity > product["quantity_available"]:
        flash(
            f"Only {product['quantity_available']:g} {product['unit']} is available.",
            "error",
        )
        return redirect(url_for("market.listing_detail", product_id=product_id))

    execute(
        """
        INSERT INTO orders (product_id, farmer_id, buyer_id, buyer_name, buyer_phone,
                            quantity, unit_price, total_amount, channel, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'marketplace', 'pending', ?)
        """,
        (
            product["id"],
            product["farmer_id"],
            g.user["id"],
            g.user["name"],
            (request.form.get("phone") or g.user["phone"] or "").strip() or None,
            quantity,
            product["price_per_unit"],
            round(quantity * product["price_per_unit"], 2),
            (request.form.get("notes") or "").strip() or None,
        ),
    )
    flash(
        f"Order placed for {quantity:g} {product['unit']} of '{product['name']}'. "
        "The farmer will confirm it shortly.",
        "success",
    )
    return redirect(url_for("market.my_orders"))


@bp.route("/orders")
@login_required
def my_orders():
    orders = query(
        """
        SELECT o.*, p.name AS product_name, p.unit, u.name AS farmer_name, u.farm_name
        FROM orders o
        JOIN products p ON p.id = o.product_id
        JOIN users u ON u.id = o.farmer_id
        WHERE o.buyer_id = ?
        ORDER BY o.ordered_at DESC
        """,
        (g.user["id"],),
    )
    return render_template("marketplace/orders.html", orders=orders)
