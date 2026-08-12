import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function TimelinePage() {
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('');
  const [activeTab, setActiveTab] = useState('raci'); // 'raci' | 'stepper'

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects/timeline');
      setTimelineData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch timeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRaciBadge = (role) => {
    switch (role) {
      case 'A':
        return <span className="px-sm py-xs bg-blue-100 text-blue-800 font-bold rounded text-[11px] border border-blue-200">A (Accountable)</span>;
      case 'R':
        return <span className="px-sm py-xs bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] border border-emerald-200">R (Responsible)</span>;
      case 'C':
        return <span className="px-sm py-xs bg-amber-100 text-amber-800 font-bold rounded text-[11px] border border-amber-200">C (Consulted)</span>;
      case 'I':
        return <span className="px-sm py-xs bg-slate-100 text-slate-700 font-bold rounded text-[11px] border border-slate-200">I (Informed)</span>;
      case 'AR':
        return <span className="px-sm py-xs bg-purple-100 text-purple-800 font-bold rounded text-[11px] border border-purple-200">AR (Accountable & Responsible)</span>;
      default:
        return <span className="text-secondary">-</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-sm py-xs bg-emerald-500/10 text-emerald-700 font-bold rounded-lg text-label-sm border border-emerald-500/20 flex items-center gap-xs w-max"><span className="material-symbols-outlined text-[16px]">check_circle</span>Selesai</span>;
      case 'IN_PROGRESS':
        return <span className="px-sm py-xs bg-amber-500/10 text-amber-700 font-bold rounded-lg text-label-sm border border-amber-500/20 flex items-center gap-xs w-max"><span className="material-symbols-outlined text-[16px]">sync</span>Dalam Proses</span>;
      default:
        return <span className="px-sm py-xs bg-surface-container text-secondary font-bold rounded-lg text-label-sm border border-outline-variant flex items-center gap-xs w-max"><span className="material-symbols-outlined text-[16px]">schedule</span>Pending</span>;
    }
  };

  const filteredActivities = (timelineData?.activities || []).filter((act) => {
    if (!phaseFilter) return true;
    return act.phase === phaseFilter;
  });

  return (
    <div className="space-y-lg animate-in fade-in duration-200">
      {/* ─── Header Banner ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-sm">
            <h1 className="font-headline-md text-headline-md text-primary font-bold">
              Project Timeline & RACI Matrix
            </h1>
            <span className="px-sm py-0.5 bg-primary/10 text-primary text-label-sm font-bold rounded-full border border-primary/20">
              Ericsson ZTE Dismantle Proyek
            </span>
          </div>
          <p className="text-body-md text-secondary mt-xs">
            Standarisasi alur kerja 15 tahap antara PT Kubik Madani, PT AKS (Manpower/Lapangan), PT Artacomindo (WebApps System), dan Ericsson.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            onClick={fetchTimeline}
            className="px-md py-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md rounded-lg flex items-center gap-xs transition-all border border-outline-variant"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Refresh Progress</span>
          </button>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs space-y-xs">
          <span className="text-label-sm text-secondary font-label-sm uppercase tracking-wider">Total Aktivitas</span>
          <div className="flex justify-between items-end">
            <span className="font-headline-md text-headline-md text-primary font-bold">{timelineData?.total_activities || 15} Tahap</span>
            <span className="material-symbols-outlined text-primary text-3xl opacity-80">task_alt</span>
          </div>
          <p className="text-body-sm text-secondary">Terbagi dalam 4 fase utama</p>
        </div>

        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs space-y-xs">
          <span className="text-label-sm text-secondary font-label-sm uppercase tracking-wider">Progress Milestone</span>
          <div className="flex justify-between items-end">
            <span className="font-headline-md text-headline-md text-emerald-700 font-bold">{timelineData?.overall_progress || 65}%</span>
            <span className="material-symbols-outlined text-emerald-600 text-3xl opacity-80">analytics</span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${timelineData?.overall_progress || 65}%` }}></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs space-y-xs">
          <span className="text-label-sm text-secondary font-label-sm uppercase tracking-wider">Penyedia Logistik</span>
          <div className="flex justify-between items-end">
            <span className="font-headline-md text-headline-md text-indigo-700 font-bold">PT AKS</span>
            <span className="material-symbols-outlined text-indigo-600 text-3xl opacity-80">badge</span>
          </div>
          <p className="text-body-sm text-secondary">Accountable & Responsible Logistik</p>
        </div>

        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs space-y-xs">
          <span className="text-label-sm text-secondary font-label-sm uppercase tracking-wider">Penyedia Sistem</span>
          <div className="flex justify-between items-end">
            <span className="font-headline-md text-headline-md text-primary font-bold">PT Artacomindo</span>
            <span className="material-symbols-outlined text-primary text-3xl opacity-80">devices</span>
          </div>
          <p className="text-body-sm text-secondary">WebApps Central Operations</p>
        </div>
      </div>

      {/* ─── RACI Legend & View Toggle ─── */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div className="flex flex-wrap items-center gap-sm">
          <span className="font-label-sm text-label-sm text-secondary font-bold mr-xs">Keterangan RACI:</span>
          {getRaciBadge('A')}
          {getRaciBadge('R')}
          {getRaciBadge('C')}
          {getRaciBadge('I')}
          {getRaciBadge('AR')}
        </div>

        <div className="flex items-center gap-xs bg-surface-container p-xs rounded-lg">
          <button
            onClick={() => setActiveTab('raci')}
            className={`px-md py-xs rounded-md font-label-md text-label-md transition-all flex items-center gap-xs ${
              activeTab === 'raci' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_on</span>
            <span>Matriks RACI</span>
          </button>
          <button
            onClick={() => setActiveTab('stepper')}
            className={`px-md py-xs rounded-md font-label-md text-label-md transition-all flex items-center gap-xs ${
              activeTab === 'stepper' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            <span>Timeline Stepper</span>
          </button>
        </div>
      </div>

      {/* ─── Phase Filters ─── */}
      <div className="flex items-center gap-xs overflow-x-auto pb-xs">
        <button
          onClick={() => setPhaseFilter('')}
          className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
            phaseFilter === '' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-secondary'
          }`}
        >
          Semua Fase (15 Tahap)
        </button>
        <button
          onClick={() => setPhaseFilter('Persiapan & Alignment')}
          className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
            phaseFilter === 'Persiapan & Alignment' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-secondary'
          }`}
        >
          Fase 1: Persiapan & Alignment
        </button>
        <button
          onClick={() => setPhaseFilter('Outbound Logistics')}
          className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
            phaseFilter === 'Outbound Logistics' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-secondary'
          }`}
        >
          Fase 2: Outbound Logistics
        </button>
        <button
          onClick={() => setPhaseFilter('Site Execution')}
          className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
            phaseFilter === 'Site Execution' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-secondary'
          }`}
        >
          Fase 3: Site Execution & Dismantle
        </button>
        <button
          onClick={() => setPhaseFilter('Reverse Logistics')}
          className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
            phaseFilter === 'Reverse Logistics' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-secondary'
          }`}
        >
          Fase 4: Reverse Logistics & Return
        </button>
        <button
          onClick={() => setPhaseFilter('Handover & Closing')}
          className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
            phaseFilter === 'Handover & Closing' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-secondary'
          }`}
        >
          Fase 5: Handover & Closing
        </button>
      </div>

      {/* ─── RACI Matrix Table View ─── */}
      {activeTab === 'raci' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider border-b border-outline-variant">
                  <th className="px-lg py-md w-12 text-center">No</th>
                  <th className="px-lg py-md">Aktivitas Proyek</th>
                  <th className="px-lg py-md">Fase</th>
                  <th className="px-md py-md text-center bg-blue-50/50">PT Kubik Madani (Man Power)</th>
                  <th className="px-md py-md text-center bg-purple-50/50">PT AKS</th>
                  <th className="px-md py-md text-center bg-indigo-50/50">PT Artacomindo (WebApps)</th>
                  <th className="px-md py-md text-center bg-slate-50/50">Ericsson</th>
                  <th className="px-lg py-md">Deliverable Output</th>
                  <th className="px-lg py-md text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-xl text-center text-secondary">
                      <div className="flex items-center justify-center gap-sm">
                        <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                        <span>Memuat data RACI Timeline...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredActivities.length > 0 ? (
                  filteredActivities.map((act) => (
                    <tr key={act.no} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-lg py-md text-center font-data-mono font-bold text-secondary">{act.no}</td>
                      <td className="px-lg py-md font-semibold text-on-surface">{act.activity}</td>
                      <td className="px-lg py-md">
                        <span className="px-sm py-0.5 bg-surface-container text-secondary font-label-sm rounded text-[11px] font-semibold">
                          {act.phase}
                        </span>
                      </td>
                      <td className="px-md py-md text-center bg-blue-50/30">{getRaciBadge(act.kubik_madani)}</td>
                      <td className="px-md py-md text-center bg-purple-50/30">{getRaciBadge(act.aks)}</td>
                      <td className="px-md py-md text-center bg-indigo-50/30">{getRaciBadge(act.artacomindo)}</td>
                      <td className="px-md py-md text-center bg-slate-50/30">{getRaciBadge(act.ericsson)}</td>
                      <td className="px-lg py-md font-data-mono text-primary font-bold text-body-sm">{act.deliverable}</td>
                      <td className="px-lg py-md text-center">{getStatusBadge(act.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-xl text-center text-secondary">
                      Tidak ada aktivitas untuk fase ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Timeline Stepper View ─── */}
      {activeTab === 'stepper' && (
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-xs space-y-lg">
          <h3 className="font-headline-sm text-headline-sm text-primary font-bold mb-md">Alur 15 Tahap Operasional Proyek</h3>
          <div className="relative pl-6 space-y-lg border-l-2 border-primary/20">
            {filteredActivities.map((act, index) => (
              <div key={act.no} className="relative group">
                {/* Step Node Circle */}
                <div className={`absolute -left-[31px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                  act.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : act.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-surface-container text-secondary border border-outline-variant'
                }`}>
                  {act.status === 'COMPLETED' ? <span className="material-symbols-outlined text-[16px]">check</span> : act.no}
                </div>

                {/* Step Content */}
                <div className="bg-surface-container-low/40 p-md rounded-xl border border-outline-variant hover:bg-surface-container-low transition-all space-y-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-xs">
                    <div className="flex items-center gap-sm">
                      <span className="font-data-mono font-bold text-primary text-body-lg">Tahap {act.no}: {act.activity}</span>
                      <span className="px-sm py-0.5 bg-surface-container text-secondary text-[11px] font-semibold rounded">
                        {act.phase}
                      </span>
                    </div>
                    {getStatusBadge(act.status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm text-body-sm pt-xs border-t border-outline-variant/60">
                    <div>
                      <span className="text-secondary block font-label-sm uppercase text-[10px]">Deliverable Output</span>
                      <span className="font-bold text-primary">{act.deliverable}</span>
                    </div>
                    <div>
                      <span className="text-secondary block font-label-sm uppercase text-[10px]">Manpower Lapangan</span>
                      <span>PT AKS: <strong>{act.aks}</strong></span>
                    </div>
                    <div>
                      <span className="text-secondary block font-label-sm uppercase text-[10px]">Sistem WebApps</span>
                      <span>Artacomindo: <strong>{act.artacomindo}</strong></span>
                    </div>
                    <div>
                      <span className="text-secondary block font-label-sm uppercase text-[10px]">Target Progress</span>
                      <div className="flex items-center gap-xs">
                        <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${act.progress_pct}%` }}></div>
                        </div>
                        <span className="font-data-mono font-bold text-[11px] text-secondary">{act.progress_pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
