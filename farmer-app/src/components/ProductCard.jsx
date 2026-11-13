import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatMoney, formatQty } from "../data/store";

export default function ProductCard({ product, showOwnerActions = false, onToggle, onDelete }) {
  const isLowStock = product.quantity_available > 0 && product.quantity_available <= 25;
  const isSoldOut = product.quantity_available <= 0;

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="product-card"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="category-tag">{product.category}</span>
        {product.is_active === 0 ? (
          <span className="badge badge-gray">Paused</span>
        ) : isSoldOut ? (
          <span className="badge badge-red">Sold Out</span>
        ) : isLowStock ? (
          <span className="badge badge-yellow">Low Stock</span>
        ) : (
          <span className="badge badge-green">In Stock</span>
        )}
      </div>

      <h3 style={{ margin: "4px 0" }}>{product.name}</h3>

      <div className="price">
        {formatMoney(product.price_per_unit)}
        <span> / {product.unit}</span>
      </div>

      <div className="meta">
        <span>Stock: <strong>{formatQty(product.quantity_available)} {product.unit}</strong></span>
        {product.district && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
            <MapPin size={13} /> {product.district}
          </span>
        )}
      </div>

      {product.harvest_date && (
        <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
          <Calendar size={13} /> Harvested: {product.harvest_date}
        </div>
      )}

      {product.description && (
        <p className="desc">{product.description}</p>
      )}

      {product.farmer_name && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
          Farmer: <strong>{product.farmer_name}</strong> {product.farm_name ? `(${product.farm_name})` : ""}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        {showOwnerActions ? (
          <>
            <Link to={`/products/${product.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, textAlign: "center", justifyContent: "center" }}>
              Manage
            </Link>
            <Link to={`/products/${product.id}/edit`} className="btn btn-ghost btn-sm">
              Edit
            </Link>
          </>
        ) : (
          <Link
            to={`/marketplace/${product.id}`}
            className="btn btn-primary btn-sm"
            style={{ width: "100%", textAlign: "center", justifyContent: "center" }}
          >
            View & Buy
          </Link>
        )}
      </div>
    </motion.div>
  );
}

