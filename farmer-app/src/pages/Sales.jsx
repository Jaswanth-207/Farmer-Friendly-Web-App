import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import {
  getOrdersByFarmer,
  getProductsByFarmer,
  updateOrderStatus,
} from "../services/storageService";
import { formatMoney, formatQty, exportToCsv } from "../utils/formatters";
import { ORDER_STATUSES } from "../data/seed";
import { PlusCircle, Download, Search } from "lucide-react";

export default function Sales() {
  const { user } = useAuth();
  const farmerId = user?.id || 1;
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [trigger, setTrigger] = useState(0);

  const products = useMemo(() => getProductsByFarmer(farmerId), [farmerId]);

  const sales = useMemo(() => {
    void trigger;
    let list = getOrdersByFarmer(farmerId).sort(
      (a, b) => new Date(b.ordered_at) - new Date(a.ordered_at)
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.buyer_name.toLowerCase().includes(q) ||
          (s.product_name && s.product_name.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (productFilter) {
      list = list.filter((s) => String(s.product_id) === String(productFilter));
    }
    return list;
  }, [farmerId, search, statusFilter, productFilter, trigger]);

  // Aggregate totals
  const totals = useMemo(() => {
    const confirmed = sales.filter((s) => ["confirmed", "completed"].includes(s.status));
    const revenue = confirmed.reduce((sum, s) => sum + s.total_amount, 0);
    const units = confirmed.reduce((sum, s) => sum + s.quantity, 0);
    const pendingVal = sales
      .filter((s) => s.status === "pending")
      .reduce((sum, s) => sum + s.total_amount, 0);
    return { revenue, units, count: confirmed.length, pendingVal };
  }, [sales]);

  const handleStatusChange = (orderId, newStatus) => {
    const res = updateOrderStatus(orderId, newStatus);
    if (res?.error) {
      addToast(res.error, "error");
      return;
    }
    setTrigger((t) => t + 1);
    addToast(`Sale marked as ${newStatus}.`, "success");
  };

  const handleExportCSV = () => {
    const headers = ["Order ID", "Date", "Produce", "Buyer", "Quantity", "Unit", "Unit Price", "Total Amount", "Channel", "Status"];
    const rows = sales.map((s) => [
      s.id,
      s.ordered_at,
      s.product_name || "Produce",
      s.buyer_name,
      s.quantity,
      s.unit,
      s.unit_price,
      s.total_amount,
      s.channel,
      s.status,
    ]);

    exportToCsv(`agridirect_sales_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    addToast("Sales ledger exported to CSV.", "success");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Sales & Orders Ledger</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Unified ledger for offline Mandi counter sales and marketplace orders
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleExportCSV} className="btn btn-ghost btn-sm">
            <Download size={15} /> Export CSV
          </button>
          <Link to="/sales/new" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Record Direct Sale
          </Link>
        </div>
      </div>

      {/* KPI STAT SUMMARY */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Confirmed Revenue</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{formatMoney(totals.revenue)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>Across {totals.count} orders</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Units Dispatched</div>
          <div className="kpi-value">{formatQty(totals.units)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>Produce volume</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Pending Value</div>
          <div className="kpi-value" style={{ color: "var(--yellow)" }}>{formatMoney(totals.pendingVal)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>Awaiting confirmation</div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="filters-bar">
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "34px", width: "100%" }}
            placeholder="Search by buyer name or produce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select className="form-select" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {(search || statusFilter || productFilter) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setProductFilter(""); }}
            className="btn btn-ghost btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* SALES TABLE */}
      {sales.length === 0 ? (
        <div className="empty-state card">
          <h3>No sales records found</h3>
          <p>Record a counter sale or wait for buyers to place marketplace orders.</p>
          <Link to="/sales/new" className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }}>
            Record Direct Sale
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produce</th>
                <th>Buyer</th>
                <th>Channel</th>
                <th className="num">Quantity</th>
                <th className="num">Unit Price</th>
                <th className="num">Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Update Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sales.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                  >
                    <td style={{ whiteSpace: "nowrap" }}>{order.ordered_at}</td>
                    <td>
                      <strong>{order.product_name || "Produce"}</strong>
                    </td>
                    <td>
                      {order.buyer_name}
                      {order.buyer_phone && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          {order.buyer_phone}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray">{order.channel}</span>
                    </td>
                    <td className="num">
                      {formatQty(order.quantity)} {order.unit}
                    </td>
                    <td className="num">{formatMoney(order.unit_price)}</td>
                    <td className="num" style={{ fontWeight: 700, color: "var(--green)" }}>
                      {formatMoney(order.total_amount)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          order.status === "completed"
                            ? "badge-green"
                            : order.status === "confirmed"
                            ? "badge-blue"
                            : order.status === "pending"
                            ? "badge-yellow"
                            : "badge-red"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <select
                        className="form-select"
                        style={{ padding: "4px 8px", fontSize: "0.78rem", minWidth: "110px", width: "auto", display: "inline-block" }}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

