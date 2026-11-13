import React, { useState } from "react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import { Sprout, Menu, X, LogOut, User, BarChart3, ShoppingBag, LayoutDashboard, Layers, Receipt } from "lucide-react";

export default function Layout() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    addToast("You have been signed out.", "success");
    navigate("/");
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="app-wrapper">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" onClick={closeMenu}>
            <div className="brand-mark">
              <Sprout size={22} color="#0a0f1a" strokeWidth={2.5} />
            </div>
            <div>
              <strong>AgriDirect</strong>
              <small>farm to buyer, no middlemen</small>
            </div>
          </Link>

          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav className={`nav ${mobileMenuOpen ? "open" : ""}`}>
            {user ? (
              <>
                {user.role === "farmer" ? (
                  <>
                    <NavLink to="/dashboard" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                      <LayoutDashboard size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                      Dashboard
                    </NavLink>
                    <NavLink to="/products" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                      <Layers size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                      My Listings
                    </NavLink>
                    <NavLink to="/sales" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                      <Receipt size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                      Sales
                    </NavLink>
                  </>
                ) : (
                  <NavLink to="/orders" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                    <Receipt size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                    My Orders
                  </NavLink>
                )}
                <NavLink to="/marketplace" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <ShoppingBag size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                  Marketplace
                </NavLink>
                <NavLink to="/trends" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <BarChart3 size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                  Price Trends
                </NavLink>
                <button
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: "6px" }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/marketplace" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <ShoppingBag size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                  Marketplace
                </NavLink>
                <NavLink to="/trends" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <BarChart3 size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                  Price Trends
                </NavLink>
                <NavLink to="/login" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <User size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                  Sign in
                </NavLink>
                <Link to="/register" onClick={closeMenu} className="btn btn-primary btn-sm" style={{ marginLeft: "8px" }}>
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      <footer className="site-footer">
        <p>
          AgriDirect &mdash; Direct farmer-to-buyer marketplace. Benchmark prices are indicative wholesale (Mandi) averages.
        </p>
        {user && (
          <p style={{ marginTop: "6px", color: "var(--green)", fontSize: "0.82rem" }}>
            Signed in as <strong>{user.name}</strong> ({user.role}) {user.farm_name ? `• ${user.farm_name}` : ""}
          </p>
        )}
      </footer>
    </div>
  );
}

