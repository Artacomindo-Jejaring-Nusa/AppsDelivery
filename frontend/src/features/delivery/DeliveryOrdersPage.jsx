import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [slaFilter, setSlaFilter] = useState('');

  // New DO Form State
  const [formData, setFormData] = useState({
    do_number: '',
    description: '',
    sla_days: 3,
    origin_address: 'Gudang PT. Eriksin Banjarmasin',
    destination_address: 'Site BTS Telkomsel Kalimantan',
    notes: '',
  });

  useEffect(() => {
    fetchOrders();
  }, [slaFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/delivery-orders?per_page=50';
      if (slaFilter) {
        url += `&sla_status=${slaFilter}`;
      }
      const res = await api.get(url);
      setOrders(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch delivery orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/delivery-orders', {
        ...formData,
        sla_days: parseInt(formData.sla_days),
      });
      setShowCreateModal(false);
      setFormData({
        do_number: '',
        description: '',
        sla_days: 3,
        origin_address: 'Gudang PT. Eriksin Banjarmasin',
        destination_address: 'Site BTS Telkomsel Kalimantan',
        notes: '',
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create Delivery Order');
    }
  };

  const filteredOrders = orders.filter((doItem) =>
    doItem.do_number.toLowerCase().includes(search.toLowerCase()) ||
    doItem.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-xl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Delivery Orders (Outbound Logistik)
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-xs">
            Manajemen Surat Jalan, Pengelompokan Material & Target SLA Harian
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Buat DO Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row gap-md justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari No. DO atau Deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-surface px-md pl-10 border border-outline-variant focus:border-primary outline-none font-body-md rounded-lg text-body-md"
          />
          <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
        </div>

        {/* SLA Status Filter Buttons */}
        <div className="flex items-center gap-xs overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setSlaFilter('')}
            className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
              slaFilter === ''
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container hover:bg-surface-container-high text-secondary'
            }`}
          >
            Semua Status SLA
          </button>
          <button
            onClick={() => setSlaFilter('green')}
            className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
              slaFilter === 'green'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            🟢 SLA Aman
          </button>
          <button
            onClick={() => setSlaFilter('yellow')}
            className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
              slaFilter === 'yellow'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            🟡 SLA Warning
          </button>
          <button
            onClick={() => setSlaFilter('red')}
            className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
              slaFilter === 'red'
                ? 'bg-error text-white'
                : 'bg-error-container text-error hover:bg-error-container/80'
            }`}
          >
            🔴 SLA Overdue
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-xl text-center text-secondary flex justify-center items-center gap-sm">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span>Memuat data Surat Jalan DO...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-secondary uppercase">
                  <th className="py-md px-lg">No. DO</th>
                  <th className="py-md px-lg">Site BTS</th>
                  <th className="py-md px-lg">Deskripsi Material</th>
                  <th className="py-md px-lg">Target SLA (Hari)</th>
                  <th className="py-md px-lg">Sisa Waktu SLA</th>
                  <th className="py-md px-lg">Status</th>
                  <th className="py-md px-lg">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-body-md">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((item) => {
                    const isRed = item.sla_status === 'red' || item.sla_detail?.is_overdue;
                    const isYellow = item.sla_status === 'yellow';

                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-md px-lg font-data-mono font-bold text-primary">
                          {item.do_number}
                        </td>
                        <td className="py-md px-lg">
                          <span className="font-semibold text-on-surface">
                            {item.bts_site?.site_id || 'BTS-KAL-001'}
                          </span>
                          <p className="font-body-sm text-body-sm text-secondary">
                            {item.bts_site?.site_name || 'Site Kalimantan'}
                          </p>
                        </td>
                        <td className="py-md px-lg text-secondary max-w-xs truncate">
                          {item.description}
                        </td>
                        <td className="py-md px-lg font-data-mono font-medium">
                          <span className="bg-surface-container px-sm py-xs rounded-md border border-outline-variant">
                            {item.sla_days || 3} Hari ({item.sla_hours || 72} Jam)
                          </span>
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
                            {item.sla_detail?.remaining_formatted || `${item.sla_days} Hari`}
                          </span>
                        </td>
                        <td className="py-md px-lg">
                          <span className="capitalize px-sm py-xs rounded-full text-body-sm font-medium bg-surface-container border border-outline-variant">
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-md px-lg text-secondary text-body-sm max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-xl text-center text-secondary">
                      Tidak ada data Surat Jalan DO ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create DO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Buat Delivery Order Baru</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">No. Surat Jalan (DO Number)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DO-2026-07-999"
                  value={formData.do_number}
                  onChange={(e) => setFormData({ ...formData, do_number: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Deskripsi Material</label>
                <textarea
                  placeholder="Material Migrasi BTS & Unit Replacement..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-md bg-surface border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary h-20"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Target SLA Pengiriman (Hari)</label>
                <select
                  value={formData.sla_days}
                  onChange={(e) => setFormData({ ...formData, sla_days: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                >
                  <option value={1}>1 Hari (Express / Priority - 24 Jam)</option>
                  <option value={2}>2 Hari (Standard - 48 Jam)</option>
                  <option value={3}>3 Hari (Regular - 72 Jam)</option>
                  <option value={4}>4 Hari (Remote Area - 96 Jam)</option>
                  <option value={5}>5 Hari (Kalimantan Interior - 120 Jam)</option>
                </select>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Catatan khusus lokasi atau penangan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Simpan DO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
