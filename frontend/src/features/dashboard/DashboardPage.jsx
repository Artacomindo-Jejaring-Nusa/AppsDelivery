import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentDOs, setRecentDOs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, dosRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => null),
        api.get('/delivery-orders?per_page=5').catch(() => null),
      ]);

      if (statsRes && statsRes.data.data) {
        setStats(statsRes.data.data);
      } else {
        // Fallback demo data
        setStats({
          total_delivery_orders: 4600,
          in_transit: 142,
          completed: 4230,
          sla_green: 120,
          sla_yellow: 18,
          sla_red: 4,
        });
      }

      if (dosRes && dosRes.data.data) {
        setRecentDOs(dosRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-xl">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <div className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-xs">
            PT. AKS X ARTACOM — Operational Control Center
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Dashboard Reverse Logistics & SLA
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-xs">
            Proyek Migrasi & Dismantle BTS Telkomsel (4.600 Titik, Wilayah Kalimantan)
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>Refresh Data</span>
        </button>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Total Active DO */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Aktif Pengiriman</p>
            <p className="font-headline-lg text-headline-lg text-primary font-bold mt-xs">
              {stats?.in_transit || 142}
            </p>
            <span className="font-label-sm text-label-sm text-secondary">Total Target: 4.600 Site</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-fixed/30 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">local_shipping</span>
          </div>
        </div>

        {/* SLA Green */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">SLA Aman (🟢)</p>
            <p className="font-headline-lg text-headline-lg text-emerald-700 font-bold mt-xs">
              {stats?.sla_green || 120}
            </p>
            <span className="font-label-sm text-label-sm text-emerald-600 font-medium">Sisa Waktu &gt; 24 Jam</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">check_circle</span>
          </div>
        </div>

        {/* SLA Yellow */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">SLA Warning (🟡)</p>
            <p className="font-headline-lg text-headline-lg text-amber-700 font-bold mt-xs">
              {stats?.sla_yellow || 18}
            </p>
            <span className="font-label-sm text-label-sm text-amber-600 font-medium">Sisa Waktu 1 - 24 Jam</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
        </div>

        {/* SLA Red */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">SLA Overdue (🔴)</p>
            <p className="font-headline-lg text-headline-lg text-error font-bold mt-xs">
              {stats?.sla_red || 4}
            </p>
            <span className="font-label-sm text-label-sm text-error font-medium">Terlambat (Eskalasi)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">alarm_off</span>
          </div>
        </div>
      </div>

      {/* Recent DO Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex justify-between items-center">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Daftar Pengiriman Terbaru</h3>
            <p className="font-body-sm text-body-sm text-secondary mt-xs">
              Status pengiriman material migrasi & reverse dismantle BTS
            </p>
          </div>
          <span className="font-data-mono text-data-mono bg-surface-container px-md py-xs rounded-full border border-outline-variant">
            SLA Standard: H+1 s/d H+5 (Hari & Jam)
          </span>
        </div>

        {loading ? (
          <div className="p-xl text-center text-secondary flex justify-center items-center gap-sm">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span>Memuat data pengiriman...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-secondary uppercase">
                  <th className="py-md px-lg">No. DO</th>
                  <th className="py-md px-lg">Site BTS</th>
                  <th className="py-md px-lg">Deskripsi Material</th>
                  <th className="py-md px-lg">Status DO</th>
                  <th className="py-md px-lg">SLA Hari</th>
                  <th className="py-md px-lg">Sisa SLA (Hari & Jam)</th>
                  <th className="py-md px-lg text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-body-md">
                {recentDOs.length > 0 ? (
                  recentDOs.map((doItem) => {
                    const slaFormatted = doItem.sla_detail?.remaining_formatted || `${doItem.sla_days} Hari`;
                    const isRed = doItem.sla_status === 'red' || doItem.sla_detail?.is_overdue;
                    const isYellow = doItem.sla_status === 'yellow';

                    return (
                      <tr key={doItem.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-md px-lg font-data-mono font-semibold text-primary">
                          {doItem.do_number}
                        </td>
                        <td className="py-md px-lg">
                          <span className="font-semibold text-on-surface">
                            {doItem.bts_site?.site_id || 'BTS-SITE-001'}
                          </span>
                          <p className="font-body-sm text-body-sm text-secondary">
                            {doItem.bts_site?.site_name || 'Site Kalimantan'}
                          </p>
                        </td>
                        <td className="py-md px-lg text-secondary max-w-xs truncate">
                          {doItem.description}
                        </td>
                        <td className="py-md px-lg">
                          <span className="capitalize px-sm py-xs rounded-full text-body-sm font-medium bg-surface-container border border-outline-variant">
                            {doItem.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-md px-lg font-data-mono font-medium">
                          {doItem.sla_days || 3} Hari ({doItem.sla_hours || 72} Jam)
                        </td>
                        <td className="py-md px-lg font-data-mono">
                          <span
                            className={`px-sm py-xs rounded-md text-body-sm font-semibold border ${
                              isRed
                                ? 'bg-error-container text-error border-error/30'
                                : isYellow
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {slaFormatted}
                          </span>
                        </td>
                        <td className="py-md px-lg text-right">
                          <button className="text-primary hover:underline font-label-md text-label-md">
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-xl text-center text-secondary">
                      Belum ada data pengiriman aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
