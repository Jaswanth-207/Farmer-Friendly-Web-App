import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, TrendingDown, Sparkles, CheckCircle2, ShieldCheck, Zap, BarChart2 } from "lucide-react";
import { getActiveProducts, getCategorySummary, formatMoney, getUsers } from "../data/store";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const summary = useMemo(() => getCategorySummary(6).slice(0, 6), []);
  const featured = useMemo(() => {
    const products = getActiveProducts();
    const users = getUsers();
    return products.slice(0, 6).map((p) => {
      const u = users.find((user) => user.id === p.farmer_id);
      return { ...p, farmer_name: u?.name, farm_name: u?.farm_name };
    });
  }, []);

  return (
    <div>
      {/* HERO SECTION WITH SLIDING ANIMATIONS */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--green-glow)", color: "var(--green)", padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "600", marginBottom: "1rem" }}>
            <Sparkles size={14} /> Direct Mandi Rates & Fresh Produce
          </div>
          <h1>Sell your harvest directly to buyers</h1>
          <p className="lead">
            List your produce, track every sale in real-time, and check verified APMC Mandi benchmarks before quoting a price. Zero middlemen, fair margins.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">
              Start selling <ArrowRight size={16} />
            </Link>
            <Link to="/marketplace" className="btn btn-ghost">
              Browse Marketplace
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="hint"
            style={{ background: "rgba(30, 41, 59, 0.5)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", marginTop: "2rem" }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>Quick Demo Logins (Password: <code>demo1234</code>):</div>
            <div>🌾 Farmer: <code>ramesh@demo.com</code> or <code>anita@demo.com</code></div>
            <div>🛒 Buyer: <code>sunita@demo.com</code></div>
          </motion.div>
        </motion.div>

        {/* HERO BENCHMARK PRICE PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="hero-panel"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Live Market Benchmarks</h2>
            <Link to="/trends" className="link" style={{ fontSize: "0.85rem" }}>
              All Mandi rates &rarr;
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Latest Avg</th>
                  <th className="num">MoM Trend</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.category}>
                    <td>
                      <strong>{row.category}</strong>
                    </td>
                    <td className="num">
                      {formatMoney(row.latest)}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}> / kg</span>
                    </td>
                    <td className="num">
                      {row.change_pct !== null ? (
                        <span style={{ color: row.change_pct >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                          {row.change_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {row.change_pct >= 0 ? "+" : ""}{row.change_pct}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* FRESHLY LISTED SECTION */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Freshly Listed Produce</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Direct from verified regional farmers</p>
          </div>
          <Link to="/marketplace" className="link" style={{ fontWeight: 600 }}>
            View all listings &rarr;
          </Link>
        </div>

        <motion.div
          className="card-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
        >
          {featured.map((product) => (
            <motion.div
              key={product.id}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* WHY CHOOSE US / FEATURE CARDS */}
      <section className="section">
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h2>Built specifically for modern agriculture</h2>
          <p style={{ color: "var(--text-muted)" }}>Tools that empower farmers and connect direct wholesale buyers</p>
        </div>

        <div className="card-grid-3">
          <motion.div
            whileHover={{ y: -8 }}
            className="card"
            style={{ borderTop: "3px solid var(--green)" }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--green-glow)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <Zap size={22} />
            </div>
            <h3>List in 60 Seconds</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Add crops with unit, asking price, and quantity. Stock auto-deducts the moment a sale or order is confirmed.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -8 }}
            className="card"
            style={{ borderTop: "3px solid var(--cyan)" }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(6, 182, 212, 0.15)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <BarChart2 size={22} />
            </div>
            <h3>Fair-Price Intelligence</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Algorithms compare your quote against 24-month Mandi records and peer prices, alerting you if you are underquoting.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -8 }}
            className="card"
            style={{ borderTop: "3px solid var(--purple)" }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(168, 85, 247, 0.15)", color: "var(--purple)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <ShieldCheck size={22} />
            </div>
            <h3>Complete Sales Ledger</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Record both cash counter sales and online orders in a single ledger, filter by buyer or date, and export to CSV.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

