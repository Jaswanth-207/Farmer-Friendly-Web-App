/**
 * Formatting and unit-normalization helpers for AgriDirect.
 */

const UNIT_TO_KG_FACTOR = {
  kg: 1,
  litre: 1,
  quintal: 100,
  tonne: 1000,
};

export function formatMonthLabel(monthKey) {
  if (!monthKey || !monthKey.includes("-")) return monthKey || "";
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, mo] = monthKey.split("-");
  const idx = Number(mo) - 1;
  return `${names[idx] || mo} '${y.slice(2)}`;
}

export function formatMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const n = Number(value);
  return n === Math.floor(n)
    ? `₹${n.toLocaleString("en-IN")}`
    : `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQty(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const n = Number(value);
  return n === Math.floor(n)
    ? n.toLocaleString("en-IN")
    : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converts a product price to its per-kg equivalent when the unit is weight-based
 * (kg, quintal, tonne) so it can be compared fairly against ₹/kg Mandi benchmarks.
 */
export function normalizePriceToKg(price, unit = "kg") {
  const factor = UNIT_TO_KG_FACTOR[unit] || 1;
  return Number(price) / factor;
}

export function getUnitBenchmarkPrice(mandiPerKg, unit = "kg") {
  const factor = UNIT_TO_KG_FACTOR[unit] || 1;
  return +(Number(mandiPerKg) * factor).toFixed(2);
}

export function isBenchmarkComparableUnit(unit = "kg") {
  return Object.prototype.hasOwnProperty.call(UNIT_TO_KG_FACTOR, unit);
}
