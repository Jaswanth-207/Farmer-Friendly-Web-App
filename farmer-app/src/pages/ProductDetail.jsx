import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import {
  getProductById,
  getOrders,
  toggleProduct,
  deleteProduct,
  getCategorySeries,
} from "../services/storageService";
import { formatMoney, formatQty } from "../utils/formatters";
import {
  ArrowLeft,
  Edit,
  Power,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const product = useMemo(() => getProductById(+id), [id]);

  const sales = useMemo(() => {
    return getOrders()
      .filter((o) => o.product_id === +id)
      .sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
  }, [id]);

  const totals = useMemo(() => {
    const completed = sales.filter((s) => ["confirmed", "completed"].includes(s.status));
    const units = completed.reduce((sum, s) => sum + s.quantity, 0);
    const revenue = completed.reduce((sum, s) => sum + s.total_amount, 0);
    return { units, revenue, count: completed.length };
  }, [sales]);

  // Fair price comparison with mandi benchmarks
  const benchmark = useMemo(() => {
    if (!product) return null;
    const series = getCategorySeries(product.category, 6);
    const mandiAvg = series.latest || series.average || 30;
    const asking = product.price_per_unit;
    const diffPct = ((asking - mandiAvg) / mandiAvg) * 100;

    let verdict = "fair";
    let label = "Fair Market Price";
    let message = "Your asking price matches recent Mandi benchmarks.";
    if (diffPct <= -10) {
      verdict = "below";
      label = "Priced Below Mandi Average";
      message = `You are quoting ₹${Math.abs(mandiAvg - asking).toFixed(2)} less than regional benchmarks. Consider raising your price.`;
    } else if (diffPct >= 10) {
      verdict = "above";
      label = "Premium Asking Price";
      message = "You are quoting above average Mandi rates (export or organic grade).";
    }

    return { mandiAvg, diffPct: diffPct.toFixed(1), verdict, label, message };
  }, [product]);

  if (!product) {
    return (
      <div className="empty-state card">
        <h2>Listing Not Found</h2>
        <p>The requested produce listing does not exist.</p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Back to Listings
        </Link>
      </div>
    );
  }

  const handleToggle = () => {
    toggleProduct(product.id);
    addToast(`Listing status updated.`, "success");
    navigate("/products");
  };

  const handleDelete = () => {
    if (window.confirm(`Delete '${product.name}'?`)) {
      deleteProduct(product.id);
      addToast(`Listing removed.`, "success");
      navigate("/products");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/products" className="link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={16} /> Back to My Listings
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{product.name}</h1>
            <span className="category-tag">{product.category}</span>
            {product.is_active === 0 ? (
              <span className="badge badge-gray">Paused</span>
            ) : product.quantity_available <= 0 ? (
              <span className="badge badge-red">Sold Out</span>
            ) : product.quantity_available <= 25 ? (
              <span className="badge badge-yellow">Low Stock</span>
            ) : (
              <span className="badge badge-green">In Stock</span>
            )}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            {product.district ? `${product.district} • ` : ""}Harvested {product.harvest_date || "recently"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Link to={`/products/${product.id}/edit`} className="btn btn-primary btn-sm">
            <Edit size={14} /> Edit Listing
          </Link>
          <button onClick={handleToggle} className="btn btn-ghost btn-sm">
            <Power size={14} /> {product.is_active ? "Pause" : "Relist"}
          </button>
          <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* BENCHMARK VERDICT BANNER */}
      {benchmark && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: benchmark.verdict === "below" ? "rgba(234, 179, 8, 0.12)" : benchmark.verdict === "above" ? "rgba(59, 130, 246, 0.12)" : "rgba(34, 197, 94, 0.12)",
            border: `1px solid ${benchmark.verdict === "below" ? "var(--yellow-dim)" : benchmark.verdict === "above" ? "var(--blue-dim)" : "var(--green-dim)"}`,
            borderRadius: "var(--radius)",
            padding: "1.25rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: benchmark.verdict === "below" ? "var(--yellow)" : benchmark.verdict === "above" ? "var(--blue)" : "var(--green)" }}>
              {benchmark.verdict === "below" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
              {benchmark.label} ({benchmark.diffPct >= 0 ? "+" : ""}{benchmark.diffPct}% vs Mandi)
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {benchmark.message} Regional APMC average: <strong>{formatMoney(benchmark.mandiAvg)}/kg</strong>.
            </p>
          </div>
          <Link to="/trends" className="btn btn-ghost btn-sm">
            Check Mandi Trends
          </Link>
        </motion.div>
      )}

      {/* METRIC CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Asking Price</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{formatMoney(product.price_per_unit)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>per {product.unit}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Remaining Stock</div>
          <div className="kpi-value">{formatQty(product.quantity_available)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>{product.unit} available</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Total Units Sold</div>
          <div className="kpi-value">{formatQty(totals.units)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>across {totals.count} orders</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Realized Revenue</div>
          <div className="kpi-value">{formatMoney(totals.revenue)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>from this listing</div>
        </div>
      </div>

      {/* SALES HISTORY TABLE */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Recorded Sales for this Produce</h2>

        {sales.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>No orders or sales recorded yet for this batch.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Buyer</th>
                  <th>Channel</th>
                  <th className="num">Quantity</th>
                  <th className="num">Unit Price</th>
                  <th className="num">Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((order) => (
                  <tr key={order.id}>
                    <td>{order.ordered_at}</td>
                    <td><strong>{order.buyer_name}</strong></td>
                    <td>
                      <span className="badge badge-gray">{order.channel}</span>
                    </td>
                    <td className="num">{formatQty(order.quantity)} {product.unit}</td>
                    <td className="num">{formatMoney(order.unit_price)}</td>
                    <td className="num" style={{ fontWeight: 700, color: "var(--green)" }}>
                      {formatMoney(order.total_amount)}
                    </td>
                    <td>
                      <span className={`badge ${order.status === "completed" ? "badge-green" : order.status === "confirmed" ? "badge-blue" : order.status === "pending" ? "badge-yellow" : "badge-red"}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

