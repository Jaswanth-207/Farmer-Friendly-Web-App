import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import ProductDetail from "./pages/ProductDetail";
import Sales from "./pages/Sales";
import SaleForm from "./pages/SaleForm";
import Marketplace from "./pages/Marketplace";
import MarketplaceDetail from "./pages/MarketplaceDetail";
import Orders from "./pages/Orders";
import Trends from "./pages/Trends";
import NotFound from "./pages/NotFound";

function FarmerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "farmer") return <Navigate to="/marketplace" replace />;
  return children;
}

function BuyerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
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

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
