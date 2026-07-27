import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Shipments', path: '/delivery-orders', icon: 'local_shipping' },
    { label: 'Fleet', path: '/fleet', icon: 'directions_bus' },
    { label: 'Analytics', path: '/analytics', icon: 'analytics' },
    { label: 'User & Accounts', path: '/user', icon: 'people' },
  ];

  const userInitials = (user?.full_name || user?.username || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      {/* ─── Sidebar Navigation ─── */}
      <nav className="w-60 h-screen fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex flex-col py-lg px-md z-50">
        {/* Brand */}
        <div className="mb-xl px-sm">
          <div
            className="flex items-center gap-sm cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-lg">hub</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm text-primary leading-none">
                Operations Center
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant opacity-70">
                Global Logistics
              </p>
            </div>
          </div>
        </div>

        {/* New Shipment Button */}
        <button
          onClick={() => navigate('/delivery-orders')}
          className="mb-xl w-full py-sm px-md bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-xs hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Shipment
        </button>

        {/* Main Nav Items */}
        <div className="flex-1 flex flex-col gap-xs">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-md px-md py-sm rounded-lg transition-colors duration-200 ease-in-out w-full text-left ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Links */}
        <div className="mt-auto flex flex-col gap-xs pt-md border-t border-outline-variant">
          <button
            className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:text-on-surface transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md text-label-md">Support</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:text-on-surface transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* ─── Main Content Canvas ─── */}
      <main className="ml-60 flex-1 min-h-screen">
        {/* Top App Bar */}
        <header className="flex justify-between items-center px-lg w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant h-16">
          <div className="flex items-center gap-lg flex-1">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary text-body-md"
                placeholder="Search DO, Driver, or Hub..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            {/* Live Indicator */}
            <div className="flex items-center gap-xs pr-md border-r border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Live System: Active
              </span>
            </div>
            {/* Notifications */}
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            </button>
            {/* Settings */}
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
              <span className="material-symbols-outlined">settings</span>
            </button>
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary flex items-center justify-center text-on-primary font-label-md text-label-md font-bold">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
