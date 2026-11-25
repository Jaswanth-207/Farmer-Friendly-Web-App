import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getOrdersByBuyer } from "../services/storageService";
import { formatMoney, formatQty } from "../utils/formatters";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function Orders() {
  const { user } = useAuth();
  const buyerId = user?.id || 3;

  const orders = useMemo(() => {
    return getOrdersByBuyer(buyerId).sort(
      (a, b) => new Date(b.ordered_at) - new Date(a.ordered_at)
    );
  }, [buyerId]);

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
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.ordered_at}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

