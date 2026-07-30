import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import TrackingMap from '../../components/shared/TrackingMap';
import zteBtsSites from '../../data/zte_bts_sites.json';

export default function BtsSitePage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [importCsvText, setImportCsvText] = useState('');
  const [importProgress, setImportProgress] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [clusterFilter, setClusterFilter] = useState('All Clusters');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Add Site Form State
  const [addForm, setAddForm] = useState({
    site_id: '',
    site_name: '',
    address: '',
    province: 'Kalimantan Timur',
    city: 'Balikpapan',
    district: '',
    latitude: '',
    longitude: '',
  });

  // Edit Site Form State
  const [editForm, setEditForm] = useState({
    site_name: '',
    address: '',
    province: '',
    city: '',
    district: '',
    latitude: '',
    longitude: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bts-sites?per_page=100');
      const data = res.data.data;
      if (data && data.length > 0) {
        setSites(data);
      } else {
        const mapped = zteBtsSites.map(s => ({
          ...s,
          latitude: s.lat ?? null,
          longitude: s.lng ?? null
        }));
        setSites(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch BTS sites from API, using ZTE KML dataset:', err);
      const mapped = zteBtsSites.map(s => ({
        ...s,
        latitude: s.lat ?? null,
        longitude: s.lng ?? null
      }));
      setSites(mapped);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...addForm,
        latitude: addForm.latitude ? parseFloat(addForm.latitude) : null,
        longitude: addForm.longitude ? parseFloat(addForm.longitude) : null,
      };
      await api.post('/bts-sites', payload);
      setShowAddModal(false);
      setAddForm({
        site_id: '',
        site_name: '',
        address: '',
        province: 'Kalimantan Timur',
        city: 'Balikpapan',
        district: '',
        latitude: '',
        longitude: '',
      });
      fetchSites();
      alert('BTS Site baru berhasil disimpan.');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan BTS Site baru');
    }
  };

  const handleEditClick = (site) => {
    setSelectedSite(site);
    setEditForm({
      site_name: site.site_name || '',
      address: site.address || '',
      province: site.province || '',
      city: site.city || '',
      district: site.district || '',
      latitude: site.latitude !== null ? site.latitude.toString() : '',
      longitude: site.longitude !== null ? site.longitude.toString() : '',
      is_active: site.is_active,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editForm,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
      };
      await api.put(`/bts-sites/${selectedSite.id}`, payload);
      setShowEditModal(false);
      fetchSites();
      alert('BTS Site berhasil diperbarui.');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui BTS Site');
    }
  };

  const handleDeleteClick = async (site) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus BTS Site ${site.site_name} (${site.site_id})?`)) {
      try {
        await api.delete(`/bts-sites/${site.id}`);
        fetchSites();
        alert('BTS Site berhasil dihapus.');
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus BTS Site');
      }
    }
  };

  const handleDownloadTemplate = () => {
    const csvHeader = 'site_id,site_name,address,province,city,district,latitude,longitude\n';
    const sampleRows = [
      'BTS-KAL-101,Site Telkomsel Balikpapan Selatan,Jl. Jendral Sudirman No. 45,Kalimantan Timur,Balikpapan,Balikpapan Selatan,-1.2345,116.8901',
      'BTS-KAL-102,Site Telkomsel Banjarmasin Hub,Jl. A. Yani Km 6,Kalimantan Selatan,Banjarmasin,Banjarmasin Timur,-3.3194,114.5908',
      'BTS-KAL-103,Site Telkomsel Samarinda Seberang,Jl. Cipto Mangunkusumo No. 12,Kalimantan Timur,Samarinda,Samarinda Seberang,-0.5021,117.1536'
    ].join('\n');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_BTS_Sites.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportCsvText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!importCsvText.trim()) {
      alert('Silakan upload file CSV atau tempel teks data CSV terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    setImportProgress('Membaca baris data...');

    const lines = importCsvText.trim().split('\n');
    if (lines.length <= 1) {
      alert('Teks CSV tidak berisi baris data.');
      setIsImporting(false);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });

      if (!rowObj.site_id || !rowObj.site_name) {
        failCount++;
        continue;
      }

      setImportProgress(`Mengimpor baris ${i}/${lines.length - 1}: ${rowObj.site_id}...`);

      try {
        await api.post('/bts-sites', {
          site_id: rowObj.site_id,
          site_name: rowObj.site_name,
          address: rowObj.address || '',
          province: rowObj.province || 'Kalimantan Timur',
          city: rowObj.city || 'Balikpapan',
          district: rowObj.district || '',
          latitude: rowObj.latitude ? parseFloat(rowObj.latitude) : null,
          longitude: rowObj.longitude ? parseFloat(rowObj.longitude) : null,
        });
        successCount++;
      } catch (err) {
        console.warn(`Gagal mengimpor site ${rowObj.site_id}:`, err);
        failCount++;
      }
    }

    setIsImporting(false);
    setShowImportModal(false);
    setImportCsvText('');
    setImportProgress('');
    alert(`Bulk Import Selesai!\nBerhasil: ${successCount} sites\nGagal: ${failCount} sites`);
    fetchSites();
  };

  // Filtering Logic
  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.site_id?.toLowerCase().includes(search.toLowerCase()) ||
      site.site_name?.toLowerCase().includes(search.toLowerCase()) ||
      site.city?.toLowerCase().includes(search.toLowerCase());

    const matchesCluster =
      clusterFilter === 'All Clusters' ||
      site.city?.toLowerCase() === clusterFilter.toLowerCase() ||
      site.province?.toLowerCase() === clusterFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'All Statuses' ||
      (statusFilter === 'Active' && site.is_active) ||
      (statusFilter === 'Down' && !site.is_active) ||
      (statusFilter === 'Maintenance' && !site.is_active);

    return matchesSearch && matchesCluster && matchesStatus;
  });

  // Calculate KPIs
  const totalCount = sites.length;
  const activeCount = sites.filter((s) => s.is_active).length;
  const maintenanceCount = sites.filter((s) => !s.is_active).length;

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      {/* ─── Header & KPI Cards Section ─── */}
      <section className="mb-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">BTS Sites Inventory</h1>
            <p className="text-body-md text-secondary mt-xs">Real-time status and operational metrics across national clusters.</p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-xs bg-surface-container-high text-on-surface px-md py-sm rounded-lg font-semibold border border-outline-variant hover:bg-surface-container transition-all text-label-md"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh Template CSV</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-xs bg-secondary text-on-secondary px-md py-sm rounded-lg font-semibold hover:opacity-90 transition-all text-label-md shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Import Bulk CSV / Excel</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-xs bg-primary text-on-primary px-md py-sm rounded-lg font-semibold hover:shadow-lg transition-all text-label-md shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add New Site</span>
            </button>
          </div>
        </div>

        {/* KPI Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm">
            <p className="text-label-sm text-secondary mb-xs uppercase font-bold tracking-tighter">Total Sites</p>
            <div className="flex items-end justify-between">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{totalCount}</span>
              <div className="text-primary flex items-center">
                <span className="material-symbols-outlined text-[24px]">cell_tower</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm border-l-4 border-l-primary">
            <p className="text-label-sm text-secondary mb-xs uppercase font-bold tracking-tighter">Active Sites</p>
            <div className="flex items-end justify-between">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{activeCount}</span>
              <span className="text-xs bg-green-100 text-green-700 px-sm py-[2px] rounded-full font-bold">
                {totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : 100}%
              </span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm border-l-4 border-l-error">
            <p className="text-label-sm text-secondary mb-xs uppercase font-bold tracking-tighter">Maintenance Required</p>
            <div className="flex items-end justify-between">
              <span className="font-headline-lg text-headline-lg text-error font-bold">{maintenanceCount}</span>
              <span className="text-xs bg-error-container text-on-error-container px-sm py-[2px] rounded-full font-bold">Critical</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl shadow-sm border-l-4 border-l-secondary">
            <p className="text-label-sm text-secondary mb-xs uppercase font-bold tracking-tighter">New Clusters</p>
            <div className="flex items-end justify-between">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">12</span>
              <span className="text-xs bg-secondary-container text-on-secondary-container px-sm py-[2px] rounded-full font-bold">Q4 Growth</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Filter Bar ─── */}
      <section className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-wrap items-center gap-lg">
        <div className="flex-1 min-w-[300px]">
          <label className="block font-label-sm text-label-sm text-secondary mb-xs">Search Site</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-md">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Site ID, Name or Coordinates..."
              className="w-full pl-xl pr-md py-sm bg-surface text-body-md border border-outline-variant rounded focus:border-primary focus:ring-0 transition-all outline-none"
            />
          </div>
        </div>
        <div className="w-48">
          <label className="block font-label-sm text-label-sm text-secondary mb-xs">Cluster</label>
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="w-full py-sm px-md bg-surface border border-outline-variant rounded text-body-md focus:border-primary focus:ring-0 outline-none"
          >
            <option value="All Clusters">All Clusters</option>
            <option value="Balikpapan">Balikpapan</option>
            <option value="Banjarmasin">Banjarmasin</option>
            <option value="Samarinda">Samarinda</option>
            <option value="Pontianak">Pontianak</option>
            <option value="Palangkaraya">Palangkaraya</option>
            <option value="Tarakan">Tarakan</option>
          </select>
        </div>
        <div className="w-48">
          <label className="block font-label-sm text-label-sm text-secondary mb-xs">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-sm px-md bg-surface border border-outline-variant rounded text-body-md focus:border-primary focus:ring-0 outline-none"
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Down">Down / Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </section>

      {/* ─── Main Data Table ─── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-secondary uppercase tracking-tighter">
                <th className="p-md">Site ID</th>
                <th className="p-md">Site Name</th>
                <th className="p-md">Coordinates</th>
                <th className="p-md">City Cluster</th>
                <th className="p-md">Status</th>
                <th className="p-md">Address Details</th>
                <th className="p-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-md text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-xl text-center text-secondary">
                    <div className="flex justify-center items-center gap-sm">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>Memuat data BTS Sites...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSites.length > 0 ? (
                filteredSites.map((site) => (
                  <tr key={site.id} className="table-row-hover transition-colors">
                    <td className="p-md font-data-mono text-data-mono font-bold text-primary">{site.site_id}</td>
                    <td className="p-md font-semibold">{site.site_name}</td>
                    <td className="p-md font-data-mono text-body-sm text-secondary">
                      {site.latitude !== null && site.latitude !== undefined ? Number(site.latitude).toFixed(4) : '-'} / {site.longitude !== null && site.longitude !== undefined ? Number(site.longitude).toFixed(4) : '-'}
                    </td>
                    <td className="p-md">{site.city || '-'}</td>
                    <td className="p-md">
                      <span className={`inline-flex items-center gap-xs px-sm py-[2px] rounded-full border text-[11px] font-bold ${
                        site.is_active 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-error-container text-error border-error/20'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${site.is_active ? 'bg-green-600 animate-pulse' : 'bg-error'}`}></span>
                        {site.is_active ? 'ACTIVE' : 'DOWN'}
                      </span>
                    </td>
                    <td className="p-md text-on-surface-variant max-w-[200px] truncate">{site.address || '-'}</td>
                    <td className="p-md text-right">
                      <button 
                        onClick={() => handleEditClick(site)}
                        className="p-xs hover:bg-primary-container hover:text-primary rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-md">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(site)}
                        className="p-xs hover:bg-error-container hover:text-error rounded-md transition-colors ml-xs"
                      >
                        <span className="material-symbols-outlined text-md">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-xl text-center text-secondary">
                    Tidak ada BTS Sites ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-surface-container-low px-md py-sm border-t border-outline-variant flex items-center justify-between">
          <p className="font-label-md text-label-md text-secondary">Showing {filteredSites.length} of {sites.length} entries</p>
          <div className="flex items-center gap-xs">
            <button className="p-sm rounded border border-outline-variant hover:bg-surface-container-highest transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm leading-none">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-bold text-sm">1</button>
            <button className="p-sm rounded border border-outline-variant hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-sm leading-none">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Mini Map Overlay / Visual Asset Section ─── */}
      <section className="mt-lg grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 relative h-[300px] rounded-xl border border-outline-variant overflow-hidden group">
          <TrackingMap />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-md z-10 pointer-events-none">
            <h3 className="text-white font-headline-sm text-headline-sm font-bold">Kalimantan BTS Site Grid</h3>
            <p className="text-white/80 text-body-sm">Real-time coordinates and regional network mapping.</p>
          </div>
        </div>
        <div className="bg-primary-container/10 border border-primary/20 rounded-xl p-lg flex flex-col gap-md">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-sm font-bold">
            <span className="material-symbols-outlined">report</span>
            <span>SLA Overview</span>
          </h3>
          <div className="space-y-md">
            <div>
              <div className="flex justify-between mb-xs">
                <span className="text-label-md font-label-md">Uptime Efficiency</span>
                <span className="text-label-md font-label-md">98.2%</span>
              </div>
              <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '98.2%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-xs">
                <span className="text-label-md font-label-md">Response Time</span>
                <span className="text-label-md font-label-md">1.2s</span>
              </div>
              <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-xs">
                <span className="text-label-md font-label-md">Hardware Health</span>
                <span className="text-label-md font-label-md">Good</span>
              </div>
              <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '89%' }}></div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => alert('Fitur unduh laporan audit SLA.')}
            className="mt-auto w-full py-sm border border-primary text-primary font-bold text-label-md rounded-lg hover:bg-primary hover:text-on-primary transition-all active:scale-[0.98]"
          >
            Download Full Audit Report
          </button>
        </div>
      </section>

      {/* ─── Add Site Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Register New BTS Site</h3>
              <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Site ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BTS-JKT-001"
                    value={addForm.site_id}
                    onChange={(e) => setAddForm({ ...addForm, site_id: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Site Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Senayan Gateway"
                    value={addForm.site_name}
                    onChange={(e) => setAddForm({ ...addForm, site_name: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Address Details</label>
                <textarea
                  placeholder="Detail jalan, gedung, etc."
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full h-16 bg-surface p-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-sm">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Province</label>
                  <input
                    type="text"
                    placeholder="Kalimantan Timur"
                    value={addForm.province}
                    onChange={(e) => setAddForm({ ...addForm, province: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">City / Cluster</label>
                  <input
                    type="text"
                    placeholder="Balikpapan"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">District</label>
                  <input
                    type="text"
                    placeholder="Kecamatan"
                    value={addForm.district}
                    onChange={(e) => setAddForm({ ...addForm, district: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Latitude</label>
                  <input
                    type="text"
                    required
                    placeholder="-1.2654"
                    value={addForm.latitude}
                    onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Longitude</label>
                  <input
                    type="text"
                    required
                    placeholder="116.8312"
                    value={addForm.longitude}
                    onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Save BTS Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Site Modal ─── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface border-none p-0">Edit BTS Site Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Site Name</label>
                <input
                  type="text"
                  required
                  value={editForm.site_name}
                  onChange={(e) => setEditForm({ ...editForm, site_name: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Address Details</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full h-16 bg-surface p-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-sm">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Province</label>
                  <input
                    type="text"
                    value={editForm.province}
                    onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">District</label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Latitude</label>
                  <input
                    type="text"
                    required
                    value={editForm.latitude}
                    onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Longitude</label>
                  <input
                    type="text"
                    required
                    value={editForm.longitude}
                    onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary border-outline-variant rounded focus:ring-primary"
                />
                <label htmlFor="edit-is-active" className="font-label-md text-label-md text-on-surface cursor-pointer">
                  BTS Site is active & operational
                </label>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Update Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Bulk Import Modal ─── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-xl w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Bulk Import BTS Sites</h3>
                <p className="text-body-sm text-secondary">Unggah file CSV/Excel atau tempel teks data CSV untuk menambahkan ribuan site sekaligus.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-md">
              <div className="p-md bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="text-body-sm text-blue-900 font-medium">
                  Belum punya format file import? Unduh template resmi Excel/CSV.
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-sm py-xs bg-blue-700 text-white text-xs font-bold rounded hover:bg-blue-800 shrink-0 ml-md"
                >
                  Unduh Template
                </button>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Option A: Upload File (.csv)</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-body-sm text-secondary file:mr-md file:py-xs file:px-md file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:opacity-90 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Option B: Tempel Teks CSV</label>
                <textarea
                  rows={6}
                  placeholder={`site_id,site_name,address,province,city,district,latitude,longitude\nBTS-KAL-101,Site Telkomsel Balikpapan Selatan,Jl. Sudirman,Kalimantan Timur,Balikpapan,Balikpapan Selatan,-1.2345,116.8901`}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  className="w-full p-md bg-surface border border-outline-variant rounded-lg font-data-mono text-xs outline-none focus:border-primary"
                />
              </div>

              {importProgress && (
                <div className="p-sm bg-emerald-50 text-emerald-800 text-xs font-bold rounded border border-emerald-200 flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>{importProgress}</span>
                </div>
              )}

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setShowImportModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleProcessImport}
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  <span>{isImporting ? 'Mengimpor...' : 'Proses Import Bulk'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
