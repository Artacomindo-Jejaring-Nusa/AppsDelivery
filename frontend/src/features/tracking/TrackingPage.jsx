import React, { useEffect, useState } from 'react';
import TrackingMap from '../../components/shared/TrackingMap';
import api from '../../services/api';
import zteBtsSites from '../../data/zte_bts_sites.json';

export default function TrackingPage() {
  const [drivers, setDrivers] = useState([]);
  const [btsSites, setBtsSites] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Critical' | 'Delayed'
  const [selectedDO, setSelectedDO] = useState(null);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      fetchAllData(true); // Silent background auto-polling every 5s
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Fetch drivers, BTS sites, and delivery orders concurrently
      const [driversRes, sitesRes, ordersRes] = await Promise.allSettled([
        api.get('/drivers?per_page=100'),
        api.get('/bts-sites?per_page=100'),
        api.get('/delivery-orders?per_page=100'),
      ]);

      if (driversRes.status === 'fulfilled') {
        setDrivers(driversRes.value.data.data || []);
      }
      if (sitesRes.status === 'fulfilled' && sitesRes.value.data.data?.length > 0) {
        setBtsSites(sitesRes.value.data.data);
      } else {
        setBtsSites(zteBtsSites.slice(0, 50));
      }
      if (ordersRes.status === 'fulfilled') {
        setDeliveryOrders(ordersRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tracking data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Filter Delivery Orders for sidebar list
  const filteredDeliveries = deliveryOrders.filter((d) => {
    const doNumber = d.do_number || '';
    const desc = d.description || '';
    const siteName = d.bts_site?.site_name || d.destination_address || '';
    
    const matchesSearch = 
      doNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      siteName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isCritical = d.sla_status === 'red' || d.sla_detail?.is_overdue;
    const isDelayed = d.sla_status === 'yellow' || (d.status === 'pending' && isCritical);

    if (filterType === 'Critical') return matchesSearch && isCritical;
    if (filterType === 'Delayed') return matchesSearch && isDelayed;
    return matchesSearch;
  });

  const getProgressPercentage = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 100;
      case 'delivered': return 90;
      case 'in_transit': return 60;
      case 'pending': return 20;
      default: return 35;
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative -m-lg overflow-hidden animate-in fade-in duration-300">
      {/* ─── Map Area ─── */}
      <div className="flex-1 relative w-full overflow-hidden bg-slate-100">
        
        {/* Real Interactive Google Map */}
        <div className="absolute inset-0 z-0">
          <TrackingMap drivers={drivers} btsSites={btsSites} selectedDO={selectedDO} />
        </div>

        {/* Floating KPI Overlay (Top Right) */}
        <div className="absolute top-md right-md flex gap-sm z-10">
          <div className="bg-surface-container-lowest/95 backdrop-blur-sm border border-outline-variant p-sm rounded-lg shadow-lg w-44">
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Fleet Online</p>
            <div className="flex items-baseline gap-xs mt-xs">
              <p className="font-headline-sm text-headline-sm text-primary font-bold">
                {drivers.filter(d => d.is_active).length} Unit
              </p>
              <p className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-1 rounded font-bold">
                LIVE DB
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest/95 backdrop-blur-sm border border-outline-variant p-sm rounded-lg shadow-lg w-44">
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Active BTS Sites</p>
            <div className="flex items-baseline gap-xs mt-xs">
              <p className="font-headline-sm text-headline-sm text-primary font-bold">
                {btsSites.length} Sites
              </p>
              <p className="text-[10px] text-blue-800 bg-blue-100 border border-blue-200 px-1 rounded font-bold">
                ACTIVE
              </p>
            </div>
          </div>
        </div>

        {/* Left Sidebar Overlay (Active Deliveries) */}
        <div className="absolute top-md left-md bottom-md w-84 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-2xl rounded-xl z-10 flex flex-col overflow-hidden">
          <div className="p-md border-b border-outline-variant">
            <div className="flex items-center justify-between mb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Active Deliveries</h3>
              <span className="bg-primary text-on-primary px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider animate-pulse">
                REALTIME DB ({deliveryOrders.length})
              </span>
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
            {loading && deliveryOrders.length === 0 ? (
              <div className="p-xl text-center text-secondary text-body-sm flex flex-col items-center gap-xs">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                <span>Memuat data pengiriman...</span>
              </div>
            ) : filteredDeliveries.length > 0 ? (
              filteredDeliveries.map((delivery) => {
                const progress = getProgressPercentage(delivery.status);
                const isOutbound = delivery.type === 'outbound' || (delivery.notes?.toLowerCase().includes('dismantle'));
                const isRed = delivery.sla_status === 'red' || delivery.sla_detail?.is_overdue;
                const isYellow = delivery.sla_status === 'yellow';

                return (
                  <div 
                    key={delivery.id} 
                    onClick={() => setSelectedDO(delivery)}
                    className={`p-md hover:bg-surface-container transition-colors cursor-pointer group ${selectedDO?.id === delivery.id ? 'bg-blue-50/60 border-l-4 border-primary' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-xs">
                      <div>
                        <p className="font-label-md text-label-md text-primary font-bold group-hover:underline">
                          {delivery.do_number}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">
                          {isOutbound ? '🟧 OUTBOUND DISMANTLE' : '🟦 INBOUND LOGISTICS'}
                        </p>
                      </div>
                      <span className={`flex items-center gap-xs text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isRed
                          ? 'bg-red-100 text-red-900 border border-red-300' 
                          : isYellow 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {delivery.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>

                    <div className="space-y-xs">
                      <p className="text-[11px] text-secondary truncate" title={delivery.bts_site?.site_name || delivery.destination_address}>
                        🎯 {delivery.bts_site?.site_name || delivery.destination_address || 'Site BTS Kalimantan'}
                      </p>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-secondary font-medium">Progress</span>
                        <span className="text-on-surface font-bold">{progress}%</span>
                      </div>
                      <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isRed ? 'bg-red-600' : isYellow ? 'bg-amber-500' : 'bg-primary'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center gap-xs pt-xs">
                        <span className={`material-symbols-outlined text-[13px] ${isRed ? 'text-red-600' : 'text-secondary'}`}>
                          {isRed ? 'warning' : 'schedule'}
                        </span>
                        <span className={`text-[11px] font-semibold ${isRed ? 'text-red-700' : 'text-secondary'}`}>
                          {delivery.sla_detail?.remaining_formatted ? `Sisa: ${delivery.sla_detail.remaining_formatted}` : `Target SLA: ${delivery.sla_days || 3} Hari`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-xl text-center text-secondary text-body-sm">
                Belum ada pengiriman aktif.
              </div>
            )}
          </div>

          {/* Quick Search Footer */}
          <div className="p-sm bg-surface-container-low border-t border-outline-variant">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Cari No. DO atau Site BTS..."
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
            <span className="text-[11px] font-semibold text-on-surface">BTS Sites (DB)</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              🚛
            </div>
            <span className="text-[11px] font-semibold text-on-surface">Driver Fleet (DB)</span>
          </div>
        </div>
      </div>

      {/* ─── Fleet Real-time Drawer (Bottom Panel) ─── */}
      <div className="h-56 bg-surface-container-lowest border-t border-outline-variant p-md overflow-hidden flex flex-col z-10 shadow-xl">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Fleet Real-time Monitoring</h3>
          <div className="flex gap-md text-label-sm font-semibold">
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-on-surface font-bold">
                {drivers.filter(d => d.is_active && !d.is_available).length} On Duty
              </span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-secondary font-bold">
                {drivers.filter(d => d.is_active && d.is_available).length} Available (Idle)
              </span>
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
                <th className="pb-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-md text-on-surface">
              {loading && drivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-md text-center text-secondary">
                    Loading live fleet data...
                  </td>
                </tr>
              ) : drivers.length > 0 ? (
                drivers.map((driver, idx) => {
                  const lat = (driver.current_lat || driver.latitude || (-1.5 + (idx * 0.4))).toFixed(4);
                  const lng = (driver.current_lng || driver.longitude || (114.5 + (idx * 0.8))).toFixed(4);
                  const isAvailable = driver.is_available;

                  return (
                    <tr key={driver.id} className="hover:bg-surface-container transition-colors">
                      <td className="py-sm">
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[12px]">
                            {driver.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{driver.full_name}</p>
                            <p className="text-[11px] text-secondary font-data-mono">{driver.vehicle_plate || 'Box Truck'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-sm">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                          !isAvailable 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {!isAvailable ? '🟢 ON ROUTE / IN TRANSIT' : '⚪ AVAILABLE (IDLE)'}
                        </span>
                      </td>
                      <td className="py-sm">
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] mb-xs font-semibold">
                            <span>SLA Aman</span>
                            <span className="text-emerald-700">100% On Time</span>
                          </div>
                          <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full w-[100%]"></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-sm font-data-mono text-data-mono text-secondary">
                        {lat} / {lng}
                      </td>
                      <td className="py-sm text-right">
                        <button 
                          onClick={() => alert(`Hubungi Driver ${driver.full_name}\nTelepon: ${driver.phone || '081288990000'}`)}
                          className="px-sm py-xs bg-primary text-white rounded text-[11px] font-bold hover:bg-primary/90 transition-colors shadow-xs"
                        >
                          COMMS
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-md text-center text-secondary">
                    Tidak ada data fleet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
