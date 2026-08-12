import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import FleetMap from '../../components/shared/FleetMap';

// ─── Countdown Timer Hook ───
function useCountdownTimers(dispatches) {
  const [timers, setTimers] = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initialize timers from dispatches
    const initial = {};
    dispatches.forEach((d) => {
      initial[d.id] = d.countdownSeconds;
    });
    setTimers(initial);

    intervalRef.current = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key] > 0) next[key] -= 1;
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [dispatches]);

  return timers;
}

// ─── Format Countdown ───
function formatCountdown(seconds) {
  if (seconds <= 0) return 'EXPIRED';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function countdownColorClass(seconds) {
  if (seconds <= 0)
    return 'bg-error text-on-error';
  if (seconds < 300)
    return 'bg-error-container text-error animate-pulse';
  if (seconds < 900)
    return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
}

// ─── Status Badge Component ───
function StatusBadge({ status }) {
  const config = {
    on_route: {
      icon: 'local_shipping',
      label: 'On Route',
      classes: 'bg-secondary-container text-on-secondary-container',
    },
    waiting: {
      icon: 'hourglass_empty',
      label: 'Waiting',
      classes: 'bg-surface-container-highest text-on-surface-variant',
    },
    dispatched: {
      icon: 'assignment_turned_in',
      label: 'Dispatched',
      classes: 'bg-primary-container text-on-primary-container',
    },
    unloading: {
      icon: 'downloading',
      label: 'Unloading',
      classes:
        'bg-surface-container-high text-on-surface-variant border border-outline-variant',
    },
    in_transit: {
      icon: 'local_shipping',
      label: 'In Transit',
      classes: 'bg-secondary-container text-on-secondary-container',
    },
    pending: {
      icon: 'hourglass_empty',
      label: 'Pending',
      classes: 'bg-surface-container-highest text-on-surface-variant',
    },
    delivered: {
      icon: 'check_circle',
      label: 'Delivered',
      classes: 'bg-emerald-100 text-emerald-800',
    },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className={`inline-flex items-center gap-xs px-sm py-1 rounded-full font-label-sm text-label-sm ${c.classes}`}
    >
      <span className="material-symbols-outlined text-sm">{c.icon}</span>
      {c.label}
    </span>
  );
}

// ─── Demo / Fallback Data ───
const DEMO_DISPATCHES = [
  {
    id: '1',
    doNumber: 'DO-7829-X',
    btsId: 'BTS-JKT-004',
    btsName: 'Senayan Distribution Hub',
    driverName: 'Anton D.',
    driverInitials: 'AD',
    vehiclePlate: 'B 1234 ABC',
    vehicleType: 'Heavy',
    status: 'on_route',
    countdownSeconds: 3240,
  },
  {
    id: '2',
    doNumber: 'DO-8102-Y',
    btsId: 'BTS-BDG-012',
    btsName: 'Dago North Gateway',
    driverName: 'Rina S.',
    driverInitials: 'RS',
    vehiclePlate: 'D 5678 XYZ',
    vehicleType: 'Mid',
    status: 'waiting',
    countdownSeconds: 245,
  },
  {
    id: '3',
    doNumber: 'DO-9021-Z',
    btsId: 'BTS-SBY-088',
    btsName: 'Juanda Logistics Center',
    driverName: 'Budi M.',
    driverInitials: 'BM',
    vehiclePlate: 'L 9012 DEF',
    vehicleType: 'Light',
    status: 'dispatched',
    countdownSeconds: 1200,
  },
  {
    id: '4',
    doNumber: 'DO-6744-W',
    btsId: 'BTS-MDN-019',
    btsName: 'Medan Industrial Park',
    driverName: 'Kevin P.',
    driverInitials: 'KP',
    vehiclePlate: 'BK 4455 GH',
    vehicleType: 'Heavy',
    status: 'unloading',
    countdownSeconds: 4500,
  },
  {
    id: '5',
    doNumber: 'DO-5521-V',
    btsId: 'BTS-DPS-003',
    btsName: 'Denpasar Air Freight',
    driverName: 'Made A.',
    driverInitials: 'MA',
    vehiclePlate: 'DK 3321 OP',
    vehicleType: 'Mid',
    status: 'on_route',
    countdownSeconds: 915,
  },
];

const DEMO_ALERTS = [
  {
    id: 1,
    type: 'error',
    title: 'Delay Alert',
    message: 'DO-8102-Y stationary for > 20 mins at Junction 12.',
    time: '2m ago',
    borderClass: 'border-error',
    bgClass: 'bg-error-container/20',
    titleClass: 'text-error',
  },
  {
    id: 2,
    type: 'info',
    title: 'Reroute Suggested',
    message:
      'Traffic congestion detected on Route A-12. Suggested reroute to B-4.',
    time: '15m ago',
    borderClass: 'border-primary',
    bgClass: 'bg-secondary-container/20',
    titleClass: 'text-primary',
  },
  {
    id: 3,
    type: 'system',
    title: 'System Maintenance',
    message: 'Database sync completed for HK Regional Hub.',
    time: '1h ago',
    borderClass: 'border-tertiary',
    bgClass: 'bg-tertiary-fixed/20 opacity-70',
    titleClass: 'text-on-surface',
  },
];

// ═══════════════════════════════════════
// ─── Dashboard Page Component ────────
// ═══════════════════════════════════════
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const timers = useCountdownTimers(dispatches);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, dosRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => null),
        api.get('/delivery-orders?per_page=15').catch(() => null),
      ]);

      if (statsRes && statsRes.data?.data) {
        setStats(statsRes.data.data);
      } else {
        setStats({
          total_delivery_orders: 0,
          today_delivery_orders: 0,
          month_delivery_orders: 0,
          do_status_breakdown: { returned: 0, completed: 0, pending: 0 },
          sla_breakdown: { red: 0, yellow: 0, green: 0 },
          active_manifests: 0,
          total_dismantle_assets: 0,
          active_drivers: 0,
        });
      }

      if (dosRes && dosRes.data?.data) {
        const data = dosRes.data.data;
        // Map real API data into dispatches format
        const mapped = data.map((doItem, idx) => ({
          id: doItem.id || String(idx),
          doNumber: doItem.do_number,
          btsId: doItem.bts_site?.site_id || 'BTS-SITE',
          btsName: doItem.bts_site?.site_name || 'Site Location',
          driverName: doItem.driver?.full_name || 'Unassigned',
          driverInitials: (doItem.driver?.full_name || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          vehiclePlate: doItem.driver?.vehicle_plate || '-',
          vehicleType: doItem.driver?.vehicle_type || '-',
          status: doItem.status || 'pending',
          countdownSeconds:
            doItem.sla_detail?.remaining_hours != null
              ? Math.max(0, Math.floor(doItem.sla_detail.remaining_hours * 3600))
              : 3600,
        }));
        setDispatches(mapped);
      } else {
        setDispatches(DEMO_DISPATCHES);
      }

      if (statsRes?.data?.data) {
        const s = statsRes.data.data;
        const dynamicAlerts = [];
        if ((s.sla_breakdown?.red || 0) > 0) {
          dynamicAlerts.push({
            id: 1,
            type: 'error',
            title: 'SLA Breach Warning',
            message: `${s.sla_breakdown.red} Delivery Orders exceed SLA threshold limits.`,
            time: 'Just now',
            borderClass: 'border-error',
            bgClass: 'bg-error-container/20',
            titleClass: 'text-error',
          });
        }
        if (s.active_drivers > 0) {
          dynamicAlerts.push({
            id: 2,
            type: 'info',
            title: 'Fleet Active',
            message: `${s.active_drivers} drivers currently online and dispatched.`,
            time: '5m ago',
            borderClass: 'border-primary',
            bgClass: 'bg-secondary-container/20',
            titleClass: 'text-primary',
          });
        }
        dynamicAlerts.push({
          id: 3,
          type: 'system',
          title: 'System Normal',
          message: 'All dispatch operations are running within SLA targets.',
          time: '10m ago',
          borderClass: 'border-tertiary',
          bgClass: 'bg-tertiary-fixed/20 opacity-70',
          titleClass: 'text-on-surface',
        });
        setAlerts(dynamicAlerts);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-lg">
      {/* ─── Dashboard Header & KPI Overview ─── */}
      <section>
        <div className="flex items-end justify-between mb-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              {t('dashboard.title', 'Control Tower Dashboard')}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('dashboard.subtitle', 'Real-time oversight of global dispatch operations and SLA compliance.')}
            </p>
          </div>
          <div className="flex gap-sm">
            <button className="px-md py-sm bg-surface-container-highest text-on-surface-variant font-label-md text-label-md rounded-lg flex items-center gap-xs hover:opacity-80 transition-all">
              <span className="material-symbols-outlined text-sm">
                filter_list
              </span>
              {t('dashboard.filter', 'Filter')}
            </button>
            <button className="px-md py-sm bg-surface-container-highest text-on-surface-variant font-label-md text-label-md rounded-lg flex items-center gap-xs hover:opacity-80 transition-all">
              <span className="material-symbols-outlined text-sm">
                download
              </span>
              {t('dashboard.export', 'Export')}
            </button>
          </div>
        </div>

        {/* ─── KPI Cards Bento Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {/* Total DO Today */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-200 group cursor-pointer"
               style={{ transition: 'all 0.2s ease-out' }}
               onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
               onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div className="flex justify-between items-start">
              <div className="p-2 bg-secondary-container rounded-lg">
                <span className="material-symbols-outlined text-on-secondary-container">
                  summarize
                </span>
              </div>
              <span className="text-emerald-600 font-label-sm text-label-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-xs">
                  calendar_today
                </span>
                {t('dashboard.month_total', 'Month Total')}: {stats?.month_delivery_orders ?? 0}
              </span>
            </div>
            <div className="mt-xl">
              <p className="font-label-md text-label-md text-on-surface-variant mb-xs">
                {t('dashboard.total_do_today', 'Total DO Today')}
              </p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">
                {stats?.today_delivery_orders?.toLocaleString() ?? '0'}
              </h3>
            </div>
          </div>

          {/* SLA Breach Risk */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-200 group cursor-pointer"
               style={{ transition: 'all 0.2s ease-out' }}
               onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
               onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div className="flex justify-between items-start">
              <div className="p-2 bg-error-container rounded-lg">
                <span className="material-symbols-outlined text-on-error-container">
                  warning
                </span>
              </div>
              <span className={`font-label-sm text-label-sm flex items-center gap-xs ${(stats?.sla_breakdown?.red || 0) > 0 ? 'text-error' : 'text-emerald-600'}`}>
                <span className="material-symbols-outlined text-xs">
                  {(stats?.sla_breakdown?.red || 0) > 0 ? 'priority_high' : 'done'}
                </span>
                {(stats?.sla_breakdown?.red || 0) > 0 ? 'High Risk' : 'Normal'}
              </span>
            </div>
            <div className="mt-xl">
              <p className="font-label-md text-label-md text-on-surface-variant mb-xs">
                {t('dashboard.sla_breach_risk', 'SLA Breach Risk')}
              </p>
              <h3 className={`font-headline-lg text-headline-lg ${(stats?.sla_breakdown?.red || 0) > 0 ? 'text-error' : 'text-on-surface'}`}>
                {stats?.sla_breakdown?.red ?? 0}
              </h3>
            </div>
            <div className="mt-xs w-full bg-surface-container h-1 rounded-full overflow-hidden">
              <div className="bg-error h-full rounded-full" style={{ width: `${stats?.total_delivery_orders > 0 ? ((stats.sla_breakdown?.red / stats.total_delivery_orders) * 100).toFixed(0) : 0}%` }}></div>
            </div>
          </div>

          {/* Active Drivers */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-200 group cursor-pointer"
               style={{ transition: 'all 0.2s ease-out' }}
               onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
               onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div className="flex justify-between items-start">
              <div className="p-2 bg-tertiary-container rounded-lg text-on-tertiary-container">
                <span className="material-symbols-outlined">person</span>
              </div>
              <span className="text-on-surface-variant font-label-sm text-label-sm">
                {stats?.active_drivers > 0 ? (stats?.active_drivers * 100 / 10).toFixed(0) : 0}% Cap.
              </span>
            </div>
            <div className="mt-xl">
              <p className="font-label-md text-label-md text-on-surface-variant mb-xs">
                {t('dashboard.active_drivers', 'Active Drivers')}
              </p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">
                {stats?.active_drivers ?? 0}
              </h3>
            </div>
          </div>

          {/* Missed Deliveries */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-200 group cursor-pointer"
               style={{ transition: 'all 0.2s ease-out' }}
               onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
               onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div className="flex justify-between items-start">
              <div className="p-2 bg-surface-container-highest rounded-lg">
                <span className="material-symbols-outlined text-outline">
                  event_busy
                </span>
              </div>
              <span className="text-emerald-600 font-label-sm text-label-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-xs">
                  history
                </span>
                Completed: {stats?.do_status_breakdown?.completed ?? 0}
              </span>
            </div>
            <div className="mt-xl">
              <p className="font-label-md text-label-md text-on-surface-variant mb-xs">
                {t('dashboard.missed_deliveries', 'Missed Deliveries')}
              </p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">
                {String(stats?.do_status_breakdown?.returned ?? 0).padStart(2, '0')}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Dispatch Monitor Table ─── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface-bright">
          <h3 className="font-headline-sm text-headline-sm text-primary">
            {t('dashboard.live_dispatch_monitor', 'Live Dispatch Monitor')}
          </h3>
          <div className="flex items-center gap-md">
            <span className="text-body-sm font-body-sm text-on-surface-variant">
              Last updated: Just now
            </span>
            <div className="flex items-center gap-xs bg-surface-container-high rounded-full px-sm py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="font-label-sm text-label-sm">
                {stats?.active_drivers ?? 84} Nodes Active
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  {t('dashboard.do_number', 'DO Number')}
                </th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  {t('dashboard.destination', 'Destination (BTS ID/Name)')}
                </th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  {t('dashboard.driver_info', 'Driver Info')}
                </th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  {t('dashboard.status', 'Status')}
                </th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">
                  {t('dashboard.sla_countdown', 'SLA Countdown')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-xl text-center text-secondary">
                    <div className="flex justify-center items-center gap-sm">
                      <span className="material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      Loading dispatch data...
                    </div>
                  </td>
                </tr>
              ) : (
                dispatches.map((d, idx) => {
                  const remaining = timers[d.id] ?? d.countdownSeconds;
                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-surface-container-low transition-colors group ${
                        idx % 2 === 2 ? 'bg-surface-container-low/30' : ''
                      }`}
                    >
                      <td className="px-lg py-sm font-data-mono text-data-mono text-primary font-semibold">
                        {d.doNumber}
                      </td>
                      <td className="px-lg py-sm">
                        <div className="font-body-md text-body-md font-semibold text-on-surface">
                          {d.btsId}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          {d.btsName}
                        </div>
                      </td>
                      <td className="px-lg py-sm">
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center font-bold text-primary border border-outline-variant text-label-sm">
                            {d.driverInitials}
                          </div>
                          <div>
                            <div className="font-body-md text-body-md">
                              {d.driverName}
                            </div>
                            <div className="font-label-sm text-label-sm text-on-surface-variant">
                              {d.vehiclePlate} • {d.vehicleType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-sm">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-lg py-sm text-right">
                        <div
                          className={`inline-block px-md py-1 rounded font-data-mono text-data-mono font-bold ${countdownColorClass(
                            remaining
                          )}`}
                        >
                          {formatCountdown(remaining)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-lg py-sm border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant">
          <div>
            Showing {dispatches.length} of{' '}
            {stats?.total_delivery_orders?.toLocaleString() ?? '0'} Delivery Orders
          </div>
          <div className="flex items-center gap-xs">
            <button className="p-1 hover:bg-surface-container transition-colors rounded">
              <span className="material-symbols-outlined text-lg">
                chevron_left
              </span>
            </button>
            <span className="font-label-md px-2">Page 1 of {Math.max(1, Math.ceil((stats?.total_delivery_orders || 0) / 15))}</span>
            <button className="p-1 hover:bg-surface-container transition-colors rounded">
              <span className="material-symbols-outlined text-lg">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Bottom Layout: Route Map & Alerts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Live Fleet Map (Google Maps API) */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <FleetMap height="320px" />
        </div>

        {/* Critical Alerts */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col h-80">
          <h4 className="font-headline-sm text-headline-sm mb-md flex items-center justify-between">
            Critical Alerts
            <span className="bg-error text-on-error px-2 py-0.5 rounded-full text-[10px] font-bold">
              {alerts.length} NEW
            </span>
          </h4>
          <div className="flex-1 space-y-sm overflow-y-auto pr-xs">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-sm ${alert.bgClass} border-l-4 ${alert.borderClass} rounded-r-lg`}
              >
                <div className="flex justify-between items-start mb-xs">
                  <span
                    className={`font-label-md text-label-md ${alert.titleClass} font-bold`}
                  >
                    {alert.title}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {alert.time}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
          <button className="mt-md text-center py-xs text-primary font-label-md text-label-md border border-primary/20 rounded hover:bg-primary/5 transition-colors">
            View All Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
