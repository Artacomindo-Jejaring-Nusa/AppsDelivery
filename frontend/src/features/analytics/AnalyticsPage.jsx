import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([
    { id: 1, name: 'Weekly SLA Performance - W04', category: 'SLA Tracking', date: '2023-11-28 09:15', status: 'Completed' },
    { id: 2, name: 'Fuel Consumption Analytics Q4', category: 'Operational Cost', date: '2023-11-27 14:20', status: 'Completed' },
    { id: 3, name: 'Monthly Regional Growth Forecast', category: 'Strategic Planning', date: '2023-11-25 11:45', status: 'Processing' },
    { id: 4, name: 'Fleet Maintenance Schedule Dec-23', category: 'Asset Management', date: '2023-11-24 16:30', status: 'Completed' },
  ]);

  const handleExport = async (type) => {
    try {
      const endpoint = type === 'dismantle' 
        ? '/reports/export/dismantle-assets' 
        : '/reports/export/delivery-orders';
      
      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = type === 'dismantle' 
        ? `Laporan_Bahan_Dismantle_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Laporan_DO_Shipments_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Gagal mendownload laporan: Pastikan Anda login sebagai Admin/Dispatcher');
    }
  };

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      {/* ─── Page Title Area ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Analytics</h2>
          <p className="text-on-surface-variant text-body-md mt-xs">Analisis performa SLA, konsumsi bahan bakar, efisiensi rute, dan pertumbuhan operasional.</p>
        </div>
        <div className="flex gap-sm">
          <button 
            onClick={() => handleExport('shipments')}
            className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-md flex items-center gap-xs hover:opacity-90 active:scale-[0.98] transition-all duration-150 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export DO Report</span>
          </button>
          <button 
            onClick={() => handleExport('dismantle')}
            className="bg-secondary-container text-on-secondary-container px-md py-sm rounded-lg font-label-md flex items-center gap-xs hover:bg-secondary-container/80 active:scale-[0.98] transition-all duration-150 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Dismantle Report</span>
          </button>
        </div>
      </div>

      {/* ─── Expanded Summary Bento Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-md">
        {/* Total Shipments */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Total Shipments</span>
            <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">12,482</div>
          <div className="mt-xs text-green-600 font-label-sm flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span> +8.2%
          </div>
        </div>

        {/* On-Time Del. % */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">On-Time Del. %</span>
            <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">94.2%</div>
          <div className="mt-xs text-on-surface-variant font-label-sm">Target: 92%</div>
        </div>

        {/* Fuel Efficiency */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Fuel Efficiency</span>
            <span className="material-symbols-outlined text-primary text-[20px]">gas_meter</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">
            6.8 <span className="text-body-sm font-normal text-secondary">Km/L</span>
          </div>
          <div className="mt-xs text-error font-label-sm flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">trending_down</span> -2.4%
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Revenue (M)</span>
            <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">IDR 842.5</div>
          <div className="mt-xs text-green-600 font-label-sm flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span> +12%
          </div>
        </div>

        {/* Logistics Cost */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Logistics Cost</span>
            <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">IDR 4,120</div>
          <div className="mt-xs text-on-surface-variant font-label-sm">Per Unit Avg.</div>
        </div>

        {/* Fleet Util. % */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Fleet Util. %</span>
            <span className="material-symbols-outlined text-primary text-[20px]">group_work</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">88.4%</div>
          <div className="mt-xs text-primary font-label-sm flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span> Optimized
          </div>
        </div>
      </div>

      {/* ─── Structured Charts Area ─── */}
      <div className="grid grid-cols-12 gap-lg">
        {/* Large Bar/Line Chart */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-surface-container-lowest p-lg border border-outline-variant rounded-xl shadow-sm h-full">
            <div className="flex justify-between items-center mb-lg">
              <div>
                <h3 className="font-headline-sm text-on-background text-headline-sm font-bold">Monthly Shipment Volume & SLA Trend</h3>
                <p className="font-body-sm text-on-surface-variant text-body-sm">Core performance metrics over the last 30 days</p>
              </div>
              <div className="flex gap-md">
                <div className="flex items-center gap-xs text-label-sm">
                  <span className="w-3 h-3 bg-primary rounded-full"></span> Shipments
                </div>
                <div className="flex items-center gap-xs text-label-sm">
                  <span className="w-3 h-0.5 bg-error border-dashed"></span> SLA Target (92%)
                </div>
              </div>
            </div>

            {/* Simulated Chart Bars */}
            <div className="h-[320px] relative border-l border-b border-outline-variant flex items-end gap-xs p-xs">
              <div className="absolute inset-0 border-t border-dashed border-error/20 top-1/4 w-full h-[1px] pointer-events-none"></div>
              <div className="flex-1 bg-primary/10 h-[45%] rounded-t-sm hover:bg-primary/25 transition-colors"></div>
              <div className="flex-1 bg-primary/20 h-[55%] rounded-t-sm hover:bg-primary/35 transition-colors"></div>
              <div className="flex-1 bg-primary/30 h-[65%] rounded-t-sm hover:bg-primary/45 transition-colors"></div>
              <div className="flex-1 bg-primary/25 h-[60%] rounded-t-sm hover:bg-primary/35 transition-colors"></div>
              <div className="flex-1 bg-primary/40 h-[75%] rounded-t-sm hover:bg-primary/55 transition-colors"></div>
              <div className="flex-1 bg-primary/50 h-[85%] rounded-t-sm hover:bg-primary/65 transition-colors"></div>
              <div className="flex-1 bg-primary/45 h-[80%] rounded-t-sm hover:bg-primary/55 transition-colors"></div>
              <div className="flex-1 bg-primary/60 h-[90%] rounded-t-sm hover:bg-primary/75 transition-colors"></div>
              <div className="flex-1 bg-primary/55 h-[88%] rounded-t-sm hover:bg-primary/65 transition-colors"></div>
              <div className="flex-1 bg-primary/70 h-[95%] rounded-t-sm hover:bg-primary/85 transition-colors"></div>
              <div className="flex-1 bg-primary/65 h-[92%] rounded-t-sm hover:bg-primary/75 transition-colors"></div>
              <div className="flex-1 bg-primary/80 h-[100%] rounded-t-sm hover:bg-primary/95 transition-colors"></div>
            </div>

            <div className="mt-md flex justify-between font-label-sm text-on-surface-variant text-body-sm px-sm">
              <span>Jan 01</span>
              <span>Jan 15</span>
              <span>Jan 31</span>
            </div>
          </div>
        </div>

        {/* Operational Clusters & Region Stats */}
        <div className="col-span-12 lg:col-span-4 space-y-lg flex flex-col justify-between">
          {/* Operational Clusters Doughnut */}
          <div className="bg-surface-container-lowest p-lg border border-outline-variant rounded-xl shadow-sm">
            <h3 className="font-headline-sm text-on-background text-headline-sm font-bold mb-lg">Operational Clusters</h3>
            <div className="flex items-center gap-lg">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#eceef0" strokeWidth="4"></circle>
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#1e3a8a" strokeDasharray="42 100" strokeWidth="4"></circle>
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#505f76" strokeDasharray="28 100" strokeDashoffset="-42" strokeWidth="4"></circle>
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#d0e1fb" strokeDasharray="30 100" strokeDashoffset="-70" strokeWidth="4"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-headline-sm text-headline-sm">12k</span>
                  <span className="text-[10px] text-on-surface-variant uppercase font-medium">Units</span>
                </div>
              </div>
              <div className="flex-grow space-y-sm">
                <div className="flex items-center justify-between font-label-md text-body-sm font-semibold">
                  <span className="flex items-center gap-xs"><span className="w-2.5 h-2.5 bg-primary rounded-full"></span> Jakarta</span>
                  <span>42%</span>
                </div>
                <div className="flex items-center justify-between font-label-md text-body-sm font-semibold">
                  <span className="flex items-center gap-xs"><span className="w-2.5 h-2.5 bg-secondary rounded-full"></span> Tangerang</span>
                  <span>28%</span>
                </div>
                <div className="flex items-center justify-between font-label-md text-body-sm font-semibold">
                  <span className="flex items-center gap-xs"><span className="w-2.5 h-2.5 bg-secondary-container rounded-full border border-outline-variant"></span> Bekasi</span>
                  <span>30%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Fleet Efficiency */}
          <div className="bg-surface-container-lowest p-lg border border-outline-variant rounded-xl shadow-sm">
            <h3 className="font-headline-sm text-on-background text-headline-sm font-bold mb-lg">Fleet Efficiency by Region</h3>
            <div className="space-y-md">
              <div className="space-y-xs">
                <div className="flex justify-between font-label-sm text-body-sm">
                  <span>West Region</span>
                  <span className="font-bold font-data-mono">8.2 Km/L</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[85%] rounded-full"></div>
                </div>
              </div>
              <div className="space-y-xs">
                <div className="flex justify-between font-label-sm text-body-sm">
                  <span>Central Hub</span>
                  <span className="font-bold font-data-mono">6.1 Km/L</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full w-[60%] rounded-full"></div>
                </div>
              </div>
              <div className="space-y-xs">
                <div className="flex justify-between font-label-sm text-body-sm">
                  <span>East Corridor</span>
                  <span className="font-bold font-data-mono">7.4 Km/L</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-primary/60 h-full w-[75%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Performance Reports Table ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-headline-sm text-on-background text-headline-sm font-bold">Recent Performance Reports</h3>
          <button className="text-primary font-label-md hover:underline font-semibold text-body-sm">
            View All Reports
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-md text-on-surface-variant border-b border-outline-variant uppercase text-body-sm">
                <th className="px-lg py-md">Report Name</th>
                <th className="px-lg py-md">Category</th>
                <th className="px-lg py-md">Generated Date</th>
                <th className="px-lg py-md">Status</th>
                <th className="px-lg py-md text-right">Action</th>
              </tr>
            </thead>
            <tbody className="font-body-sm divide-y divide-outline-variant text-body-sm">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-lg py-md font-semibold text-on-surface">{report.name}</td>
                  <td className="px-lg py-md text-on-surface-variant">{report.category}</td>
                  <td className="px-lg py-md font-data-mono">{report.date}</td>
                  <td className="px-lg py-md">
                    <span 
                      className={`px-sm py-xs rounded-full font-label-sm font-semibold text-[10px] uppercase border ${
                        report.status === 'Completed' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-lg py-md text-right">
                    {report.status === 'Completed' ? (
                      <button 
                        onClick={() => alert(`Downloading report: ${report.name}`)}
                        className="material-symbols-outlined text-primary cursor-pointer hover:scale-110 active:scale-95 transition-all text-[20px]"
                      >
                        download
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-outline text-[20px] animate-spin">
                        hourglass_empty
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
