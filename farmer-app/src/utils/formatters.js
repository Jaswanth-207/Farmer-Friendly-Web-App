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

/**
 * Exports tabular rows to a UTF-8 CSV file download with proper quote escaping.
 */
export function exportToCsv(filename, headers, rows) {
  const escapeCell = (cell) => {
    const str = cell == null ? "" : String(cell);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csvBody = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
