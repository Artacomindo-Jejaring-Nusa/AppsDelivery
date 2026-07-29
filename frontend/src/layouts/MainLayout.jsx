import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null); // 'notifications' | 'settings' | 'user' | null
  const [newCount, setNewCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Construct WebSocket URL dynamically
  const getWsUrl = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    const wsProto = base.startsWith('https') ? 'wss' : 'ws';
    return base.replace(/^https?:\/\//i, `${wsProto}://`) + '/ws';
  };

  useEffect(() => {
    let socket;
    let reconnectTimeout;

    const connect = () => {
      const url = getWsUrl();
      console.log('[WS Connection] Connecting to:', url);
      socket = new WebSocket(url);

      socket.onmessage = (event) => {
        try {
          const newNotif = JSON.parse(event.data);
          newNotif.id = Date.now();
          console.log('[WS Notification Received]', newNotif);

          setNotifications((prev) => [newNotif, ...prev]);
          setNewCount((prev) => prev + 1);

          // Trigger browser notification if allowed
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotif.title, { body: newNotif.message });
          }
        } catch (err) {
          console.error('[WS Error parsing message]', err);
        }
      };

      socket.onerror = (err) => {
        console.error('[WS Socket Error]', err);
      };

      socket.onclose = () => {
        console.log('[WS Socket Closed] Reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleLogout = async () => {
    setActiveDropdown(null);
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Project Timeline', path: '/timeline', icon: 'account_tree' },
    { label: 'Shipments', path: '/delivery-orders', icon: 'local_shipping' },
    { label: 'Fleet', path: '/fleet', icon: 'directions_bus' },
    { label: 'Analytics', path: '/analytics', icon: 'analytics' },
    { label: 'Compliance', path: '/dashboard', icon: 'verified_user' },
    { label: 'User & Accounts', path: '/user', icon: 'people' },
    { label: 'Tracking & Monitoring', path: '/tracking', icon: 'location_searching' },
    { label: 'BTS Sites', path: '/bts-sites', icon: 'cell_tower' },
  ];

  const userInitials = (user?.full_name || user?.username || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'error':
      case 'sla_breach':
        return {
          borderClass: 'border-error',
          bgClass: 'bg-error-container text-error',
          icon: 'report'
        };
      case 'warning':
      case 'sla_warning':
        return {
          borderClass: 'border-amber-500',
          bgClass: 'bg-amber-100 text-amber-700',
          icon: 'warning'
        };
      case 'delivered':
      case 'completed':
      case 'success':
        return {
          borderClass: 'border-green-500',
          bgClass: 'bg-green-100 text-green-700',
          icon: 'check_circle'
        };
      case 'info':
      case 'in_transit':
      default:
        return {
          borderClass: 'border-blue-500',
          bgClass: 'bg-blue-100 text-blue-700',
          icon: 'local_shipping'
        };
    }
  };

  const handleNotificationClick = (notif) => {
    setActiveDropdown(null);
    if (notif.metadata && notif.metadata.do_number) {
      navigate(`/delivery-orders?search=${notif.metadata.do_number}`);
    } else {
      navigate('/delivery-orders');
    }
  };

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

        {/* Navigation list */}
        <div className="flex-1 space-y-xs overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-md w-full px-md py-sm rounded-lg text-left transition-colors font-semibold text-body-md ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info/Sign out */}
        <div className="mt-auto pt-lg border-t border-outline-variant">
          <button
            onClick={handleLogout}
            className="flex items-center gap-md w-full px-md py-sm rounded-lg text-left text-error hover:bg-error/15 font-semibold text-body-md"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
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
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications');
                  if (activeDropdown !== 'notifications') {
                    setNewCount(0);
                  }
                }}
                className={`p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full relative ${activeDropdown === 'notifications' ? 'bg-surface-container-low text-primary' : ''}`}
              >
                <span className="material-symbols-outlined">notifications</span>
                {newCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {activeDropdown === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-md py-sm bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                    <div className="flex items-center gap-xs">
                      <h4 className="font-semibold text-body-md text-on-surface">System Notifications</h4>
                      {newCount > 0 && (
                        <span className="px-xs py-0.5 bg-primary/10 text-primary text-label-xs font-semibold rounded">{newCount} New</span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          setNotifications([]);
                          setNewCount(0);
                        }}
                        className="text-label-sm font-semibold text-primary hover:underline transition-all"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-outline-variant max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-md text-center text-on-surface-variant text-body-sm">
                        Belum ada notifikasi baru
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const style = getNotificationStyle(notif.type);
                        return (
                          <div 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-md hover:bg-surface-container-low transition-colors cursor-pointer flex gap-sm border-l-4 ${style.borderClass}`}
                          >
                            <div className={`w-8 h-8 rounded-full ${style.bgClass} flex items-center justify-center shrink-0`}>
                              <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-body-sm font-semibold text-on-surface truncate">{notif.title}</p>
                              <p className="text-body-sm text-on-surface-variant break-words">{notif.message || notif.body}</p>
                              <span className="text-label-sm text-secondary font-data-mono mt-xs block">{notif.timestamp}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
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
