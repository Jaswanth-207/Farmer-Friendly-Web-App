import React, { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { getCategorySeries, getCategorySummary } from "../services/storageService";
import { formatMoney, formatMonthLabel } from "../utils/formatters";
import { CATEGORIES } from "../data/seed";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Trends() {
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  const [monthsWindow, setMonthsWindow] = useState(12);
  const chartSectionRef = useRef(null);

  const seriesData = useMemo(() => {
    return getCategorySeries(selectedCategory, monthsWindow);
  }, [selectedCategory, monthsWindow]);

  const summary = useMemo(() => {
    return getCategorySummary(monthsWindow);
  }, [monthsWindow]);

  // Combine overall trend with individual markets for Recharts
  const chartData = useMemo(() => {
    if (!seriesData || !seriesData.overall) return [];

    return seriesData.overall.map((item, index) => {
      const row = { month: item.month, MandiAverage: item.price };
      seriesData.series.forEach((s) => {
        row[s.market] = s.points[index]?.price ?? null;
      });
      return row;
    });
  }, [seriesData]);

  const marketColors = ["#22c55e", "#06b6d4", "#a855f7", "#eab308", "#f97316"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Regional Mandi Price Trends</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Historical wholesale Mandi benchmark rates across agricultural hubs
          </p>
        </div>

        {/* TIME WINDOW TOGGLE */}
        <div style={{ display: "flex", gap: "6px", background: "var(--bg-card)", padding: "4px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setMonthsWindow(m)}
              className="btn btn-sm"
              style={{
                background: monthsWindow === m ? "var(--green-glow)" : "transparent",
                color: monthsWindow === m ? "var(--green)" : "var(--text-muted)",
                border: "none",
                fontWeight: 600,
              }}
            >
              {m} Months
            </button>
          ))}
        </div>
      </div>

      {/* CATEGORY SELECTOR PILLS */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "1.5rem" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: `1px solid ${selectedCategory === cat ? "var(--green)" : "var(--border)"}`,
              background: selectedCategory === cat ? "var(--green-glow)" : "var(--bg-card)",
              color: selectedCategory === cat ? "var(--green)" : "var(--text-muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* STAT SUMMARY BANNER */}
      <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi-card">
          <div className="kpi-label">Current Average Mandi Price</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>
            {formatMoney(seriesData.latest)}
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}> / kg</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Across all APMC markets
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">{monthsWindow}-Month Price Trend</div>
          <div className="kpi-value">
            {seriesData.trendPct !== null ? (
              <span className={seriesData.trendPct >= 0 ? "up" : "down"} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                {seriesData.trendPct >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                {seriesData.trendPct >= 0 ? "+" : ""}{seriesData.trendPct}%
              </span>
            ) : (
              "—"
            )}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Period net movement
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Historical Average</div>
          <div className="kpi-value">{formatMoney(seriesData.average)}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Mean over {monthsWindow} months
          </div>
        </div>
      </div>

      {/* INTERACTIVE PRICE CHART */}
      <motion.div
        ref={chartSectionRef}
        key={`${selectedCategory}-${monthsWindow}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="chart-card"
        style={{ marginBottom: "2rem" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selectedCategory} Price History (₹ / kg)</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Comparing Nashik, Pune, Indore, Raipur, and Azadpur APMCs (per kg wholesale)</p>
          </div>
        </div>

        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mandiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatMonthLabel}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                labelFormatter={formatMonthLabel}
                formatter={(value) => [value != null ? `${formatMoney(value)} / kg` : "—"]}
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#1e293b",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Area
                type="monotone"
                dataKey="MandiAverage"
                name="Average Mandi Benchmark"
                stroke="#22c55e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#mandiGrad)"
              />
              {seriesData.series.map((s, idx) => (
                <Line
                  key={s.market}
                  type="monotone"
                  dataKey={s.market}
                  name={s.market}
                  stroke={marketColors[idx % marketColors.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ALL CATEGORIES SNAPSHOT TABLE */}
      <div className="card">
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>All Crop Categories Comparison</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Crop Category</th>
                <th className="num">Latest Avg Mandi Price</th>
                <th className="num">MoM Shift</th>
                <th style={{ textAlign: "right" }}>Inspect</th>
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
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(row.category);
                        chartSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      View Chart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

