"""Unit tests for the pricing/analytics helpers."""

from datetime import date

import pytest

from agri.db import get_db
from agri.pricing import (
    category_series,
    fair_price_verdict,
    market_average,
    month_label,
    recent_months,
    seasonality,
)


def test_recent_months_spans_year_boundaries():
    months = recent_months(4, today=date(2026, 2, 15))
    assert months == ["2025-11", "2025-12", "2026-01", "2026-02"]


def test_month_label_is_short_and_readable():
    assert month_label("2026-03") == "Mar '26"


def test_category_series_aligns_every_market_to_the_window(app):
    with app.app_context():
        payload = category_series("Vegetables", months=12)
    assert len(payload["months"]) == 12
    assert payload["has_data"] is True
    for entry in payload["series"]:
        assert len(entry["points"]) == 12
        assert [point["month"] for point in entry["points"]] == payload["months"]


def test_market_average_is_per_kg(app):
    with app.app_context():
        average = market_average("Vegetables", window_days=400)
    assert average is not None
    assert average["unit"] == "kg"
    assert 10 < average["avg_price"] < 120


def test_quintal_listing_is_compared_in_quintals(app):
    """A per-quintal price must be compared against the per-quintal benchmark."""
    with app.app_context():
        average = market_average("Grains", window_days=400)
        per_quintal = average["avg_price"] * 100
        # Price the wheat exactly at the benchmark: the verdict should be "fair".
        verdict = fair_price_verdict(per_quintal, "quintal", "Grains", window_days=400)
    assert verdict["available"] is True
    assert verdict["source"] == "mandi"
    assert verdict["verdict"] == "fair"
    assert verdict["expected"] == pytest.approx(round(per_quintal, 2))


def test_underpriced_listing_reports_potential_gain(app):
    with app.app_context():
        average = market_average("Vegetables", window_days=400)
        verdict = fair_price_verdict(
            average["avg_price"] * 0.6, "kg", "Vegetables", window_days=400
        )
    assert verdict["verdict"] == "below"
    assert verdict["gain_per_unit"] > 0


def test_peer_fallback_when_benchmark_data_is_missing(app):
    """Without mandi rows the comparison should fall back to nearby listings."""
    with app.app_context():
        get_db().execute("DELETE FROM market_prices WHERE category = 'Vegetables'")
        get_db().commit()
        verdict = fair_price_verdict(30.0, "kg", "Vegetables", window_days=400)
    assert verdict["available"] is True
    assert verdict["source"] == "peers"
    assert verdict["samples"] > 0


def test_uncomparable_unit_reports_unavailable(app):
    """A per-dozen price cannot be derived from per-kg benchmarks."""
    with app.app_context():
        get_db().execute("DELETE FROM market_prices WHERE category = 'Spices'")
        get_db().commit()
        verdict = fair_price_verdict(40.0, "dozen", "Spices", window_days=400)
    assert verdict["available"] is False
    assert verdict["verdict"] == "unknown"


def test_seasonality_detects_peaks(app):
    with app.app_context():
        payload = seasonality("Vegetables", months=24)
    assert payload["available"] is True
    assert payload["best"]["avg_price"] >= payload["worst"]["avg_price"]
    assert 0 <= payload["best"]["bar_pct"] <= 100
