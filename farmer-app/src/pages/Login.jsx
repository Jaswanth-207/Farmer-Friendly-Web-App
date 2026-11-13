import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { LogIn, Lock, Mail, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("ramesh@demo.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const err = login(email, password);
    if (err) {
      setError(err);
      addToast(err, "error");
    } else {
      addToast("Signed in successfully!", "success");
      // Check role to direct appropriately
      const u = JSON.parse(localStorage.getItem("agri_users") || "[]").find(
        (x) => x.email.toLowerCase() === email.toLowerCase()
      );
      if (u?.role === "buyer") {
        navigate("/marketplace");
      } else {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div style={{ maxWidth: "440px", margin: "2rem auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card"
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green-glow)", color: "var(--green)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
            <LogIn size={24} />
          </div>
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>Sign in to AgriDirect</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Manage your crops, orders, and sales</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--red)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", border: "1px solid var(--red-dim)" }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: "flex", gap: "6px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Demo presets:</span>
            <button
              type="button"
              onClick={() => { setEmail("ramesh@demo.com"); setPassword("demo1234"); }}
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--green)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
            >
              Ramesh (Farmer)
            </button>
            <button
              type="button"
              onClick={() => { setEmail("sunita@demo.com"); setPassword("demo1234"); }}
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--cyan)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
            >
              Sunita (Buyer)
            </button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Sign in <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Create an account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

