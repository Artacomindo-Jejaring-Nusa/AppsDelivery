import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null); // 'notifications' | 'settings' | 'user' | null

  const handleLogout = async () => {
    setActiveDropdown(null);
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

            {/* Notifications Dropdown Container */}
            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
                className={`p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full relative ${activeDropdown === 'notifications' ? 'bg-surface-container-low text-primary' : ''}`}
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
              </button>

              {activeDropdown === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-md py-sm bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                    <h4 className="font-semibold text-body-md text-on-surface">System Notifications</h4>
                    <span className="px-xs py-0.5 bg-primary/10 text-primary text-label-sm font-semibold rounded">4 New</span>
                  </div>
                  <div className="divide-y divide-outline-variant max-h-80 overflow-y-auto custom-scrollbar">
                    <div className="p-md hover:bg-surface-container-low transition-colors cursor-pointer flex gap-sm border-l-4 border-error">
                      <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">report</span>
                      </div>
                      <div>
                        <p className="text-body-sm font-semibold text-on-surface">SLA Breach Warning</p>
                        <p className="text-body-sm text-on-surface-variant">DO-2026-07-003 has expired SLA limit</p>
                        <span className="text-label-sm text-secondary font-data-mono mt-xs block">1 min ago</span>
                      </div>
                    </div>
                    <div className="p-md hover:bg-surface-container-low transition-colors cursor-pointer flex gap-sm border-l-4 border-amber-500">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                      </div>
                      <div>
                        <p className="text-body-sm font-semibold text-on-surface">SLA Limit Warning</p>
                        <p className="text-body-sm text-on-surface-variant">DO-2026-07-001 approaching SLA breach</p>
                        <span className="text-label-sm text-secondary font-data-mono mt-xs block">10 mins ago</span>
                      </div>
                    </div>
                    <div className="p-md hover:bg-surface-container-low transition-colors cursor-pointer flex gap-sm border-l-4 border-green-500">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                      </div>
                      <div>
                        <p className="text-body-sm font-semibold text-on-surface">New Dispatch Assigned</p>
                        <p className="text-body-sm text-on-surface-variant">Budi Kurir assigned to DO-2026-07-004</p>
                        <span className="text-label-sm text-secondary font-data-mono mt-xs block">30 mins ago</span>
                      </div>
                    </div>
                    <div className="p-md hover:bg-surface-container-low transition-colors cursor-pointer flex gap-sm border-l-4 border-green-500">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                      </div>
                      <div>
                        <p className="text-body-sm font-semibold text-on-surface">Inbound Sync Complete</p>
                        <p className="text-body-sm text-on-surface-variant">48 assets scanned & sync complete</p>
                        <span className="text-label-sm text-secondary font-data-mono mt-xs block">1 hr ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Dropdown Container */}
            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')}
                className={`p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full ${activeDropdown === 'settings' ? 'bg-surface-container-low text-primary' : ''}`}
              >
                <span className="material-symbols-outlined">settings</span>
              </button>

              {activeDropdown === 'settings' && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-md py-sm bg-surface-container-low border-b border-outline-variant">
                    <h4 className="font-semibold text-body-md text-on-surface">Quick Settings</h4>
                  </div>
                  <div className="p-md space-y-md">
                    {/* Theme visual toggle */}
                    <div className="flex justify-between items-center">
                      <span className="text-body-md text-on-surface-variant">Dark Mode</span>
                      <button 
                        onClick={() => {
                          const isDark = document.documentElement.classList.toggle('dark');
                          alert(`Tema diubah ke ${isDark ? 'Gelap' : 'Terang'}`);
                        }}
                        className="w-10 h-6 bg-surface-container-high rounded-full relative p-0.5 transition-colors border border-outline-variant"
                      >
                        <div className="w-5 h-5 bg-primary rounded-full transition-transform transform translate-x-0 dark:translate-x-4 flex items-center justify-center text-[10px] text-white">
                          <span className="material-symbols-outlined text-[10px]">dark_mode</span>
                        </div>
                      </button>
                    </div>

                    <div className="h-px bg-outline-variant"></div>

                    {/* Navigation shortcuts */}
                    <div className="space-y-xs">
                      <button 
                        onClick={() => { navigate('/user'); setActiveDropdown(null); }}
                        className="flex items-center gap-sm w-full p-sm rounded hover:bg-surface-container-low text-left text-body-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">people</span>
                        <span>User Management</span>
                      </button>
                      <button 
                        onClick={() => { navigate('/analytics'); setActiveDropdown(null); }}
                        className="flex items-center gap-sm w-full p-sm rounded hover:bg-surface-container-low text-left text-body-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">analytics</span>
                        <span>Analytics Center</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown Container */}
            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                className={`w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary flex items-center justify-center text-on-primary font-label-md text-label-md font-bold cursor-pointer active:scale-95 transition-transform ${activeDropdown === 'user' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {userInitials}
              </button>

              {activeDropdown === 'user' && (
                <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-md bg-surface-container-low border-b border-outline-variant flex items-center gap-md">
                    <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-headline-sm">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">{user?.full_name || 'Admin Central'}</p>
                      <p className="text-body-sm text-on-surface-variant truncate">{user?.email || 'admin@aksx.id'}</p>
                    </div>
                  </div>
                  <div className="p-md space-y-md text-body-sm">
                    <div>
                      <span className="text-secondary font-label-sm uppercase tracking-wider block mb-xs">System Role</span>
                      <span className="px-sm py-1 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-label-sm font-semibold capitalize inline-block">
                        {user?.role?.replace('_', ' ') || 'Admin'}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary font-label-sm uppercase tracking-wider block mb-xs">Phone Number</span>
                      <p className="font-semibold text-on-surface">{user?.phone || '081299887766'}</p>
                    </div>
                    <div>
                      <span className="text-secondary font-label-sm uppercase tracking-wider block mb-xs">Username</span>
                      <p className="font-data-mono text-data-mono text-on-surface-variant font-semibold">{user?.username || 'admin.central'}</p>
                    </div>

                    <div className="h-px bg-outline-variant"></div>

                    <button 
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-sm w-full py-sm bg-error-container text-error hover:bg-opacity-90 font-semibold rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Transparent Overlay to close active dropdown when clicking outside */}
        {activeDropdown && (
          <div 
            className="fixed inset-0 z-30 bg-transparent" 
            onClick={() => setActiveDropdown(null)}
          />
        )}

        {/* Page Content */}
        <div className="p-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
