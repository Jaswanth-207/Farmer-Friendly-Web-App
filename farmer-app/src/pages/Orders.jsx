import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getOrdersByBuyer, updateOrderStatus } from "../services/storageService";
import { formatMoney, formatQty } from "../utils/formatters";
import ConfirmModal from "../components/ConfirmModal";
import { ShoppingBag, ArrowRight, XCircle } from "lucide-react";

export default function Orders() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const buyerId = user?.id;

  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);

  const orders = useMemo(() => {
    void refreshKey;
    if (!buyerId) return [];
    return getOrdersByBuyer(buyerId).sort(
      (a, b) => new Date(b.ordered_at) - new Date(a.ordered_at)
    );
  }, [buyerId, refreshKey]);

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    const res = updateOrderStatus(cancelTarget.id, "cancelled");
    if (res?.error) {
      addToast(res.error, "error");
    } else {
      addToast(`Order for '${cancelTarget.product_name}' cancelled.`, "success");
      setRefreshKey((k) => k + 1);
    }
    setCancelTarget(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">My Purchase Orders</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Track produce orders placed with regional farmers
          </p>
        </div>
        <Link to="/marketplace" className="btn btn-primary btn-sm">
          <ShoppingBag size={15} /> Browse Produce
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state card">
          <ShoppingBag size={40} style={{ color: "var(--text-dim)", margin: "0 auto 1rem" }} />
          <h3>No orders placed yet</h3>
          <p>Browse our farm-direct marketplace to source fresh crops directly from farmers.</p>
          <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Explore Marketplace <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Order Date</th>
                <th>Produce Item</th>
                <th className="num">Quantity</th>
                <th className="num">Unit Price</th>
                <th className="num">Total Amount</th>
                <th>Channel</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const canCancel = o.status === "pending" || o.status === "confirmed";
                return (
                  <tr key={o.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{o.ordered_at}</td>
                    <td>
                      <strong>{o.product_name || "Produce"}</strong>
                      {o.notes && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          Note: {o.notes}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {formatQty(o.quantity)} {o.unit}
                    </td>
                    <td className="num">{formatMoney(o.unit_price)}</td>
                    <td className="num" style={{ fontWeight: 700, color: "var(--green)" }}>
                      {formatMoney(o.total_amount)}
                    </td>
                    <td>
                      <span className="badge badge-gray">{o.channel}</span>
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
                    <td style={{ textAlign: "right" }}>
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(o)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--red)" }}
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Cancel Purchase Order"
        message={
          cancelTarget
            ? `Cancel your order for ${formatQty(cancelTarget.quantity)} ${cancelTarget.unit} of '${cancelTarget.product_name}'? If already confirmed, stock will be restored to the farmer.`
            : ""
        }
        confirmLabel="Yes, Cancel Order"
        danger
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
