/**
 * Thin data-access layer over browser localStorage for AgriDirect.
 * Manages users, produce listings, orders, and APMC Mandi price benchmarks.
 */

import { formatMonthLabel } from "../utils/formatters.js";

const STOCK_DEDUCTING_STATUSES = new Set(["confirmed", "completed"]);

// ---------- safe storage helpers ----------
function get(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

// ---------- users ----------
export function getUsers() {
  return get("agri_users");
}

export function saveUsers(users) {
  return set("agri_users", users);
}

export function getUserByEmail(email) {
  if (!email) return null;
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

// ---------- products ----------
export function getProducts() {
  return get("agri_products");
}

export function getProductById(id) {
  return getProducts().find((p) => p.id === id) || null;
}

export function getProductsByFarmer(farmerId) {
  return getProducts().filter((p) => p.farmer_id === farmerId);
}

export function getActiveProducts() {
  return getProducts().filter((p) => p.is_active && p.quantity_available > 0);
}

export function addProduct(product) {
  const products = getProducts();
  const nextId = Math.max(
    +(localStorage.getItem("agri_next_product_id") || 0),
    products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1
  );
  const newProduct = { ...product, id: nextId, is_active: 1, created_at: new Date().toISOString() };
  products.push(newProduct);
  set("agri_products", products);
  localStorage.setItem("agri_next_product_id", String(nextId + 1));
  return newProduct;
}

export function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates, updated_at: new Date().toISOString() };
  set("agri_products", products);
  return products[idx];
}

export function deleteProduct(id) {
  const orders = getOrders().filter((o) => o.product_id === id);
  if (orders.length > 0) {
    return updateProduct(id, { is_active: 0 });
  }
  set("agri_products", getProducts().filter((p) => p.id !== id));
  return true;
}

export function toggleProduct(id) {
  const p = getProductById(id);
  if (!p) return null;
  return updateProduct(id, { is_active: p.is_active ? 0 : 1 });
}

// ---------- orders ----------
export function getOrders() {
  return get("agri_orders");
}

export function getOrdersByFarmer(farmerId) {
  return getOrders().filter((o) => o.farmer_id === farmerId);
}

export function getOrdersByBuyer(buyerId) {
  return getOrders().filter((o) => o.buyer_id === buyerId);
}

export function addOrder(order) {
  const qty = Number(order.quantity);
  const unitPrice = Number(order.unit_price);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { error: "Order quantity must be greater than 0." };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: "Unit price must be valid." };
  }

  const product = getProductById(order.product_id);
  if (!product) {
    return { error: "Selected produce listing no longer exists." };
  }
  if (STOCK_DEDUCTING_STATUSES.has(order.status) && qty > product.quantity_available) {
    return { error: `Only ${product.quantity_available} ${product.unit} available in stock.` };
  }

  const orders = getOrders();
  const nextId = Math.max(
    +(localStorage.getItem("agri_next_order_id") || 0),
    orders.reduce((max, o) => Math.max(max, Number(o.id) || 0), 0) + 1
  );
  const newOrder = {
    ...order,
    id: nextId,
    quantity: qty,
    unit_price: unitPrice,
    total_amount: +(qty * unitPrice).toFixed(2),
    ordered_at: order.ordered_at || new Date().toISOString().slice(0, 10),
  };

  orders.push(newOrder);
  set("agri_orders", orders);
  localStorage.setItem("agri_next_order_id", String(nextId + 1));

  if (STOCK_DEDUCTING_STATUSES.has(newOrder.status)) {
    updateProduct(product.id, {
      quantity_available: +Math.max(0, product.quantity_available - qty).toFixed(2),
    });
  }

  return { order: newOrder };
}

export function updateOrderStatus(id, newStatus) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return { error: "Order not found." };

  const currentOrder = orders[idx];
  const prevStatus = currentOrder.status;
  if (prevStatus === newStatus) return { order: currentOrder };

  const wasDeducted = STOCK_DEDUCTING_STATUSES.has(prevStatus);
  const willDeduct = STOCK_DEDUCTING_STATUSES.has(newStatus);
  const product = getProductById(currentOrder.product_id);

  if (product) {
    if (!wasDeducted && willDeduct) {
      if (currentOrder.quantity > product.quantity_available) {
        return {
          error: `Insufficient stock for '${product.name}' (${product.quantity_available} ${product.unit} left, order needs ${currentOrder.quantity} ${currentOrder.unit}).`,
        };
      }
      updateProduct(product.id, {
        quantity_available: +Math.max(0, product.quantity_available - currentOrder.quantity).toFixed(2),
      });
    } else if (wasDeducted && !willDeduct) {
      updateProduct(product.id, {
        quantity_available: +(product.quantity_available + currentOrder.quantity).toFixed(2),
      });
    }
  }

  orders[idx] = { ...currentOrder, status: newStatus };
  set("agri_orders", orders);
  return { order: orders[idx] };
}

// ---------- market prices ----------
export function getMarketPrices() {
  return get("agri_market_prices");
}

export function getCategorySeries(category, months = 12) {
  const prices = getMarketPrices().filter((p) => p.category === category);
  const now = new Date();
  const windowMonths = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    windowMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const byMarket = {};
  prices.forEach((p) => {
    const m = p.recorded_on.slice(0, 7);
    if (!byMarket[p.market]) byMarket[p.market] = {};
    if (!byMarket[p.market][m]) byMarket[p.market][m] = [];
    byMarket[p.market][m].push(p.price_per_unit);
  });

  const series = Object.entries(byMarket).map(([market, monthsData]) => ({
    market,
    points: windowMonths.map((m) => ({
      month: m,
      price: monthsData[m]
        ? +(monthsData[m].reduce((a, b) => a + b, 0) / monthsData[m].length).toFixed(2)
        : null,
    })),
  }));

  const overallByMonth = {};
  prices.forEach((p) => {
    const m = p.recorded_on.slice(0, 7);
    if (!overallByMonth[m]) overallByMonth[m] = [];
    overallByMonth[m].push(p.price_per_unit);
  });

  const overall = windowMonths.map((m) => ({
    month: m,
    price: overallByMonth[m]
      ? +(overallByMonth[m].reduce((a, b) => a + b, 0) / overallByMonth[m].length).toFixed(2)
      : null,
  }));

  const filled = overall.filter((p) => p.price !== null).map((p) => p.price);
  let trendPct = null;
  if (filled.length >= 2 && filled[0]) {
    trendPct = +(((filled[filled.length - 1] - filled[0]) / filled[0]) * 100).toFixed(1);
  }

  return {
    category,
    series,
    overall,
    average: filled.length ? +(filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(2) : null,
    latest: filled.length ? filled[filled.length - 1] : null,
    trendPct,
  };
}

export function getCategorySummary(months = 12) {
  const prices = getMarketPrices();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const grouped = {};
  prices
    .filter((p) => new Date(p.recorded_on) >= start)
    .forEach((p) => {
      const m = p.recorded_on.slice(0, 7);
      if (!grouped[p.category]) grouped[p.category] = {};
      if (!grouped[p.category][m]) grouped[p.category][m] = [];
      grouped[p.category][m].push(p.price_per_unit);
    });

  return Object.entries(grouped)
    .map(([category, monthsData]) => {
      const sortedMonths = Object.keys(monthsData).sort();
      const latestMonth = sortedMonths[sortedMonths.length - 1];
      const latestPrices = monthsData[latestMonth];
      const latestAvg = +(latestPrices.reduce((a, b) => a + b, 0) / latestPrices.length).toFixed(2);
      let changePct = null;
      if (sortedMonths.length >= 2) {
        const prevMonth = sortedMonths[sortedMonths.length - 2];
        const prevPrices = monthsData[prevMonth];
        const prevAvg = prevPrices.reduce((a, b) => a + b, 0) / prevPrices.length;
        if (prevAvg) changePct = +(((latestAvg - prevAvg) / prevAvg) * 100).toFixed(1);
      }
      return { category, month: latestMonth, latest: latestAvg, change_pct: changePct };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

// ---------- KPIs ----------
export function getFarmerKPIs(farmerId) {
  const products = getProductsByFarmer(farmerId);
  const orders = getOrdersByFarmer(farmerId);
  const activeProducts = products.filter((p) => p.is_active);
  const completedOrders = orders.filter((o) => STOCK_DEDUCTING_STATUSES.has(o.status));

  const stockValue = activeProducts.reduce((s, p) => s + p.quantity_available * p.price_per_unit, 0);
  const lowStockCount = activeProducts.filter((p) => p.quantity_available <= 25).length;
  const unitsSold = completedOrders.reduce((s, o) => s + o.quantity, 0);
  const revenue = completedOrders.reduce((s, o) => s + o.total_amount, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const now = new Date();
  const d30 = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
  const d60 = new Date(now - 60 * 86400000).toISOString().slice(0, 10);
  const rev30 = completedOrders.filter((o) => o.ordered_at >= d30).reduce((s, o) => s + o.total_amount, 0);
  const rev60 = completedOrders
    .filter((o) => o.ordered_at >= d60 && o.ordered_at < d30)
    .reduce((s, o) => s + o.total_amount, 0);
  let revChange = null;
  if (rev60) revChange = +(((rev30 - rev60) / rev60) * 100).toFixed(1);
  else if (rev30) revChange = 100;

  return {
    totalListings: products.length,
    activeListings: activeProducts.length,
    stockValue,
    lowStockCount,
    unitsSold,
    revenue,
    salesCount: completedOrders.length,
    avgPrice: unitsSold ? +(revenue / unitsSold).toFixed(2) : 0,
    pendingOrders,
    revenue30d: rev30,
    revenueChange: revChange,
  };
}

export function getMonthlyRevenue(farmerId, monthCount = 6) {
  const orders = getOrdersByFarmer(farmerId).filter((o) => STOCK_DEDUCTING_STATUSES.has(o.status));
  const now = new Date();
  const months = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const byMonth = {};
  orders.forEach((o) => {
    const m = o.ordered_at.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = 0;
    byMonth[m] += o.total_amount;
  });
  const series = months.map((m) => ({ month: m, revenue: byMonth[m] || 0, label: formatMonthLabel(m) }));
  const peak = Math.max(...series.map((s) => s.revenue), 1);
  series.forEach((s) => {
    s.heightPct = Math.round((s.revenue / peak) * 100);
  });
  return series;
}
