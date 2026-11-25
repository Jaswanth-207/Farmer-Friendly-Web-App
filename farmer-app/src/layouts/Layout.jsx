import React, { useState } from "react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import {
  Sprout,
  Menu,
  X,
  LogOut,
  User,
  BarChart3,
  ShoppingBag,
  LayoutDashboard,
  Layers,
  Receipt,
  ShieldCheck,
} from "lucide-react";

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
            type="button"
            className="hamburger"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav className={`nav ${mobileMenuOpen ? "open" : ""}`} aria-label="Primary navigation">
            {user ? (
              <>
                {user.role === "admin" ? (
                  <NavLink to="/admin" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                    <ShieldCheck size={15} className="nav-icon" />
                    Admin Monitor
                  </NavLink>
                ) : user.role === "farmer" ? (
                  <>
                    <NavLink to="/dashboard" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                      <LayoutDashboard size={15} className="nav-icon" />
                      Dashboard
                    </NavLink>
                    <NavLink to="/products" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                      <Layers size={15} className="nav-icon" />
                      My Listings
                    </NavLink>
                    <NavLink to="/sales" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                      <Receipt size={15} className="nav-icon" />
                      Sales
                    </NavLink>
                  </>
                ) : (
                  <NavLink to="/orders" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                    <Receipt size={15} className="nav-icon" />
                    My Orders
                  </NavLink>
                )}
                <NavLink to="/marketplace" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <ShoppingBag size={15} className="nav-icon" />
                  Marketplace
                </NavLink>
                <NavLink to="/trends" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <BarChart3 size={15} className="nav-icon" />
                  Price Trends
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="btn btn-ghost btn-sm nav-cta"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/marketplace" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <ShoppingBag size={15} className="nav-icon" />
                  Marketplace
                </NavLink>
                <NavLink to="/trends" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <BarChart3 size={15} className="nav-icon" />
                  Price Trends
                </NavLink>
                <NavLink to="/login" onClick={closeMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                  <User size={15} className="nav-icon" />
                  Sign in
                </NavLink>
                <Link to="/register" onClick={closeMenu} className="btn btn-primary btn-sm nav-cta">
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
