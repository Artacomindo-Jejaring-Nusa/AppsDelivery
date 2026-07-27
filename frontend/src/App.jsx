import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './features/dashboard/DashboardPage';
import DeliveryOrdersPage from './features/delivery/DeliveryOrdersPage';
import FleetPage from './features/fleet/FleetPage';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import UserPage from './features/users/UserPage';
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
          <Route path="fleet" element={<FleetPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="user" element={<UserPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
