import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./layouts/Layout";
import { FarmerRoute, BuyerRoute, AdminRoute } from "./components/RouteGuards";

// Eagerly load primary Review 1 entry page; lazy-load secondary routes for faster initial load
import Home from "./pages/Home";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Sales = lazy(() => import("./pages/Sales"));
const SaleForm = lazy(() => import("./pages/SaleForm"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceDetail = lazy(() => import("./pages/MarketplaceDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const Trends = lazy(() => import("./pages/Trends"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="empty-state" style={{ padding: "4rem 1rem" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading page...</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="marketplace/:id" element={<MarketplaceDetail />} />
                <Route path="trends" element={<Trends />} />

                {/* Farmer Protected Routes */}
                <Route
                  path="dashboard"
                  element={
                    <FarmerRoute>
                      <Dashboard />
                    </FarmerRoute>
                  }
                />
                <Route
                  path="products"
                  element={
                    <FarmerRoute>
                      <Products />
                    </FarmerRoute>
                  }
                />
                <Route
                  path="products/new"
                  element={
                    <FarmerRoute>
                      <ProductForm />
                    </FarmerRoute>
                  }
                />
                <Route
                  path="products/:id"
                  element={
                    <FarmerRoute>
                      <ProductDetail />
                    </FarmerRoute>
                  }
                />
                <Route
                  path="products/:id/edit"
                  element={
                    <FarmerRoute>
                      <ProductForm />
                    </FarmerRoute>
                  }
                />
                <Route
                  path="sales"
                  element={
                    <FarmerRoute>
                      <Sales />
                    </FarmerRoute>
                  }
                />
                <Route
                  path="sales/new"
                  element={
                    <FarmerRoute>
                      <SaleForm />
                    </FarmerRoute>
                  }
                />

                {/* Buyer Protected Routes */}
                <Route
                  path="orders"
                  element={
                    <BuyerRoute>
                      <Orders />
                    </BuyerRoute>
                  }
                />

                {/* Admin Protected Routes */}
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
