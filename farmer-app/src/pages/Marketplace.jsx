import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { getActiveProducts, getUsers } from "../services/storageService";
import { CATEGORIES } from "../data/seed";
import ProductCard from "../components/ProductCard";
import { Search, ShoppingBag, Sparkles } from "lucide-react";

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");

  const users = useMemo(() => getUsers(), []);

  const listings = useMemo(() => {
    let list = getActiveProducts().map((p) => {
      const u = users.find((user) => user.id === p.farmer_id);
      return {
        ...p,
        farmer_name: u?.name || "Verified Farmer",
        farm_name: u?.farm_name || "",
        village: u?.village || "",
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.farm_name && p.farm_name.toLowerCase().includes(q)) ||
          (p.district && p.district.toLowerCase().includes(q)) ||
          (p.village && p.village.toLowerCase().includes(q))
      );
    }

    if (category) {
      list = list.filter((p) => p.category === category);
    }

    if (sort === "cheap") {
      list.sort((a, b) => a.price_per_unit - b.price_per_unit);
    } else if (sort === "expensive") {
      list.sort((a, b) => b.price_per_unit - a.price_per_unit);
    } else {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return list;
  }, [users, search, category, sort]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--cyan)", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
            <Sparkles size={14} /> Regional APMC & Farmer Direct Marketplace
          </div>
          <h1 className="page-title" style={{ marginBottom: "4px" }}>Browse Farm Fresh Produce</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Buy directly from verified regional farmers with transparent pricing
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="filters-bar">
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "34px", width: "100%" }}
            placeholder="Search crop, farm name, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories ({CATEGORIES.length})</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Sort: Recently Added</option>
          <option value="cheap">Sort: Price (Low to High)</option>
          <option value="expensive">Sort: Price (High to Low)</option>
        </select>

        {(search || category) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCategory(""); }}
            className="btn btn-ghost btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
        Showing <strong>{listings.length}</strong> available {listings.length === 1 ? "listing" : "listings"}
        {category ? ` in ${category}` : ""}
      </div>

      {/* CATEGORY QUICK FILTER PILLS */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setCategory("")}
          style={{
            padding: "6px 14px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: 600,
            border: `1px solid ${!category ? "var(--green)" : "var(--border)"}`,
            background: !category ? "var(--green-glow)" : "var(--bg-card)",
            color: !category ? "var(--green)" : "var(--text-muted)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          All Crops
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(category === c ? "" : c)}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              border: `1px solid ${category === c ? "var(--green)" : "var(--border)"}`,
              background: category === c ? "var(--green-glow)" : "var(--bg-card)",
              color: category === c ? "var(--green)" : "var(--text-muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* LISTINGS GRID */}
      {listings.length === 0 ? (
        <div className="empty-state card">
          <ShoppingBag size={36} style={{ color: "var(--text-dim)", margin: "0 auto 1rem" }} />
          <h3>No produce found</h3>
          <p>Try searching for different crops or clear the category filters.</p>
        </div>
      ) : (
        <motion.div
          className="card-grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
        >
          {listings.map((p) => (
            <motion.div
              key={p.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

