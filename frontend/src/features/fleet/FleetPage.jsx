import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import FleetMap from '../../components/shared/FleetMap';

export default function FleetPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Add / Edit Vehicle Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_type: 'Box Truck',
  });

  // Filter & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(() => {
      fetchDrivers(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDrivers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.get('/drivers?per_page=100');
      setDrivers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/drivers', formData);
      setShowAddModal(false);
      setFormData({
        full_name: '',
        phone: '',
        vehicle_plate: '',
        vehicle_type: 'Box Truck',
      });
      triggerToast('Kendaraan dan Pengemudi baru berhasil ditambahkan.');
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan kendaraan/pengemudi');
    }
  };

  const handleEditOpen = (driver) => {
    setEditingDriver(driver);
    setFormData({
      full_name: driver.full_name || '',
      phone: driver.phone || '',
      vehicle_plate: driver.vehicle_plate || '',
      vehicle_type: driver.vehicle_type || 'Box Truck',
    });
    setShowEditModal(true);
    setActiveActionMenu(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDriver) return;
    try {
      await api.put(`/drivers/${editingDriver.id}`, formData);
      setShowEditModal(false);
      setEditingDriver(null);
      triggerToast(`Data driver ${formData.full_name} berhasil diperbarui.`);
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui data pengemudi');
    }
  };

  const handleDeleteDriver = async (driver) => {
    setActiveActionMenu(null);
    if (window.confirm(`Apakah Anda yakin ingin menghapus driver ${driver.full_name} (${driver.vehicle_plate || 'No Plate'})?`)) {
      try {
        await api.delete(`/drivers/${driver.id}`);
        triggerToast(`Driver ${driver.full_name} berhasil dihapus.`);
        fetchDrivers();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus driver.');
      }
    }
  };

  const triggerToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  // Status mapping for visual aesthetics
  const getStatusBadge = (driver) => {
    // Determine status based on driver data or availability
    let status = 'idle';
    if (!driver.is_active) {
      status = 'repair';
    } else if (!driver.is_available) {
      status = 'in_transit';
    }

    const config = {
      in_transit: {
        label: 'In Transit',
        bg: 'bg-green-100 text-green-800',
        dot: 'bg-green-500',
      },
      idle: {
        label: 'Idle',
        bg: 'bg-amber-100 text-amber-800',
        dot: 'bg-amber-500',
      },
      repair: {
        label: 'Repair',
        bg: 'bg-red-100 text-red-800',
        dot: 'bg-red-500',
      },
    };

    const c = config[status];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.dot}`}></span>
        {c.label}
      </span>
    );
  };

  // Mock fuel percentage based on plate hash or default
  const getFuelPercentage = (plate) => {
    if (!plate) return 50;
    let hash = 0;
    for (let i = 0; i < plate.length; i++) {
      hash = plate.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 90) + 10; // 10% - 100%
  };

  const getFuelColor = (pct) => {
    if (pct < 25) return 'bg-red-500';
    if (pct < 60) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Mock location based on name
  const getLastLocation = (driver) => {
    if (!driver.is_active) return 'Workshop Central';
    if (!driver.is_available) return 'Tol Cipularang KM 97';
    return 'Warehouse A - Marunda';
  };

  // Filtered list
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.vehicle_plate?.toLowerCase().includes(search.toLowerCase()) ||
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle_type?.toLowerCase().includes(search.toLowerCase());

    let status = 'idle';
    if (!d.is_active) status = 'repair';
    else if (!d.is_available) status = 'in_transit';

    const matchesStatus =
      statusFilter === 'Semua Status' ||
      (statusFilter === 'Dalam Perjalanan' && status === 'in_transit') ||
      (statusFilter === 'Idle' && status === 'idle') ||
      (statusFilter === 'Perbaikan' && status === 'repair');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-lg">
      {/* ─── Page Title & Action Panel ─── */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Manajemen Armada</h2>
          <p className="text-on-surface-variant">Pantau lokasi real-time dan status kesehatan operasional kendaraan Anda.</p>
        </div>
        <div className="flex space-x-md">
          <button 
            onClick={() => triggerToast('Laporan armada berhasil diunduh.')}
            className="bg-white border border-outline px-md py-2 flex items-center space-x-2 text-label-md hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Unduh Laporan</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-on-primary px-md py-2 flex items-center space-x-2 text-label-md shadow-sm hover:shadow-md transition-all rounded-lg"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Tambah Kendaraan</span>
          </button>
        </div>
      </div>

      {/* ─── Bento Stats Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-white p-lg border border-outline-variant hover:border-primary transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-start mb-sm">
            <span className="material-symbols-outlined text-primary text-[28px]">commute</span>
            <span className="text-on-surface-variant font-label-sm">+2 bln ini</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-md uppercase tracking-wider text-body-sm">Total Kendaraan</h3>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold">{loading ? '...' : drivers.length}</p>
          </div>
        </div>

        <div className="bg-white p-lg border border-outline-variant hover:border-primary transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-start mb-sm">
            <span className="material-symbols-outlined text-green-600 text-[28px]">route</span>
            <span className="text-green-600 font-label-sm">
              {loading ? '88%' : `${Math.round((drivers.filter(d => d.is_active && !d.is_available).length / (drivers.length || 1)) * 100)}%`} Aktif
            </span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-md uppercase tracking-wider text-body-sm">Aktif di Rute</h3>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold">
              {loading ? '...' : drivers.filter(d => d.is_active && !d.is_available).length}
            </p>
            <div className="w-full bg-surface-container h-1 mt-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-500" 
                style={{ width: `${(drivers.filter(d => d.is_active && !d.is_available).length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-lg border border-outline-variant hover:border-primary transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-start mb-sm">
            <span className="material-symbols-outlined text-error text-[28px]">build</span>
            <span className="text-error font-label-sm">Butuh Perhatian</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-md uppercase tracking-wider text-body-sm">Dalam Perbaikan</h3>
            <p className="font-headline-lg text-headline-lg text-error font-bold">
              {loading ? '...' : drivers.filter(d => !d.is_active).length}
            </p>
            <div className="w-full bg-surface-container h-1 mt-2 rounded-full overflow-hidden">
              <div 
                className="bg-error h-full transition-all duration-500" 
                style={{ width: `${(drivers.filter(d => !d.is_active).length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-lg border border-outline-variant hover:border-primary transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-start mb-sm">
            <span className="material-symbols-outlined text-secondary text-[28px]">event_available</span>
            <span className="text-on-surface-variant font-label-sm">Siap Jalan</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant font-label-md uppercase tracking-wider text-body-sm">Tersedia (Idle)</h3>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold">
              {loading ? '...' : drivers.filter(d => d.is_active && d.is_available).length}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Live Interactive Map ─── */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-xs w-full">
        <FleetMap height="450px" drivers={drivers} />
      </div>

      {/* ─── Vehicle Status Table ─── */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h3 className="font-headline-sm text-headline-sm text-primary">Status Detail Kendaraan</h3>
          <div className="flex space-x-md items-center">
            {/* Search input */}
            <input 
              type="text"
              placeholder="Search Plate/Driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-primary focus:border-primary"
            />
            {/* Status select filter */}
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-label-md border-outline-variant rounded-lg focus:ring-primary focus:border-primary h-9"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Dalam Perjalanan">Dalam Perjalanan</option>
              <option value="Idle">Idle</option>
              <option value="Perbaikan">Perbaikan</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider border-b border-outline-variant">
                <th className="px-lg py-md">Plat Nomor</th>
                <th className="px-lg py-md">Tipe Kendaraan</th>
                <th className="px-lg py-md">Pengemudi</th>
                <th className="px-lg py-md">Status</th>
                <th className="px-lg py-md text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-md text-body-md">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-xl text-center text-secondary">
                    <div className="flex justify-center items-center gap-sm">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>Memuat data armada...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => {
                  return (
                    <tr key={driver.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-lg py-md font-data-mono text-primary font-bold">
                        {driver.vehicle_plate || 'B 1234 XXX'}
                      </td>
                      <td className="px-lg py-md">
                        <div className="flex items-center space-x-2">
                          <span className="material-symbols-outlined text-[18px]">
                            {driver.vehicle_type?.toLowerCase().includes('van') ? 'airport_shuttle' : 'local_shipping'}
                          </span>
                          <span>{driver.vehicle_type || 'Box Truck'}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md font-semibold text-on-surface">
                        {driver.full_name || 'Budi Santoso'}
                      </td>
                      <td className="px-lg py-md">
                        {getStatusBadge(driver)}
                      </td>
                      <td className="px-lg py-md text-right relative">
                        <button 
                          onClick={() => setActiveActionMenu(activeActionMenu === driver.id ? null : driver.id)}
                          className="p-1 text-outline hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>

                        {/* Interactive Action Dropdown Popup */}
                        {activeActionMenu === driver.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveActionMenu(null)}></div>
                            <div className="absolute right-md mt-1 w-52 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                              <div className="p-xs space-y-0.5">
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    navigate(`/tracking?driver_id=${driver.id}`);
                                  }}
                                  className="w-full flex items-center gap-sm px-md py-sm text-body-sm font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-primary">location_searching</span>
                                  <span>Lacak Lokasi GPS</span>
                                </button>

                                <button
                                  onClick={() => handleEditOpen(driver)}
                                  className="w-full flex items-center gap-sm px-md py-sm text-body-sm font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-indigo-600">edit</span>
                                  <span>Edit Data Driver</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    navigate('/delivery-orders');
                                  }}
                                  className="w-full flex items-center gap-sm px-md py-sm text-body-sm font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-emerald-600">local_shipping</span>
                                  <span>Penugasan DO</span>
                                </button>

                                <div className="h-px bg-outline-variant my-xs"></div>

                                <button
                                  onClick={() => handleDeleteDriver(driver)}
                                  className="w-full flex items-center gap-sm px-md py-sm text-body-sm font-semibold text-error hover:bg-error-container/20 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                  <span>Hapus Driver</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-xl text-center text-secondary">
                    Tidak ada data kendaraan yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-md border-t border-outline-variant flex justify-between items-center bg-surface-container-low text-body-sm text-secondary">
          <p>Menampilkan {filteredDrivers.length} dari {drivers.length} kendaraan</p>
          <div className="flex space-x-xs">
            <button disabled className="px-3 py-1 border border-outline-variant bg-white disabled:opacity-50 text-body-sm">Prev</button>
            <button className="px-3 py-1 border border-primary bg-primary text-on-primary text-body-sm font-bold">1</button>
            <button className="px-3 py-1 border border-outline-variant bg-white text-body-sm">Next</button>
          </div>
        </div>
      </div>

      {/* ─── Add Driver / Vehicle Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Tambah Kendaraan & Driver</h3>
              <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Nama Lengkap Pengemudi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rudi Hermawan"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Nomor Telepon</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081299887766"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Nomor Plat Kendaraan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: B 1234 ABC"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary uppercase"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Tipe Kendaraan</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                >
                  <option value="Heavy Truck (10W)">Heavy Truck (10W)</option>
                  <option value="Box Truck">Box Truck</option>
                  <option value="Cargo Van">Cargo Van</option>
                  <option value="Pickup Truck">Pickup Truck</option>
                </select>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Simpan Kendaraan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Driver / Vehicle Modal ─── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Edit Data Kendaraan & Driver</h3>
              <button onClick={() => setShowEditModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Nama Lengkap Pengemudi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rudi Hermawan"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Nomor Telepon</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081299887766"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Nomor Plat Kendaraan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: B 1234 ABC"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary uppercase"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Tipe Kendaraan</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                >
                  <option value="Heavy Truck (10W)">Heavy Truck (10W)</option>
                  <option value="Box Truck">Box Truck</option>
                  <option value="Cargo Van">Cargo Van</option>
                  <option value="Pickup Truck">Pickup Truck</option>
                </select>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Notification Toast (Micro-interaction) ─── */}
      {showToast && (
        <div className="fixed bottom-lg right-lg transform transition-all duration-500 z-[100] animate-in slide-in-from-bottom duration-300">
          <div className="bg-inverse-surface text-inverse-on-surface px-lg py-md rounded shadow-xl flex items-center space-x-md">
            <span className="material-symbols-outlined text-green-400">check_circle</span>
            <p className="text-label-md text-white font-medium">{toastMessage}</p>
            <button className="ml-4 text-white/75 hover:text-white" onClick={() => setShowToast(false)}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
