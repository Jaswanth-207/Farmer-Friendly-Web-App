import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import {
  getUsers,
  getProducts,
  getOrders,
  getCategorySummary,
  toggleProduct,
  updateOrderStatus,
} from "../services/storageService";
import { CATEGORIES, ORDER_STATUSES, resetStore } from "../data/seed";
import { formatMoney, formatQty, exportToCsv } from "../utils/formatters";
import ConfirmModal from "../components/ConfirmModal";
import {
  ShieldCheck,
  Users,
  Layers,
  ShoppingBag,
  TrendingUp,
  Search,
  Power,
  Download,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "listings", label: "All Listings" },
  { id: "orders", label: "All Orders & Sales" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const users = useMemo(() => {
    void refreshKey;
    return getUsers();
  }, [refreshKey]);

  const products = useMemo(() => {
    void refreshKey;
    return getProducts();
  }, [refreshKey]);

  const orders = useMemo(() => {
    void refreshKey;
    return getOrders().sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
  }, [refreshKey]);

  const benchmarks = useMemo(() => getCategorySummary(6), []);

  const userMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [users]);

  const stats = useMemo(() => {
    const farmers = users.filter((u) => u.role === "farmer").length;
    const buyers = users.filter((u) => u.role === "buyer").length;
    const activeListings = products.filter((p) => p.is_active && p.quantity_available > 0).length;
    const lowStock = products.filter((p) => p.is_active && p.quantity_available > 0 && p.quantity_available <= 25).length;
    const completedOrders = orders.filter((o) => ["confirmed", "completed"].includes(o.status));
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const gmv = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const inventoryValue = products
      .filter((p) => p.is_active)
      .reduce((sum, p) => sum + p.quantity_available * p.price_per_unit, 0);

    return {
      totalUsers: users.length,
      farmers,
      buyers,
      totalListings: products.length,
      activeListings,
      lowStock,
      totalOrders: orders.length,
      completedCount: completedOrders.length,
      pendingOrders,
      gmv,
      inventoryValue,
    };
  }, [users, products, orders]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.district && u.district.toLowerCase().includes(q)) ||
        (u.farm_name && u.farm_name.toLowerCase().includes(q))
    );
  }, [users, search]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const farmer = userMap[p.farmer_id];
        return (
          p.name.toLowerCase().includes(q) ||
          (p.district && p.district.toLowerCase().includes(q)) ||
          (farmer?.name && farmer.name.toLowerCase().includes(q))
        );
      });
    }
    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter);
    }
    return list;
  }, [products, search, categoryFilter, userMap]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) => {
        const farmer = userMap[o.farmer_id];
        return (
          o.buyer_name.toLowerCase().includes(q) ||
          (o.product_name && o.product_name.toLowerCase().includes(q)) ||
          (farmer?.name && farmer.name.toLowerCase().includes(q))
        );
      });
    }
    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }
    return list;
  }, [orders, search, statusFilter, userMap]);

  const handleToggleListing = (product) => {
    toggleProduct(product.id);
    setRefreshKey((k) => k + 1);
    addToast(`'${product.name}' is now ${product.is_active ? "paused" : "active"}.`, "success");
  };

  const handleOrderStatus = (orderId, newStatus) => {
    const res = updateOrderStatus(orderId, newStatus);
    if (res?.error) {
      addToast(res.error, "error");
      return;
    }
    setRefreshKey((k) => k + 1);
    addToast(`Order #${orderId} updated to ${newStatus}.`, "success");
  };

  const handleExportOrdersCSV = () => {
    const headers = ["Order ID", "Date", "Farmer", "Buyer", "Produce", "Qty", "Unit", "Total", "Channel", "Status"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.ordered_at,
      userMap[o.farmer_id]?.name || `Farmer #${o.farmer_id}`,
      o.buyer_name,
      o.product_name || "Produce",
      o.quantity,
      o.unit,
      o.total_amount,
      o.channel,
      o.status,
    ]);
    exportToCsv(`agridirect_platform_orders_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    addToast("Platform orders exported to CSV.", "success");
  };

  const handleResetDemoConfirm = () => {
    resetStore();
    localStorage.setItem("agri_session", String(user.id));
    setRefreshKey((k) => k + 1);
    setResetModalOpen(false);
    addToast("Demo dataset restored to initial defaults.", "success");
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--purple)", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
            <ShieldCheck size={15} /> Platform Administration &amp; Live Monitoring
          </div>
          <h1 className="page-title" style={{ marginBottom: "4px" }}>Admin Monitor Dashboard</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Monitor all users, farmer listings, orders, revenue, and APMC Mandi benchmarks
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={handleExportOrdersCSV} className="btn btn-ghost btn-sm">
            <Download size={14} /> Export Orders CSV
          </button>
          <button type="button" onClick={() => setResetModalOpen(true)} className="btn btn-ghost btn-sm" style={{ color: "var(--yellow)" }}>
            <RotateCcw size={14} /> Reset Demo Data
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="kpi-grid">
        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={13} color="var(--green)" /> Platform GMV
          </div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{formatMoney(stats.gmv)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {stats.completedCount} confirmed/completed orders
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={13} color="var(--cyan)" /> Registered Users
          </div>
          <div className="kpi-value">{stats.totalUsers}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {stats.farmers} farmers &bull; {stats.buyers} buyers
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Layers size={13} color="var(--purple)" /> Produce Listings
          </div>
          <div className="kpi-value">{stats.totalListings}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {stats.activeListings} active &bull;{" "}
            <span style={{ color: stats.lowStock > 0 ? "var(--yellow)" : "inherit" }}>
              {stats.lowStock} low stock
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShoppingBag size={13} color="var(--yellow)" /> Pending Orders
          </div>
          <div className="kpi-value" style={{ color: stats.pendingOrders > 0 ? "var(--yellow)" : "var(--text)" }}>
            {stats.pendingOrders}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Active stock value: {formatMoney(stats.inventoryValue)}
          </div>
        </motion.div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH & FILTER BAR (for Users / Listings / Orders) */}
      {activeTab !== "overview" && (
        <div className="filters-bar">
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "34px", width: "100%" }}
              placeholder={
                activeTab === "users"
                  ? "Search by name, email, farm, or district..."
                  : activeTab === "listings"
                  ? "Search by produce, farmer, or district..."
                  : "Search by buyer, farmer, or produce..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeTab === "listings" && (
            <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {activeTab === "orders" && (
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {(search || categoryFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setCategoryFilter(""); setStatusFilter(""); }}
              className="btn btn-ghost btn-sm"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Recent Platform Orders</h2>
              <button type="button" onClick={() => setActiveTab("orders")} className="btn btn-ghost btn-sm">
                View all ({orders.length})
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Buyer &rarr; Farmer</th>
                    <th className="num">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{o.ordered_at}</td>
                      <td>
                        <strong>{o.buyer_name}</strong>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          {o.product_name} &bull; {userMap[o.farmer_id]?.name || `Farmer #${o.farmer_id}`}
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: "var(--green)" }}>
                        {formatMoney(o.total_amount)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            o.status === "completed"
                              ? "badge-green"
                              : o.status === "confirmed"
                              ? "badge-blue"
                              : o.status === "pending"
                              ? "badge-yellow"
                              : "badge-red"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Low Stock &amp; Mandi Alerts</h2>
              <Link to="/trends" className="btn btn-ghost btn-sm">
                Mandi Trends
              </Link>
            </div>

            {products.filter((p) => p.quantity_available <= 25).length > 0 && (
              <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: "8px", background: "rgba(234, 179, 8, 0.1)", border: "1px solid var(--yellow-dim)", fontSize: "0.85rem", color: "var(--yellow)", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} />
                <span>
                  {products.filter((p) => p.quantity_available <= 25).length} listing(s) are at low or zero stock.
                </span>
              </div>
            )}

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="num">Mandi Avg</th>
                    <th className="num">MoM Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b) => (
                    <tr key={b.category}>
                      <td><strong>{b.category}</strong></td>
                      <td className="num">{formatMoney(b.latest)} / kg</td>
                      <td className="num" style={{ color: b.change_pct >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                        {b.change_pct != null ? `${b.change_pct >= 0 ? "+" : ""}${b.change_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === "users" && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Farm / Business</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.name}</strong></td>
                  <td>
                    <span
                      className={`badge ${
                        u.role === "admin" ? "badge-blue" : u.role === "farmer" ? "badge-green" : "badge-yellow"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{u.farm_name || "—"}</td>
                  <td>{[u.village, u.district, u.state].filter(Boolean).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ALL LISTINGS */}
      {activeTab === "listings" && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Produce</th>
                <th>Category</th>
                <th>Farmer</th>
                <th className="num">Stock</th>
                <th className="num">Price</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Moderation</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/marketplace/${p.id}`} style={{ fontWeight: 600, color: "var(--text)" }}>
                      {p.name}
                    </Link>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{p.district}</div>
                  </td>
                  <td><span className="category-tag">{p.category}</span></td>
                  <td>{userMap[p.farmer_id]?.name || `Farmer #${p.farmer_id}`}</td>
                  <td className="num">{formatQty(p.quantity_available)} {p.unit}</td>
                  <td className="num" style={{ color: "var(--green)", fontWeight: 700 }}>
                    {formatMoney(p.price_per_unit)} / {p.unit}
                  </td>
                  <td>
                    {p.is_active === 0 ? (
                      <span className="badge badge-gray">Paused</span>
                    ) : p.quantity_available <= 0 ? (
                      <span className="badge badge-red">Sold Out</span>
                    ) : p.quantity_available <= 25 ? (
                      <span className="badge badge-yellow">Low Stock</span>
                    ) : (
                      <span className="badge badge-green">In Stock</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleListing(p)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: p.is_active ? "var(--yellow)" : "var(--green)" }}
                    >
                      <Power size={14} /> {p.is_active ? "Pause" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ALL ORDERS & SALES */}
      {activeTab === "orders" && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Produce</th>
                <th>Farmer</th>
                <th>Buyer</th>
                <th>Channel</th>
                <th className="num">Qty</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{o.ordered_at}</td>
                  <td><strong>{o.product_name || "Produce"}</strong></td>
                  <td>{userMap[o.farmer_id]?.name || `Farmer #${o.farmer_id}`}</td>
                  <td>{o.buyer_name}</td>
                  <td><span className="badge badge-gray">{o.channel}</span></td>
                  <td className="num">{formatQty(o.quantity)} {o.unit}</td>
                  <td className="num" style={{ fontWeight: 700, color: "var(--green)" }}>{formatMoney(o.total_amount)}</td>
                  <td>
                    <span
                      className={`badge ${
                        o.status === "completed"
                          ? "badge-green"
                          : o.status === "confirmed"
                          ? "badge-blue"
                          : o.status === "pending"
                          ? "badge-yellow"
                          : "badge-red"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <select
                      className="form-select"
                      style={{ padding: "4px 8px", fontSize: "0.78rem", minWidth: "110px", width: "auto", display: "inline-block" }}
                      value={o.status}
                      onChange={(e) => handleOrderStatus(o.id, e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={resetModalOpen}
        title="Reset Demo Dataset"
        message="Reset all demo users, produce listings, orders, and APMC Mandi prices back to their initial seeded defaults?"
        confirmLabel="Reset Demo Data"
        onConfirm={handleResetDemoConfirm}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}
