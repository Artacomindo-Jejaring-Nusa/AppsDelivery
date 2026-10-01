import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './features/dashboard/DashboardPage';
import DeliveryOrdersPage from './features/delivery/DeliveryOrdersPage';
import FleetPage from './features/fleet/FleetPage';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import UserPage from './features/users/UserPage';
import TrackingPage from './features/tracking/TrackingPage';
import PublicTrackingPage from './features/tracking/PublicTrackingPage';
import BtsSitePage from './features/bts/BtsSitePage';
import TimelinePage from './features/timeline/TimelinePage';
import { useAuthStore } from './store/authStore';

// ProtectedLayout checks authentication and renders MainLayout
const ProtectedLayout = () => {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
};

const router = createBrowserRouter([
  // Public Routes (No Login Required)
  { path: '/login', element: <LoginPage /> },
  { path: '/track', element: <PublicTrackingPage /> },
  { path: '/track/:trackingNumber', element: <PublicTrackingPage /> },

  // Protected Dashboard & App Routes
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'timeline', element: <TimelinePage /> },
      { path: 'delivery-orders', element: <DeliveryOrdersPage /> },
      { path: 'fleet', element: <FleetPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'compliance', element: <AnalyticsPage /> },
      { path: 'user', element: <UserPage /> },
      { path: 'tracking', element: <TrackingPage /> },
      { path: 'bts-sites', element: <BtsSitePage /> },
    ],
  },

  // Catch-all redirect
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

