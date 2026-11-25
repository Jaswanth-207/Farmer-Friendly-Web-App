import test from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage polyfill for Node.js test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { initStore, resetStore } = await import("../src/data/seed.js");
const {
  getUsers,
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  addOrder,
  updateOrderStatus,
  getFarmerKPIs,
  getMonthlyRevenue,
} = await import("../src/services/storageService.js");
const { normalizePriceToKg, getUnitBenchmarkPrice } = await import("../src/utils/formatters.js");

test("initStore seeds demo users (including admin), products, orders, and market prices", () => {
  localStorage.clear();
  initStore();

  const users = getUsers();
  assert.equal(users.length, 4);
  assert.ok(users.some((u) => u.email === "admin@demo.com" && u.role === "admin"));
  assert.equal(getProducts().length, 15);
});

test("addOrder deducts stock for confirmed/completed and prevents overselling", () => {
  resetStore();
  const product = getProductById(1); // Tomatoes, 900 kg
  const initialStock = product.quantity_available;

  const invalid = addOrder({
    product_id: 1,
    farmer_id: 1,
    buyer_id: 3,
    buyer_name: "Test Buyer",
    quantity: 0,
    unit_price: 29.5,
    status: "confirmed",
    channel: "direct",
  });
  assert.ok(invalid.error);

  const oversell = addOrder({
    product_id: 1,
    farmer_id: 1,
    buyer_id: 3,
    buyer_name: "Test Buyer",
    quantity: initialStock + 50,
    unit_price: 29.5,
    status: "confirmed",
    channel: "direct",
  });
  assert.ok(oversell.error);

  const valid = addOrder({
    product_id: 1,
    farmer_id: 1,
    buyer_id: 3,
    buyer_name: "Test Buyer",
    quantity: 50,
    unit_price: 29.5,
    status: "confirmed",
    channel: "direct",
  });
  assert.equal(valid.order.total_amount, 1475);
  assert.equal(getProductById(1).quantity_available, initialStock - 50);
});

test("updateOrderStatus synchronizes stock on confirm and cancel", () => {
  resetStore();
  const product = getProductById(2); // Onions, 1500 kg
  const initialStock = product.quantity_available;

  const placed = addOrder({
    product_id: 2,
    farmer_id: 1,
    buyer_id: 3,
    buyer_name: "Sunita Traders",
    quantity: 100,
    unit_price: 21,
    status: "pending",
    channel: "marketplace",
  });
  // Pending order does not deduct stock yet
  assert.equal(getProductById(2).quantity_available, initialStock);

  // Confirming deducts stock
  const confirmed = updateOrderStatus(placed.order.id, "confirmed");
  assert.equal(confirmed.order.status, "confirmed");
  assert.equal(getProductById(2).quantity_available, initialStock - 100);

  // Cancelling restores stock
  const cancelled = updateOrderStatus(placed.order.id, "cancelled");
  assert.equal(cancelled.order.status, "cancelled");
  assert.equal(getProductById(2).quantity_available, initialStock);

  // Confirming fails if stock was reduced below order quantity
  updateProduct(2, { quantity_available: 10 });
  const insufficient = updateOrderStatus(placed.order.id, "confirmed");
  assert.ok(insufficient.error);
});

test("deleteProduct hard-deletes unused listing and soft-pauses listing with orders", () => {
  resetStore();
  const created = addProduct({
    farmer_id: 1,
    name: "Test Mint",
    category: "Vegetables",
    unit: "kg",
    quantity_available: 40,
    price_per_unit: 30,
  });
  assert.ok(getProductById(created.id));
  deleteProduct(created.id);
  assert.equal(getProductById(created.id), null);

  // Product with an order is soft-paused (is_active = 0) instead of hard-deleted
  const withOrder = addProduct({
    farmer_id: 1,
    name: "Test Spinach",
    category: "Vegetables",
    unit: "kg",
    quantity_available: 40,
    price_per_unit: 25,
  });
  addOrder({
    product_id: withOrder.id,
    farmer_id: 1,
    buyer_id: 3,
    buyer_name: "Test Buyer",
    quantity: 5,
    unit_price: 25,
    status: "pending",
    channel: "marketplace",
  });
  deleteProduct(withOrder.id);
  assert.equal(getProductById(withOrder.id).is_active, 0);
});

test("unit normalization converts quintal and tonne prices to per-kg accurately", () => {
  assert.equal(normalizePriceToKg(2480, "quintal"), 24.8);
  assert.equal(normalizePriceToKg(25000, "tonne"), 25);
  assert.equal(getUnitBenchmarkPrice(25, "quintal"), 2500);
});

test("KPIs, monthly revenue, and corrupted localStorage handling work safely", () => {
  resetStore();
  const kpis = getFarmerKPIs(1);
  assert.ok(kpis.revenue > 0);
  assert.equal(getMonthlyRevenue(1, 6).length, 6);

  localStorage.setItem("agri_products", "{broken-json");
  assert.deepEqual(getProducts(), []);
});
