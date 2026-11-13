import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 style={{ fontSize: "5rem", fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: "1.5rem", margin: "1rem 0" }}>Harvest Field Not Found</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto 2rem" }}>
          The page or produce listing you're looking for doesn't exist or has been relocated.
        </p>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Return Home
        </Link>
      </motion.div>
    </div>
  );
}

