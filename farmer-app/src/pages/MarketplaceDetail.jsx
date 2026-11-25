import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import {
  getProductById,
  getUserById,
  addOrder,
  getCategorySeries,
} from "../services/storageService";
import {
  formatMoney,
  formatQty,
  normalizePriceToKg,
  getUnitBenchmarkPrice,
  isBenchmarkComparableUnit,
} from "../utils/formatters";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";

export default function MarketplaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const product = useMemo(() => getProductById(+id), [id]);
  const farmer = useMemo(() => (product ? getUserById(product.farmer_id) : null), [product]);

  const [quantity, setQuantity] = useState("10");
  const [phone, setPhone] = useState(user?.phone || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Mandi benchmark comparison (normalized to ₹/kg for weight-based units)
  const benchmark = useMemo(() => {
    if (!product || !isBenchmarkComparableUnit(product.unit)) return null;
    const series = getCategorySeries(product.category, 6);
    const mandiAvgPerKg = series.latest || series.average || 30;
    const normalizedAskingPerKg = normalizePriceToKg(product.price_per_unit, product.unit);
    const diffPct = ((normalizedAskingPerKg - mandiAvgPerKg) / mandiAvgPerKg) * 100;
    const mandiEquivalentInUnit = getUnitBenchmarkPrice(mandiAvgPerKg, product.unit);

    let verdict = "fair";
    let label = "Fair Market Price";
    if (diffPct <= -10) {
      verdict = "below";
      label = "Great Deal (Below Mandi Average)";
    } else if (diffPct >= 10) {
      verdict = "above";
      label = "Premium Grade";
    }

    return {
      mandiAvgPerKg,
      mandiEquivalentInUnit,
      diffPct: diffPct.toFixed(1),
      verdict,
      label,
    };
  }, [product]);

  const totalCost = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const p = product?.price_per_unit || 0;
    return +(q * p).toFixed(2);
  }, [quantity, product]);

  if (!product) {
    return (
      <div className="empty-state card">
        <h2>Produce Not Found</h2>
        <p>This listing may have been sold out or unlisted.</p>
        <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Browse Marketplace
        </Link>
      </div>
    );
  }

  const handleOrder = (e) => {
    e.preventDefault();
    setError("");

    if (!user) {
      addToast("Please sign in to place an order.", "warning");
      navigate("/login");
      return;
    }

    if (user.id === product.farmer_id) {
      setError("You cannot purchase your own listing.");
      return;
    }

    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }
    if (q > product.quantity_available) {
      setError(`Only ${product.quantity_available} ${product.unit} is available in stock.`);
      return;
    }

    addOrder({
      product_id: product.id,
      farmer_id: product.farmer_id,
      buyer_id: user.id,
      buyer_name: user.name,
      buyer_phone: phone.trim() || user.phone || null,
      quantity: q,
      unit_price: product.price_per_unit,
      total_amount: totalCost,
      channel: "marketplace",
      status: "pending",
      notes: notes.trim() || null,
      ordered_at: new Date().toISOString().slice(0, 10),
      product_name: product.name,
      unit: product.unit,
    });

    addToast(`Order placed for ${q} ${product.unit} of '${product.name}'!`, "success");
    navigate("/orders");
  };

  return (
    <div style={{ maxWidth: "900px", margin: "1rem auto" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <Link to="/marketplace" className="link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={16} /> Back to marketplace
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
        {/* LEFT COLUMN: PRODUCE DETAILS & FARMER INFO */}
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
            <span className="category-tag">{product.category}</span>
            <span className="badge badge-green">Verified Produce</span>
          </div>

          <h1 className="page-title" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{product.name}</h1>

          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--green)", marginBottom: "1.25rem" }}>
            {formatMoney(product.price_per_unit)}
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}> / {product.unit}</span>
          </div>

          {/* FAIR PRICE BADGE */}
          {benchmark && (
            <div
              style={{
                background: benchmark.verdict === "below" ? "rgba(34, 197, 94, 0.15)" : "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--green)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={16} /> {benchmark.label}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Regional APMC benchmark: <strong>{formatMoney(benchmark.mandiEquivalentInUnit)} / {product.unit}</strong>{" "}
                ({formatMoney(benchmark.mandiAvgPerKg)}/kg, {Number(benchmark.diffPct) >= 0 ? "+" : ""}{benchmark.diffPct}%)
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          {product.description && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>Produce Details</h3>
              <p style={{ color: "var(--text)", lineHeight: 1.6, fontSize: "0.92rem" }}>{product.description}</p>
            </div>
          )}

          {/* FARMER & ORIGIN PROFILE */}
          <div className="card" style={{ background: "var(--bg-input)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              Farmer & Farm Origin
            </h3>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{farmer?.name || "Regional Farmer"}</div>
            {farmer?.farm_name && (
              <div style={{ color: "var(--green)", fontSize: "0.88rem", fontWeight: 500 }}>{farmer.farm_name}</div>
            )}
            <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
              {(farmer?.village || product.district) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={14} /> {farmer?.village ? `${farmer.village}, ` : ""}{product.district || farmer?.district}
                </span>
              )}
              {product.harvest_date && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Calendar size={14} /> Harvested: {product.harvest_date}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER PLACEMENT BOX */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ border: "1px solid var(--border-hover)", boxShadow: "var(--shadow-lg)" }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShoppingBag size={20} color="var(--green)" /> Place Purchase Order
            </h2>

            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--red)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", border: "1px solid var(--red-dim)" }}>
                {error}
              </div>
            )}

            <div style={{ background: "var(--bg-input)", padding: "10px 14px", borderRadius: "8px", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
              Live Stock Available: <strong>{formatQty(product.quantity_available)} {product.unit}</strong>
            </div>

            <form onSubmit={handleOrder}>
              <div className="form-group">
                <label className="form-label">Quantity to Buy ({product.unit}) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  max={product.quantity_available}
                  required
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery / Pickup Instructions</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Pickup via truck tomorrow morning at farm gate..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  <span>Price per {product.unit}</span>
                  <span>{formatMoney(product.price_per_unit)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                  <span>Requested Quantity</span>
                  <span>{quantity || 0} {product.unit}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: 700, color: "var(--green)" }}>
                  <span>Total Payable:</span>
                  <span>{formatMoney(totalCost)}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                Confirm Purchase Order
              </button>

              <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textAlign: "center", marginTop: "10px" }}>
                Payment is settled directly with the farmer upon inspection or delivery.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

