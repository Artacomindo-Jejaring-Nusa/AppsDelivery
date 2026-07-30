import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [slaLogs, setSlaLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('sla'); // 'sla' or 'activity'

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [resAnalytics, resSlaLogs, resAuditLogs] = await Promise.allSettled([
        api.get('/dashboard/analytics'),
        api.get('/sla/logs?per_page=15'),
        api.get('/users/me') // or audit log preview if available
      ]);

      if (resAnalytics.status === 'fulfilled' && resAnalytics.value?.data?.data) {
        setAnalytics(resAnalytics.value.data.data);
      }
      if (resSlaLogs.status === 'fulfilled' && resSlaLogs.value?.data?.data) {
        setSlaLogs(resSlaLogs.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      let endpoint = '/reports/export/delivery-orders';
      let defaultFileName = `Laporan_DO_Shipments_${new Date().toISOString().slice(0, 10)}.xlsx`;

      if (type === 'dismantle') {
        endpoint = '/reports/export/dismantle-assets';
        defaultFileName = `Laporan_Bahan_Dismantle_${new Date().toISOString().slice(0, 10)}.xlsx`;
      } else if (type === 'activity') {
        endpoint = '/reports/export/activity-logs';
        defaultFileName = `Laporan_Aktivitas_Sistem_${new Date().toISOString().slice(0, 10)}.xlsx`;
      }

      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = defaultFileName;
      link.click();
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Gagal mendownload laporan: Pastikan Anda login sebagai Admin/Dispatcher');
    }
  };

  // Calculations for charts
  const greenCount = analytics?.sla_status_breakdown?.green || 0;
  const yellowCount = analytics?.sla_status_breakdown?.yellow || 0;
  const redCount = analytics?.sla_status_breakdown?.red || 0;
  const totalEvaluated = greenCount + yellowCount + redCount;

  const greenPct = totalEvaluated > 0 ? Math.round((greenCount / totalEvaluated) * 100) : 100;
  const yellowPct = totalEvaluated > 0 ? Math.round((yellowCount / totalEvaluated) * 100) : 0;
  const redPct = totalEvaluated > 0 ? Math.round((redCount / totalEvaluated) * 100) : 0;

  const monthlyTrend = analytics?.monthly_trend || [];
  const regionalCompliance = analytics?.regional_compliance || [];

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      {/* ─── Page Title Area ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
            Analytics & Activity Report Generator
            {loading && <span className="material-symbols-outlined animate-spin text-primary text-[20px]">sync</span>}
          </h2>
          <p className="text-on-surface-variant text-body-md mt-xs">
            Analisis performa SLA, kepatuhan waktu pengiriman, dan pembuatan laporan rekapitulasi aktivitas proses operasional.
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
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
          <button 
            onClick={() => handleExport('activity')}
            className="bg-emerald-700 text-white px-md py-sm rounded-lg font-label-md flex items-center gap-xs hover:bg-emerald-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">history_edu</span>
            <span>Export Activity Report (Excel)</span>
          </button>
        </div>
      </div>

      {/* ─── Expanded Summary Bento Grid (SLA-Focused Real Data) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-md">
        {/* Total Shipments */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Total Shipments</span>
            <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">
            {analytics?.total_shipments?.toLocaleString('id-ID') ?? '0'}
          </div>
          <div className="mt-xs text-green-600 font-label-sm flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span> Real System DO
          </div>
        </div>

        {/* On-Time Del. % */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">On-Time Del. %</span>
            <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">
            {analytics ? `${analytics.on_time_percentage.toFixed(1)}%` : '0%'}
          </div>
          <div className="mt-xs text-on-surface-variant font-label-sm">Target: 92% SLA</div>
        </div>

        {/* SLA Breach Risk */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">SLA Breach Risk</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold text-amber-600">
            {analytics?.sla_breach_risk ?? 0}
          </div>
          <div className="mt-xs text-amber-600 font-label-sm font-semibold flex items-center gap-xs">
            <span>●</span> Warning (Yellow)
          </div>
        </div>

        {/* SLA Breached / Overdue */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">SLA Breached</span>
            <span className="material-symbols-outlined text-error text-[20px]">error_outline</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold text-error">
            {analytics?.sla_breached ?? 0}
          </div>
          <div className="mt-xs text-error font-label-sm font-semibold flex items-center gap-xs">
            <span className="material-symbols-outlined text-[14px]">priority_high</span> Overdue (Red)
          </div>
        </div>

        {/* Active Inbound Sessions */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Active Inbound</span>
            <span className="material-symbols-outlined text-primary text-[20px]">barcode_scanner</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">
            {String(analytics?.active_inbound ?? 0).padStart(2, '0')}
          </div>
          <div className="mt-xs text-on-surface-variant font-label-sm">In Transit / Assigned</div>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="text-on-surface-variant font-label-md">Avg Resolution</span>
            <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
          </div>
          <div className="font-headline-md text-on-background text-headline-md font-bold">
            {analytics ? analytics.avg_resolution_hours.toFixed(1) : '0'} <span className="text-body-sm font-normal text-secondary">Hours</span>
          </div>
          <div className="mt-xs text-green-600 font-label-sm flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">speed</span> Realtime Avg
          </div>
        </div>
      </div>

      {/* ─── Structured Charts Area ─── */}
      <div className="grid grid-cols-12 gap-lg">
        {/* Large Bar/Line Chart */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-surface-container-lowest p-lg border border-outline-variant rounded-xl shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-lg">
                <div>
                  <h3 className="font-headline-sm text-on-background text-headline-sm font-bold">SLA Achievement Trend</h3>
                  <p className="font-body-sm text-on-surface-variant text-body-sm">Pencapaian ketepatan waktu pengiriman berdasarkan data pengiriman aktual</p>
                </div>
                <div className="flex gap-md">
                  <div className="flex items-center gap-xs text-label-sm">
                    <span className="w-3 h-3 bg-primary rounded-full"></span> On-Time Rate (%)
                  </div>
                  <div className="flex items-center gap-xs text-label-sm">
                    <span className="w-3 h-0.5 bg-error border-dashed"></span> SLA Target (92%)
                  </div>
                </div>
              </div>

              {/* Dynamic Chart Bars */}
              <div className="h-[320px] relative border-l border-b border-outline-variant flex items-end gap-xs p-xs">
                <div className="absolute inset-0 border-t border-dashed border-error/30 top-[8%] w-full h-[1px] pointer-events-none z-10"></div>
                {monthlyTrend.length > 0 ? (
                  monthlyTrend.map((item, idx) => {
                    const heightPercent = Math.max(15, Math.min(100, item.rate || 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        <div 
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-primary/75 group-hover:bg-primary rounded-t-sm transition-all duration-300 relative"
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface px-xs py-[2px] rounded text-[10px] font-bold shadow pointer-events-none whitespace-nowrap z-20">
                            {item.on_time}/{item.total} ({item.rate.toFixed(0)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-body-sm">
                    Memuat data tren pengiriman...
                  </div>
                )}
              </div>

              <div className="mt-md flex justify-between font-label-sm text-on-surface-variant text-body-sm px-sm">
                {monthlyTrend.length > 0 ? (
                  <>
                    <span>{monthlyTrend[0]?.label}</span>
                    {monthlyTrend.length > 2 && <span>{monthlyTrend[Math.floor(monthlyTrend.length / 2)]?.label}</span>}
                    <span>{monthlyTrend[monthlyTrend.length - 1]?.label}</span>
                  </>
                ) : (
                  <span>Data waktu nyata</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Operational Clusters & Region Stats */}
        <div className="col-span-12 lg:col-span-4 space-y-lg flex flex-col justify-between">
          {/* SLA Distribution Donut */}
          <div className="bg-surface-container-lowest p-lg border border-outline-variant rounded-xl shadow-sm">
            <h3 className="font-headline-sm text-on-background text-headline-sm font-bold mb-lg">SLA Status Distribution</h3>
            <div className="flex items-center gap-lg">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#eceef0" strokeWidth="4"></circle>
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#059669" strokeDasharray={`${greenPct} 100`} strokeWidth="4"></circle>
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#d97706" strokeDasharray={`${yellowPct} 100`} strokeDashoffset={`-${greenPct}`} strokeWidth="4"></circle>
                  <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#ba1a1a" strokeDasharray={`${redPct} 100`} strokeDashoffset={`-${greenPct + yellowPct}`} strokeWidth="4"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-headline-sm text-headline-sm">SLA</span>
                  <span className="text-[10px] text-on-surface-variant uppercase font-medium">Status</span>
                </div>
              </div>
              <div className="flex-grow space-y-sm">
                <div className="flex items-center justify-between font-label-md text-body-sm font-semibold">
                  <span className="flex items-center gap-xs"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></span> Aman (Green)</span>
                  <span>{greenPct}%</span>
                </div>
                <div className="flex items-center justify-between font-label-md text-body-sm font-semibold">
                  <span className="flex items-center gap-xs"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Warning (Yellow)</span>
                  <span>{yellowPct}%</span>
                </div>
                <div className="flex items-center justify-between font-label-md text-body-sm font-semibold">
                  <span className="flex items-center gap-xs"><span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span> Overdue (Red)</span>
                  <span>{redPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Regional SLA Compliance */}
          <div className="bg-surface-container-lowest p-lg border border-outline-variant rounded-xl shadow-sm">
            <h3 className="font-headline-sm text-on-background text-headline-sm font-bold mb-lg">SLA Compliance by Region</h3>
            <div className="space-y-md">
              {regionalCompliance.length > 0 ? (
                regionalCompliance.map((reg, idx) => (
                  <div key={idx} className="space-y-xs">
                    <div className="flex justify-between font-label-sm text-body-sm">
                      <span className="truncate pr-2 font-medium">{reg.region}</span>
                      <span className="font-bold font-data-mono shrink-0">{reg.sla_rate.toFixed(1)}% SLA</span>
                    </div>
                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${reg.sla_rate}%` }}
                        className={`h-full rounded-full ${reg.sla_rate >= 92 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-on-surface-variant text-body-sm text-center py-sm">
                  Belum ada data wilayah pengiriman
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Activity & Process Report Table ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-lg py-md border-b border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-md bg-surface-container-low/30">
          <div>
            <h3 className="font-headline-sm text-on-background text-headline-sm font-bold flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[22px]">table_chart</span>
              Laporan Aktivitas Process & Log Operasional
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Tabel rekapitulasi audit peristiwa & transisi status pengiriman yang menggambarkan proses terjadi secara sederhana.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button 
              onClick={() => handleExport('activity')}
              className="bg-primary text-on-primary px-md py-xs rounded font-label-sm flex items-center gap-xs hover:opacity-90 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Unduh Tabel Excel</span>
            </button>
            <button 
              onClick={fetchAnalyticsData}
              className="text-primary font-label-md hover:underline font-semibold text-body-sm flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-md text-on-surface-variant border-b border-outline-variant uppercase text-body-sm">
                <th className="px-lg py-md">Nomor DO / Ref</th>
                <th className="px-lg py-md">Transisi Peristiwa (Process Activity)</th>
                <th className="px-lg py-md">Catatan / Detail Ringkasan</th>
                <th className="px-lg py-md">Waktu Peristiwa</th>
                <th className="px-lg py-md text-right">Status SLA</th>
              </tr>
            </thead>
            <tbody className="font-body-sm divide-y divide-outline-variant text-body-sm">
              {slaLogs.length > 0 ? (
                slaLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-lg py-md font-semibold text-on-surface font-data-mono">
                      {log.do_number || `DO-${log.delivery_order_id?.slice(0, 8)}`}
                    </td>
                    <td className="px-lg py-md text-on-surface-variant">
                      <span className="capitalize px-xs py-0.5 rounded bg-surface-container">{log.previous_status || 'initial'}</span> ➔ <span className="font-semibold uppercase text-primary">{log.new_status}</span>
                    </td>
                    <td className="px-lg py-md text-on-surface-variant">
                      {log.message || 'Evaluasi SLA & Aktivitas Operasional'}
                    </td>
                    <td className="px-lg py-md font-data-mono text-on-surface-variant">
                      {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-lg py-md text-right">
                      <span 
                        className={`px-sm py-xs rounded-full font-label-sm font-semibold text-[10px] uppercase border ${
                          log.new_status === 'green'
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : log.new_status === 'yellow'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {log.new_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                    Belum ada log aktivitas proses tercatat. Setiap aktivitas pengiriman dan scan barang akan otomatis direkam dalam tabel laporan ini.
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
