import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './features/dashboard/DashboardPage';
import DeliveryOrdersPage from './features/delivery/DeliveryOrdersPage';
import { useAuthStore } from './store/authStore';

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard & App Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="delivery-orders" element={<DeliveryOrdersPage />} />
          <Route path="inventory" element={<DashboardPage />} />
          <Route path="fleet" element={<DashboardPage />} />
          <Route path="analytics" element={<DashboardPage />} />
          <Route path="compliance" element={<DashboardPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
