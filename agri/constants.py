"""Shared vocabulary: categories, units, statuses, currency."""

CURRENCY = "\u20b9"  # Indian Rupee

CATEGORIES = [
    "Vegetables",
    "Fruits",
    "Grains",
    "Pulses",
    "Dairy",
    "Spices",
    "Oilseeds",
    "Other",
]

UNITS = ["kg", "quintal", "tonne", "litre", "dozen", "piece", "crate", "bundle"]

# Sensible default unit for each category, used to prefill forms.
UNIT_BY_CATEGORY = {
    "Vegetables": "kg",
    "Fruits": "kg",
    "Grains": "quintal",
    "Pulses": "kg",
    "Dairy": "litre",
    "Spices": "kg",
    "Oilseeds": "quintal",
    "Other": "kg",
}

ORDER_STATUSES = ["pending", "confirmed", "completed", "cancelled"]

# Only these statuses actually remove stock from inventory.
STOCK_TAKING_STATUSES = {"confirmed", "completed"}

CHANNEL_LABELS = {
    "direct": "Direct sale",
    "marketplace": "Marketplace order",
}

# Market benchmark prices are recorded per kg, so unit conversion is needed
# before we can compare them against a farmer's own listing price.
UNIT_IN_KG = {
    "kg": 1.0,
    "quintal": 100.0,
    "tonne": 1000.0,
    "litre": 1.0,
}
