import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  getProductsByFarmer,
  toggleProduct,
  deleteProduct,
  formatMoney,
  formatQty,
} from "../data/store";
import { CATEGORIES } from "../data/seed";
import { PlusCircle, Search, Filter, Edit, Power, Trash2, Eye } from "lucide-react";

export default function Products() {
  const { user } = useAuth();
  const farmerId = user?.id || 1;
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [trigger, setTrigger] = useState(0);

  const products = useMemo(() => {
    let list = getProductsByFarmer(farmerId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (category) {
      list = list.filter((p) => p.category === category);
    }
    if (stateFilter) {
      if (stateFilter === "in-stock") list = list.filter((p) => p.is_active && p.quantity_available > 25);
      if (stateFilter === "low") list = list.filter((p) => p.is_active && p.quantity_available > 0 && p.quantity_available <= 25);
      if (stateFilter === "sold-out") list = list.filter((p) => p.is_active && p.quantity_available <= 0);
      if (stateFilter === "inactive") list = list.filter((p) => !p.is_active);
    }
    return list;
  }, [farmerId, search, category, stateFilter, trigger]);

  const handleToggle = (id, name, isActive) => {
    toggleProduct(id);
    setTrigger((t) => t + 1);
    addToast(`'${name}' is now ${isActive ? "paused" : "active"}.`, "success");
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete or pause '${name}'?`)) {
      deleteProduct(id);
      setTrigger((t) => t + 1);
      addToast(`'${name}' deleted or retired.`, "success");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">My Harvest Listings</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Manage produce stock, asking prices, and availability
          </p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <PlusCircle size={16} /> Add New Listing
        </Link>
      </div>

      {/* FILTERS BAR */}
      <div className="filters-bar">
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "34px", width: "100%" }}
            placeholder="Search by produce name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select className="form-select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All Stock Statuses</option>
          <option value="in-stock">In stock (&gt;25)</option>
          <option value="low">Low stock (&le;25)</option>
          <option value="sold-out">Sold out</option>
          <option value="inactive">Paused</option>
        </select>

        {(search || category || stateFilter) && (
          <button
            onClick={() => { setSearch(""); setCategory(""); setStateFilter(""); }}
            className="btn btn-ghost btn-sm"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* PRODUCTS TABLE */}
      {products.length === 0 ? (
        <div className="empty-state card">
          <h3>No listings match your criteria</h3>
          <p>Try clearing filters or add a new crop listing.</p>
          <Link to="/products/new" className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }}>
            Add Listing
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Produce Name</th>
                <th>Category</th>
                <th className="num">Available Stock</th>
                <th className="num">Price per Unit</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {products.map((p) => {
                  const isLow = p.is_active && p.quantity_available > 0 && p.quantity_available <= 25;
                  const isSoldOut = p.is_active && p.quantity_available <= 0;

                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                    >
                      <td>
                        <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: "var(--text)" }}>
                          {p.name}
                        </Link>
                        {p.harvest_date && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                            Harvested {p.harvest_date}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="category-tag">{p.category}</span>
                      </td>
                      <td className="num">
                        <strong>{formatQty(p.quantity_available)}</strong> {p.unit}
                      </td>
                      <td className="num" style={{ color: "var(--green)", fontWeight: 700 }}>
                        {formatMoney(p.price_per_unit)}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}> / {p.unit}</span>
                      </td>
                      <td>
                        {p.is_active === 0 ? (
                          <span className="badge badge-gray">Paused</span>
                        ) : isSoldOut ? (
                          <span className="badge badge-red">Sold Out</span>
                        ) : isLow ? (
                          <span className="badge badge-yellow">Low Stock</span>
                        ) : (
                          <span className="badge badge-green">In Stock</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <Link to={`/products/${p.id}`} className="btn btn-ghost btn-sm btn-icon" title="View details">
                            <Eye size={15} />
                          </Link>
                          <Link to={`/products/${p.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                            <Edit size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleToggle(p.id, p.name, p.is_active)}
                            className="btn btn-ghost btn-sm btn-icon"
                            title={p.is_active ? "Pause listing" : "Activate listing"}
                            style={{ color: p.is_active ? "var(--yellow)" : "var(--green)" }}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Delete listing"
                            style={{ color: "var(--red)" }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

