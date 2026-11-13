import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  getProductById,
  addProduct,
  updateProduct,
} from "../data/store";
import { CATEGORIES, UNITS, UNIT_BY_CATEGORY } from "../data/seed";
import { ArrowLeft, Save, Sprout } from "lucide-react";

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    category: "Vegetables",
    unit: UNIT_BY_CATEGORY["Vegetables"],
    quantity_available: "",
    price_per_unit: "",
    description: "",
    harvest_date: new Date().toISOString().slice(0, 10),
    district: user?.district || "Nashik",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      const p = getProductById(+id);
      if (!p) {
        addToast("Listing not found", "error");
        navigate("/products");
        return;
      }
      setFormData({
        name: p.name,
        category: p.category,
        unit: p.unit,
        quantity_available: p.quantity_available,
        price_per_unit: p.price_per_unit,
        description: p.description || "",
        harvest_date: p.harvest_date || "",
        district: p.district || "",
      });
    }
  }, [id, isEdit]);

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category: newCat,
      unit: UNIT_BY_CATEGORY[newCat] || "kg",
    }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Provide a name for your produce.");
      return;
    }
    const qty = parseFloat(formData.quantity_available);
    if (isNaN(qty) || qty < 0) {
      setError("Please enter a valid stock quantity.");
      return;
    }
    const price = parseFloat(formData.price_per_unit);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price per unit greater than 0.");
      return;
    }

    const payload = {
      ...formData,
      farmer_id: user?.id || 1,
      quantity_available: qty,
      price_per_unit: price,
      name: formData.name.trim(),
      description: formData.description.trim(),
    };

    if (isEdit) {
      updateProduct(+id, payload);
      addToast(`'${payload.name}' updated successfully!`, "success");
      navigate(`/products/${id}`);
    } else {
      const created = addProduct(payload);
      addToast(`'${payload.name}' is now listed!`, "success");
      navigate(`/products/${created.id}`);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "1.5rem auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/products" className="link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={16} /> Back to listings
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--green-glow)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sprout size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: "1.35rem", marginBottom: 0 }}>
              {isEdit ? "Edit Produce Listing" : "New Produce Listing"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>
              {isEdit ? "Update stock, pricing, or description" : "List your harvest on the AgriDirect marketplace"}
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
            <label className="form-label">Produce Name *</label>
            <input
              type="text"
              name="name"
              required
              className="form-input"
              placeholder="e.g. Tomatoes (Hybrid), Sharbati Wheat"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select name="category" className="form-select" value={formData.category} onChange={handleCategoryChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit *</label>
              <select name="unit" className="form-select" value={formData.unit} onChange={handleChange}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity Available *</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                name="quantity_available"
                className="form-input"
                placeholder="e.g. 500"
                value={formData.quantity_available}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price per {formData.unit} (₹) *</label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                name="price_per_unit"
                className="form-input"
                placeholder="e.g. 35.00"
                value={formData.price_per_unit}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Harvest Date</label>
              <input
                type="date"
                name="harvest_date"
                className="form-input"
                value={formData.harvest_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">District Origin</label>
              <input
                type="text"
                name="district"
                className="form-input"
                placeholder="e.g. Nashik, Indore"
                value={formData.district}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description & Quality Notes</label>
            <textarea
              name="description"
              className="form-textarea"
              rows={3}
              placeholder="e.g. Freshly hand-picked, pesticide-free, sorted by size..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              <Save size={16} /> {isEdit ? "Save Changes" : "Create Listing"}
            </button>
            <Link to="/products" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

