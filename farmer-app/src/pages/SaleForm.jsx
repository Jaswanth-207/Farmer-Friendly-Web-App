import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  getProductsByFarmer,
  addOrder,
  formatMoney,
} from "../data/store";
import { ORDER_STATUSES } from "../data/seed";
import { ArrowLeft, Receipt, Check } from "lucide-react";

export default function SaleForm() {
  const { user } = useAuth();
  const farmerId = user?.id || 1;
  const { addToast } = useToast();
  const navigate = useNavigate();

  const products = useMemo(() => getProductsByFarmer(farmerId).filter((p) => p.is_active), [farmerId]);

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState(products[0]?.price_per_unit || "");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [status, setStatus] = useState("completed");
  const [orderedAt, setOrderedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === +selectedProductId),
    [products, selectedProductId]
  );

  const handleProductChange = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    const prod = products.find((p) => p.id === +pId);
    if (prod) {
      setUnitPrice(prod.price_per_unit);
    }
  };

  const calculatedTotal = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(unitPrice) || 0;
    return +(q * p).toFixed(2);
  }, [quantity, unitPrice]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!selectedProduct) {
      setError("Please select a listed produce item.");
      return;
    }
    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) {
      setError("Enter a valid quantity sold.");
      return;
    }
    const p = parseFloat(unitPrice);
    if (isNaN(p) || p <= 0) {
      setError("Enter a valid unit price.");
      return;
    }
    if (!buyerName.trim()) {
      setError("Enter the buyer or merchant name.");
      return;
    }

    if (["confirmed", "completed"].includes(status) && q > selectedProduct.quantity_available) {
      setError(`Available stock is only ${selectedProduct.quantity_available} ${selectedProduct.unit}.`);
      return;
    }

    addOrder({
      product_id: selectedProduct.id,
      farmer_id: farmerId,
      buyer_id: null,
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim() || null,
      quantity: q,
      unit_price: p,
      total_amount: calculatedTotal,
      channel: "direct",
      status,
      notes: notes.trim() || null,
      ordered_at: orderedAt,
      product_name: selectedProduct.name,
      unit: selectedProduct.unit,
    });

    addToast(`Recorded sale of ${q} ${selectedProduct.unit} '${selectedProduct.name}'!`, "success");
    navigate("/sales");
  };

  return (
    <div style={{ maxWidth: "560px", margin: "1.5rem auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/sales" className="link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={16} /> Back to Sales
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--green-glow)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: "1.35rem", marginBottom: 0 }}>Record Direct Sale</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>
              Log a cash transaction or off-platform Mandi buyer sale
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--red)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", border: "1px solid var(--red-dim)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Produce Item *</label>
            <select className="form-select" value={selectedProductId} onChange={handleProductChange} required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — In stock: {p.quantity_available} {p.unit} ({formatMoney(p.price_per_unit)}/{p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Quantity Sold ({selectedProduct?.unit || "unit"}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                className="form-input"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Agreed Unit Price (₹ / {selectedProduct?.unit || "unit"}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                className="form-input"
                placeholder="e.g. 28.50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div style={{ background: "var(--bg-input)", padding: "12px 16px", borderRadius: "8px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Transaction Value:</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--green)" }}>{formatMoney(calculatedTotal)}</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Buyer Name / Merchant *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Kisan Wholesale Mart"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Buyer Contact Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sale Date *</label>
              <input
                type="date"
                required
                className="form-input"
                value={orderedAt}
                onChange={(e) => setOrderedAt(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment / Order Status *</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="completed">Completed (Paid & Delivered)</option>
                <option value="confirmed">Confirmed (Dispatched)</option>
                <option value="pending">Pending (Soft Booking)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Paid in cash at Mandi gate"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              <Check size={16} /> Save Sale Record
            </button>
            <Link to="/sales" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

