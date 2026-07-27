import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Delivery Orders', path: '/delivery-orders', icon: 'local_shipping' },
    { label: 'Manifests', path: '/manifests', icon: 'inventory_2' },
    { label: 'Aset Dismantle', path: '/assets', icon: 'qr_code_scanner' },
    { label: 'SLA Monitoring', path: '/sla', icon: 'timer' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-body-md text-on-surface">
      {/* Top Bar */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant px-margin flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-xl">
          <div className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-xs cursor-pointer" onClick={() => navigate('/dashboard')}>
            Logistics<span className="text-primary-container">Pro</span>
          </div>
          <span className="bg-primary-fixed-dim text-on-primary-fixed font-label-sm text-label-sm px-sm py-xs rounded-full">
            PT. AKS X ARTACOM — Telkomsel BTS Project
          </span>
        </div>

        <div className="flex items-center gap-md">
          {/* User Badge */}
          <div className="flex items-center gap-sm bg-surface-container px-md py-xs rounded-full border border-outline-variant">
            <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
            <div className="text-left">
              <p className="font-label-md text-label-md text-on-surface leading-tight">
                {user?.full_name || user?.username || 'Logistics Admin'}
              </p>
              <p className="font-label-sm text-label-sm text-secondary capitalize">
                {user?.role || 'Admin'}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-xs px-md py-xs text-error hover:bg-error-container/30 transition-colors rounded-lg font-label-md text-label-md"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <nav className="bg-surface border-b border-outline-variant px-margin flex items-center gap-md overflow-x-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-xs px-md py-md border-b-2 font-label-md text-label-md transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-semibold bg-primary-fixed/20'
                  : 'border-transparent text-secondary hover:text-on-surface hover:border-outline'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Outlet Content */}
      <main className="flex-1 p-margin max-w-7xl w-full mx-auto animate-in fade-in duration-300">
        <Outlet />
      </main>

      {/* Global Footer */}
      <footer className="w-full py-md px-margin flex flex-col md:flex-row justify-between items-center gap-md bg-surface border-t border-outline-variant mt-auto text-body-sm text-secondary">
        <div>
          PT. AKS X ARTACOM <span className="text-outline">LogisticsPro Enterprise</span>
        </div>
        <div>
          © 2026 PT. Aksarta Artacom Nusa — BTS Telkomsel 4.600 Titik Kalimantan
        </div>
      </footer>
    </div>
  );
}
