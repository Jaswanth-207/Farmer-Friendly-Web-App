import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { UserPlus, Sprout, ShoppingCart, ArrowRight } from "lucide-react";

export default function Register() {
  const [role, setRole] = useState("farmer");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    farm_name: "",
    village: "",
    district: "",
    state: "",
  });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (formData.phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(formData.phone.trim())) {
      setError("Please enter a valid contact phone number.");
      return;
    }
    if (!formData.district.trim()) {
      setError("District is required.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (formData.password !== formData.confirm) {
      setError("Passwords do not match.");
      return;
    }

    const payload = {
      role,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      farm_name: role === "farmer" ? formData.farm_name.trim() : "",
      village: formData.village.trim(),
      district: formData.district.trim(),
      state: formData.state.trim(),
    };

    const err = register(payload);
    if (err) {
      setError(err);
      addToast(err, "error");
    } else {
      addToast("Account created successfully! Welcome to AgriDirect.", "success");
      navigate(role === "farmer" ? "/dashboard" : "/marketplace");
    }
  };

  return (
    <div style={{ maxWidth: "560px", margin: "1.5rem auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card"
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green-glow)", color: "var(--green)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
            <UserPlus size={24} />
          </div>
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>Create your Account</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Join thousands of farmers and verified buyers</p>
        </div>

        {/* ROLE SELECTOR */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setRole("farmer")}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: `2px solid ${role === "farmer" ? "var(--green)" : "var(--border)"}`,
              background: role === "farmer" ? "var(--green-glow)" : "var(--bg-input)",
              color: role === "farmer" ? "var(--green)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Sprout size={18} /> I am a Farmer
          </button>

          <button
            type="button"
            onClick={() => setRole("buyer")}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: `2px solid ${role === "buyer" ? "var(--cyan)" : "var(--border)"}`,
              background: role === "buyer" ? "rgba(6, 182, 212, 0.15)" : "var(--bg-input)",
              color: role === "buyer" ? "var(--cyan)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <ShoppingCart size={18} /> I am a Buyer
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--red)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", border: "1px solid var(--red-dim)" }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                className="form-input"
                placeholder="Ramesh Patil"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                className="form-input"
                placeholder="ramesh@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="9820011223"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {role === "farmer" && (
              <div className="form-group">
                <label className="form-label">Farm / Business Name</label>
                <input
                  type="text"
                  name="farm_name"
                  className="form-input"
                  placeholder="Patil Organic Orchards"
                  value={formData.farm_name}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">District *</label>
              <input
                type="text"
                name="district"
                required
                className="form-input"
                placeholder="Nashik"
                value={formData.district}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input
                type="text"
                name="state"
                className="form-input"
                placeholder="Maharashtra"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password * (min 8 chars)</label>
              <input
                type="password"
                name="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                name="confirm"
                required
                className="form-input"
                placeholder="••••••••"
                value={formData.confirm}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
            Register as {role === "farmer" ? "Farmer" : "Buyer"} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
        <p style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.74rem", color: "var(--text-dim)" }}>
          Demo mode: accounts are stored locally in your browser&apos;s localStorage (no backend server).
        </p>
      </motion.div>
    </div>
  );
}

