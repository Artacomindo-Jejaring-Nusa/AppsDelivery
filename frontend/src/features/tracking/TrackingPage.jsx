import React, { useEffect, useState } from 'react';
import TrackingMap from '../../components/shared/TrackingMap';
import api from '../../services/api';

export default function TrackingPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Critical' | 'Delayed'

  // Simulated Active Deliveries
  const deliveriesData = [
    {
      id: '#SHP-7821092',
      type: 'Last Mile Delivery',
      status: 'In Transit',
      progress: 85,
      eta: 'Estimated delivery in 12 mins',
      level: 'normal',
    },
    {
      id: '#SHP-7821095',
      type: 'Bulk Cargo Transfer',
      status: 'Delayed',
      progress: 42,
      eta: 'Heavy traffic on Route 14',
      level: 'delayed',
    },
    {
      id: '#SHP-7821101',
      type: 'Medical Supplies',
      status: 'Express',
      progress: 15,
      eta: 'Departed from Hub East',
      level: 'critical',
    },
  ];

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter deliveries
  const filteredDeliveries = deliveriesData.filter((d) => {
    const matchesSearch = d.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'Critical') return matchesSearch && d.level === 'critical';
    if (filterType === 'Delayed') return matchesSearch && d.level === 'delayed';
    return matchesSearch;
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative -m-lg overflow-hidden animate-in fade-in duration-300">
      {/* ─── Map Area (Takes remaining space) ─── */}
      <div className="flex-1 relative w-full overflow-hidden bg-slate-100">
        
        {/* Real Interactive Google Map */}
        <div className="absolute inset-0 z-0">
          <TrackingMap />
        </div>

        {/* Floating KPI Overlay (Top Right) */}
        <div className="absolute top-md right-md flex gap-sm z-10">
          <div className="bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant p-sm rounded-lg shadow-lg w-40">
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Fleet Online</p>
            <div className="flex items-baseline gap-xs mt-xs">
              <p className="font-headline-sm text-headline-sm text-primary font-bold">124</p>
              <p className="text-[10px] text-on-secondary-container bg-secondary-container px-1 rounded font-semibold">+12%</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant p-sm rounded-lg shadow-lg w-40">
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Active BTS</p>
            <div className="flex items-baseline gap-xs mt-xs">
              <p className="font-headline-sm text-headline-sm text-primary font-bold">48</p>
              <p className="text-[10px] text-on-error-container bg-error-container px-1 rounded font-semibold">2 Down</p>
            </div>
          </div>
        </div>

        {/* Left Sidebar Overlay (Active Deliveries) */}
        <div className="absolute top-md left-md bottom-md w-80 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-2xl rounded-xl z-10 flex flex-col overflow-hidden">
          <div className="p-md border-b border-outline-variant">
            <div className="flex items-center justify-between mb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Active Deliveries</h3>
              <span className="bg-primary text-on-primary px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider animate-pulse">LIVE</span>
            </div>
            <div className="flex gap-xs">
              {['All', 'Critical', 'Delayed'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`flex-1 py-1 rounded text-label-sm font-semibold transition-all ${
                    filterType === t 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'bg-surface-container border border-outline-variant text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Deliveries List */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant custom-scrollbar">
            {filteredDeliveries.map((delivery) => (
              <div key={delivery.id} className="p-md hover:bg-surface-container transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-base">
                  <div>
                    <p className="font-label-md text-label-md text-primary font-bold group-hover:underline">{delivery.id}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{delivery.type}</p>
                  </div>
                  <span className={`flex items-center gap-xs text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    delivery.level === 'critical' 
                      ? 'bg-primary-fixed text-primary' 
                      : delivery.level === 'delayed' 
                        ? 'bg-error-container text-error' 
                        : 'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {delivery.level === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>}
                    {delivery.level === 'delayed' && <span className="material-symbols-outlined text-[12px]">warning</span>}
                    {delivery.status}
                  </span>
                </div>
                <div className="space-y-base">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-secondary">Progress</span>
                    <span className="text-on-surface font-medium">{delivery.progress}%</span>
                  </div>
                  <div className="w-full bg-surface-variant h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${delivery.level === 'delayed' ? 'bg-error' : 'bg-primary'}`} 
                      style={{ width: `${delivery.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-xs pt-base">
                    <span className={`material-symbols-outlined text-[14px] ${delivery.level === 'delayed' ? 'text-error' : 'text-secondary'}`}>
                      {delivery.level === 'delayed' ? 'traffic' : 'schedule'}
                    </span>
                    <span className={`text-[11px] font-medium ${delivery.level === 'delayed' ? 'text-error' : 'text-secondary'}`}>
                      {delivery.eta}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Search Footer of Overlay */}
          <div className="p-sm bg-surface-container-low border-t border-outline-variant">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Quick find ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-surface-container-lowest text-[11px] border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface"
              />
            </div>
          </div>
        </div>

        {/* Map Legend (Bottom Center) */}
        <div className="absolute bottom-md left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 backdrop-blur-sm px-md py-sm border border-outline-variant rounded-full shadow-lg z-10 flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 border-2 border-primary rounded-full bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            </div>
            <span className="text-[11px] font-semibold text-on-surface">BTS Sites</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px] text-white">local_shipping</span>
            </div>
            <span className="text-[11px] font-semibold text-on-surface">Trucks</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-5 h-5 bg-white border border-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px] text-primary">person</span>
            </div>
            <span className="text-[11px] font-semibold text-on-surface">Couriers</span>
          </div>
        </div>
      </div>

      {/* ─── Fleet Real-time Drawer (Bottom Panel) ─── */}
      <div className="h-56 bg-surface-container-lowest border-t border-outline-variant p-md overflow-hidden flex flex-col z-10 shadow-xl">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Fleet Real-time Monitoring</h3>
          <div className="flex gap-md text-label-sm font-semibold">
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-on-surface">{drivers.filter(d => d.status === 'active').length} On Duty</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-outline"></span>
              <span className="text-secondary">{drivers.filter(d => d.status === 'inactive').length} Offline</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              <span className="text-error font-bold">4 Critical Alerts</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant font-label-md text-label-md text-secondary">
              <tr>
                <th className="pb-sm">Driver / Unit</th>
                <th className="pb-sm">Live Status</th>
                <th className="pb-sm">SLA Performance</th>
                <th className="pb-sm">Location Lat/Long</th>
                <th className="pb-sm">Fuel / Battery</th>
                <th className="pb-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-md text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-md text-center text-secondary">
                    Loading live fleet data...
                  </td>
                </tr>
              ) : drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-surface-container transition-colors">
                    <td className="py-sm">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold">
                          {driver.driver_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface">{driver.driver_name}</p>
                          <p className="text-[10px] text-secondary font-data-mono">{driver.plate_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-sm">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                        driver.status === 'active' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {driver.status === 'active' ? 'DRIVING' : 'RESTING'}
                      </span>
                    </td>
                    <td className="py-sm">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] mb-xs font-semibold">
                          <span>On Time</span>
                          <span>98%</span>
                        </div>
                        <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
                          <div className="bg-primary h-full w-[98%]"></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-sm font-data-mono text-data-mono text-secondary">
                      {driver.current_lat || '-1.2800'} / {driver.current_lng || '116.8500'}
                    </td>
                    <td className="py-sm">
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          {driver.fuel_level < 40 ? 'local_gas_station' : 'ev_station'}
                        </span>
                        <span className="font-semibold">{driver.fuel_level || '84'}%</span>
                      </div>
                    </td>
                    <td className="py-sm text-right">
                      <button 
                        onClick={() => alert(`Hubungi driver ${driver.driver_name} (${driver.phone_number || 'N/A'})`)}
                        className="text-primary hover:underline text-[11px] font-bold"
                      >
                        COMMS
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-md text-center text-secondary">
                    Tidak ada data fleet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button (Contextual) */}
      <div className="fixed bottom-margin right-margin z-20 group">
        <button 
          onClick={() => alert('Fitur penugasan (dispatch) armada baru.')}
          className="bg-primary text-on-primary w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[28px] text-white">add</span>
        </button>
        <span className="absolute right-full mr-sm top-1/2 -translate-y-1/2 bg-inverse-surface text-inverse-on-surface px-md py-sm rounded-lg text-label-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
          Dispatch New Unit
        </span>
      </div>
    </div>
  );
}
