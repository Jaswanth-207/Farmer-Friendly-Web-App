"""Application factory for the farmer marketplace."""

import os
from datetime import date, datetime

from flask import Flask, render_template

from .constants import CATEGORIES, CHANNEL_LABELS, CURRENCY, ORDER_STATUSES, UNITS, UNIT_BY_CATEGORY
from . import db, security


def create_app(test_config=None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-secret-change-me"),
        DATABASE=os.environ.get(
            "AGRI_DATABASE", os.path.join(app.instance_path, "agri.sqlite")
        ),
        CURRENCY=CURRENCY,
        # Listings at or below this stock level are flagged as low stock.
        LOW_STOCK_THRESHOLD=25,
        # Days of market data used for the fair-price comparison.
        MARKET_WINDOW_DAYS=90,
        AUTO_INIT=True,
    )
    if test_config is None:
        app.config.from_pyfile("config.py", silent=True)
    else:
        app.config.update(test_config)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    security.init_app(app)

    from . import auth, market, trends

    auth.init_app(app)
    app.register_blueprint(auth.bp)
    app.register_blueprint(market.bp)
    app.register_blueprint(trends.bp)

    _register_jinja(app)

    @app.errorhandler(400)
    def bad_request(error):
        return render_template("error.html", code=400, message=str(error.description)), 400

    @app.errorhandler(404)
    def not_found(error):
        return render_template("error.html", code=404, message="That page does not exist."), 404

    if app.config["AUTO_INIT"]:
        with app.app_context():
            db.ensure_initialized()

    return app


def _register_jinja(app) -> None:
    currency = app.config["CURRENCY"]

    @app.template_filter("money")
    def money(value):
        try:
            value = float(value)
        except (TypeError, ValueError):
            return "-"
        if value == int(value):
            return f"{currency}{int(value):,}"
        return f"{currency}{value:,.2f}"

    @app.template_filter("qty")
    def qty(value):
        try:
            value = float(value)
        except (TypeError, ValueError):
            return "-"
        if value == int(value):
            return f"{int(value):,}"
        return f"{value:,.2f}"

    @app.template_filter("date_short")
    def date_short(value):
        """Accept 'YYYY-MM-DD', 'YYYY-MM' or a datetime string."""
        if not value:
            return "-"
        text = str(value)
        fmt = "%Y-%m-%d %H:%M:%S" if len(text) > 10 else "%Y-%m-%d"
        if len(text) == 7:
            fmt = "%Y-%m"
        try:
            parsed = datetime.strptime(text[:19] if len(text) > 10 else text, fmt)
        except ValueError:
            return text
        return parsed.strftime("%d %b %Y")

    @app.template_filter("month_label")
    def month_label(value):
        """'2026-03' -> \"Mar '26\"."""
        if not value:
            return "-"
        try:
            parsed = datetime.strptime(str(value)[:7], "%Y-%m")
        except ValueError:
            return value
        return parsed.strftime("%b '%y")

    @app.context_processor
    def inject_globals():
        return {
            "CATEGORIES": CATEGORIES,
            "UNITS": UNITS,
            "UNIT_BY_CATEGORY": UNIT_BY_CATEGORY,
            "ORDER_STATUSES": ORDER_STATUSES,
            "CHANNEL_LABELS": CHANNEL_LABELS,
            "CURRENCY": CURRENCY,
            "TODAY": date.today().isoformat(),
        }
