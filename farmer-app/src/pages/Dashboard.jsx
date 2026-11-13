import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  getFarmerKPIs,
  getMonthlyRevenue,
  getProductsByFarmer,
  getOrdersByFarmer,
  formatMoney,
  formatQty,
} from "../data/store";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const farmerId = user?.id || 1;

  const kpis = useMemo(() => getFarmerKPIs(farmerId), [farmerId]);
  const monthlyRevenue = useMemo(() => getMonthlyRevenue(farmerId, 6), [farmerId]);
  const listings = useMemo(() => getProductsByFarmer(farmerId).slice(0, 6), [farmerId]);
  const recentSales = useMemo(
    () =>
      getOrdersByFarmer(farmerId)
        .sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at))
        .slice(0, 6),
    [farmerId]
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Welcome back, {user?.name || "Farmer"}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {user?.farm_name ? `${user.farm_name} • ` : ""}{user?.district ? `${user.district}, ` : ""}{user?.state || ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link to="/products/new" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Add New Listing
          </Link>
          <Link to="/sales/new" className="btn btn-ghost btn-sm">
            <PlusCircle size={15} /> Record Direct Sale
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpi-grid">
        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{formatMoney(kpis.revenue)}</div>
          <div className="kpi-change">
            {kpis.revenueChange !== null ? (
              <span className={kpis.revenueChange >= 0 ? "up" : "down"} style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                {kpis.revenueChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {kpis.revenueChange >= 0 ? "+" : ""}{kpis.revenueChange}% vs last month
              </span>
            ) : (
              <span style={{ color: "var(--text-dim)" }}>30-day baseline</span>
            )}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label">Active Listings Stock Value</div>
          <div className="kpi-value">{formatMoney(kpis.stockValue)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {kpis.activeListings} active crop types
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label">Completed Sales</div>
          <div className="kpi-value">{kpis.salesCount}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {formatQty(kpis.unitsSold)} units sold total
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="kpi-card">
          <div className="kpi-label">Pending Orders</div>
          <div className="kpi-value" style={{ color: kpis.pendingOrders > 0 ? "var(--yellow)" : "var(--text)" }}>
            {kpis.pendingOrders}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {kpis.lowStockCount > 0 ? (
              <span style={{ color: "var(--yellow)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <AlertTriangle size={13} /> {kpis.lowStockCount} low stock alerts
              </span>
            ) : (
              "All stock healthy"
            )}
          </div>
        </motion.div>
      </div>

      {/* REVENUE CHART (CUSTOM ANIMATED BAR CHART) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="chart-card"
        style={{ marginBottom: "2rem" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>6-Month Revenue Trend</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Realized earnings from marketplace & direct cash sales</p>
          </div>
          <span className="badge badge-green">Live Ledger</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", height: "180px", gap: "16px", padding: "10px 0 0" }}>
          {monthlyRevenue.map((item, idx) => (
            <div key={item.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                {formatMoney(item.revenue)}
              </div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(item.heightPct, 6)}%` }}
                transition={{ duration: 0.8, delay: idx * 0.08, ease: "easeOut" }}
                style={{
                  width: "100%",
                  maxWidth: "48px",
                  borderRadius: "6px 6px 0 0",
                  background: idx === monthlyRevenue.length - 1
                    ? "linear-gradient(180deg, var(--green), var(--cyan))"
                    : "linear-gradient(180deg, rgba(34, 197, 94, 0.6), rgba(34, 197, 94, 0.2))",
                  border: "1px solid var(--border)",
                  borderBottom: "none",
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "8px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* TWO COLUMN GRID: ACTIVE LISTINGS & RECENT SALES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        {/* ACTIVE LISTINGS */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>My Produce Stock</h2>
            <Link to="/products" className="link" style={{ fontSize: "0.85rem" }}>
              View all ({kpis.totalListings}) &rarr;
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Produce</th>
                  <th className="num">Stock</th>
                  <th className="num">Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/products/${item.id}`} style={{ fontWeight: 600, color: "var(--text)" }}>
                        {item.name}
                      </Link>
                    </td>
                    <td className="num">
                      {formatQty(item.quantity_available)} {item.unit}
                    </td>
                    <td className="num" style={{ color: "var(--green)", fontWeight: 600 }}>
                      {formatMoney(item.price_per_unit)}
                    </td>
                    <td>
                      {item.is_active === 0 ? (
                        <span className="badge badge-gray">Paused</span>
                      ) : item.quantity_available <= 0 ? (
                        <span className="badge badge-red">Sold Out</span>
                      ) : item.quantity_available <= 25 ? (
                        <span className="badge badge-yellow">Low</span>
                      ) : (
                        <span className="badge badge-green">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT SALES */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Recent Sales Ledger</h2>
            <Link to="/sales" className="link" style={{ fontSize: "0.85rem" }}>
              All sales &rarr;
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Item</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>{sale.buyer_name}</strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{sale.ordered_at}</div>
                    </td>
                    <td>
                      {sale.product_name || "Produce"}
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        {formatQty(sale.quantity)} {sale.unit}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: "var(--green)" }}>
                      {formatMoney(sale.total_amount)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          sale.status === "completed"
                            ? "badge-green"
                            : sale.status === "confirmed"
                            ? "badge-blue"
                            : sale.status === "pending"
                            ? "badge-yellow"
                            : "badge-red"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

