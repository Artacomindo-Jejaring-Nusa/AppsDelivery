import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import TrackingMap from '../../components/shared/TrackingMap';

export default function PublicTrackingPage() {
  const { trackingNumber: pathTrackingNumber } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialSearchNum = pathTrackingNumber || searchParams.get('number') || '';

  const [inputNumber, setInputNumber] = useState(initialSearchNum);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(Boolean(initialSearchNum));

  useEffect(() => {
    const queryNum = pathTrackingNumber || searchParams.get('number') || '';
    if (queryNum) {
      setInputNumber(queryNum);
      setSearched(true);
      fetchTrackingInfo(queryNum);
    }
  }, [pathTrackingNumber]);

  const fetchTrackingInfo = async (numToSearch) => {
    if (!numToSearch || !numToSearch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/track/${encodeURIComponent(numToSearch.trim())}`);
      setTrackingData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch tracking:', err);
      setTrackingData(null);
      setError(err.response?.data?.message || 'Nomor pengiriman yang Anda masukkan tidak valid atau belum terdaftar dalam sistem kami.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputNumber.trim()) {
      setSearched(true);
      navigate(`/track/${encodeURIComponent(inputNumber.trim())}`);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="px-md py-xs bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-label-md flex items-center gap-xs">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          DELIVERED / COMPLETED
        </span>
      );
    }
    if (s === 'in_transit') {
      return (
        <span className="px-md py-xs bg-blue-100 text-blue-800 border border-blue-300 rounded font-bold text-label-md flex items-center gap-xs animate-pulse">
          <span className="material-symbols-outlined text-[16px]">local_shipping</span>
          IN TRANSIT
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="px-md py-xs bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-label-md flex items-center gap-xs">
          <span className="material-symbols-outlined text-[16px]">assignment_ind</span>
          ASSIGNED TO DRIVER
        </span>
      );
    }
    return (
      <span className="px-md py-xs bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-label-md flex items-center gap-xs">
        <span className="material-symbols-outlined text-[16px]">schedule</span>
        DRAFT / PENDING
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-body-md bg-[#f7f9fb] text-[#191c1e] overflow-x-hidden">
      {/* Custom Styles Inline for Neo-brutalist & Material Feel */}
      <style>{`
        .neo-brutalist-input {
          box-shadow: 4px 4px 0px 0px #00236f;
        }
        .neo-brutalist-card {
          border: 1px solid #e2e8f0;
          box-shadow: 2px 2px 0px 0px #e2e8f0;
        }
      `}</style>

      {/* ─── 1. Fixed Top Bar ─── */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#f7f9fb] border-b border-[#c5c5d3]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl md:text-2xl text-[#00236f] tracking-tight">
            ARTACOMINDO X AKS
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1 text-sm font-semibold text-[#00236f] hover:underline"
          >
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>Admin Login</span>
          </button>
          <span className="material-symbols-outlined text-[#505f76] cursor-pointer hover:bg-[#e6e8ea] p-1 rounded">
            help_outline
          </span>
          <span className="material-symbols-outlined text-[#505f76] cursor-pointer hover:bg-[#e6e8ea] p-1 rounded">
            language
          </span>
        </div>
      </header>

      {/* ─── 2. Main Content ─── */}
      <main className="flex-grow pt-28 pb-12 px-6 flex flex-col items-center">
        {/* Hero & Search Section */}
        <section className="w-full max-w-2xl text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#00236f] mb-2">
            Lacak Pengiriman
          </h1>
          <p className="text-base text-[#505f76] mb-8">
            Masukkan nomor Surat Jalan (DO) atau Manifest untuk memantau status kiriman Anda secara real-time.
          </p>

          {/* Search Container */}
          <div className="relative w-full">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2 w-full">
              <div className="relative flex-grow">
                <label
                  htmlFor="tracking_id"
                  className="absolute -top-3 left-3 bg-[#f7f9fb] px-1 text-xs font-medium text-[#505f76] z-10"
                >
                  Nomor Surat Jalan / Manifest / Barcode
                </label>
                <input
                  id="tracking_id"
                  type="text"
                  required
                  placeholder="Contoh: DO-2026-07-002 atau INB-DO-..."
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  className="w-full h-14 px-4 border-2 border-[#00236f] bg-white font-mono text-sm focus:ring-0 focus:border-[#00236f] outline-none neo-brutalist-input transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-14 px-8 bg-[#00236f] text-white font-semibold text-sm hover:bg-[#1e3a8a] active:opacity-80 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">search</span>
                )}
                <span>{loading ? 'Memproses...' : 'Lacak'}</span>
              </button>
            </form>
          </div>
        </section>

        {/* Dynamic Results & State Area */}
        <section className="w-full max-w-4xl space-y-6">
          {/* Initial Empty State (before user searches) */}
          {!searched && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
              <div className="neo-brutalist-card bg-white p-6 rounded border border-[#e2e8f0] flex flex-col gap-2">
                <span className="material-symbols-outlined text-[#00236f] text-3xl">local_shipping</span>
                <h4 className="font-semibold text-xs text-[#505f76] uppercase tracking-wider">Cakupan Wilayah</h4>
                <p className="text-xs text-[#191c1e]">
                  Kami melayani pengiriman logistik & material dismantle BTS ke seluruh jaringan Kalimantan dan Nusantara dengan jaminan SLA terbaik.
                </p>
              </div>
              <div className="neo-brutalist-card bg-white p-6 rounded border border-[#e2e8f0] flex flex-col gap-2">
                <span className="material-symbols-outlined text-[#00236f] text-3xl">verified_user</span>
                <h4 className="font-semibold text-xs text-[#505f76] uppercase tracking-wider">Keamanan Terjamin</h4>
                <p className="text-xs text-[#191c1e]">
                  Setiap armada dilapisi verifikasi pemindaian Barcode & GPS Tracking 24/7 untuk keamanan muatan Ericsson BTS Anda.
                </p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="neo-brutalist-card bg-white p-12 rounded border border-[#e2e8f0] text-center space-y-3">
              <span className="material-symbols-outlined text-[#00236f] text-4xl animate-spin">sync</span>
              <p className="font-semibold text-base text-[#505f76]">Memproses pencarian status pengiriman...</p>
            </div>
          )}

          {/* Error State Alert */}
          {error && !loading && (
            <div className="bg-[#ffdad6] border-2 border-[#ba1a1a] p-6 rounded flex flex-col md:flex-row items-center md:items-start gap-4 animate-in fade-in duration-300">
              <div className="bg-[#ba1a1a] rounded-full p-2 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">warning</span>
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="font-bold text-lg text-[#93000a] mb-1">Pengiriman Tidak Ditemukan</h3>
                <p className="text-sm text-[#93000a] opacity-90 mb-4">
                  {error} Pastikan format penulisan sudah benar (contoh: DO-2026-07-002) atau hubungi tim logistik untuk bantuan lebih lanjut.
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#93000a] text-white px-4 py-2 text-xs font-semibold rounded hover:opacity-90"
                  >
                    Hubungi Support
                  </a>
                  <button
                    onClick={() => setError(null)}
                    className="border border-[#93000a] text-[#93000a] px-4 py-2 text-xs font-semibold rounded hover:bg-[#93000a]/10"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success State Card Data */}
          {trackingData && !loading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Shipment Header Card */}
              <div className="neo-brutalist-card bg-white p-6 rounded space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] pb-4">
                  <div>
                    <span className="text-xs text-[#505f76] font-bold uppercase tracking-wider block mb-1">
                      Nomor Surat Jalan (DO)
                    </span>
                    <h2 className="font-mono text-2xl md:text-3xl font-extrabold text-[#00236f]">
                      {trackingData.do_number}
                    </h2>
                  </div>
                  <div>{getStatusBadge(trackingData.status)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#f7f9fb] p-3 rounded border border-[#e2e8f0]">
                    <span className="text-[11px] font-bold text-[#505f76] uppercase block mb-1">Deskripsi Material</span>
                    <p className="font-semibold text-sm text-[#191c1e]">{trackingData.description || 'Material Logistics Ericsson BTS'}</p>
                  </div>
                  <div className="bg-[#f7f9fb] p-3 rounded border border-[#e2e8f0]">
                    <span className="text-[11px] font-bold text-[#505f76] uppercase block mb-1">Asal Pengiriman (Hub)</span>
                    <p className="font-semibold text-sm text-[#191c1e]">{trackingData.origin_address || 'Gudang PT. AKS'}</p>
                  </div>
                  <div className="bg-[#f7f9fb] p-3 rounded border border-[#e2e8f0]">
                    <span className="text-[11px] font-bold text-[#505f76] uppercase block mb-1">Tujuan Site BTS</span>
                    <p className="font-semibold text-sm text-[#191c1e]">
                      {trackingData.site?.site_name ? `${trackingData.site.site_name} (${trackingData.site.site_id})` : trackingData.destination_address}
                    </p>
                  </div>
                </div>

                {/* Driver Info */}
                {trackingData.driver && (
                  <div className="bg-[#d0e1fb]/40 border border-[#b7c8e1] p-4 rounded flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00236f] text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {trackingData.driver.full_name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#00236f] uppercase">Kurir / Driver Bertugas</p>
                        <h4 className="font-bold text-sm text-[#191c1e]">{trackingData.driver.full_name}</h4>
                        <p className="text-xs text-[#505f76] font-mono">
                          Armada: {trackingData.driver.vehicle_type || 'Truck'} ({trackingData.driver.vehicle_plate || 'No Plate'})
                        </p>
                      </div>
                    </div>
                    {trackingData.driver.phone_number && (
                      <a
                        href={`https://wa.me/${trackingData.driver.phone_number.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>Hubungi Driver WA</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline Progress */}
              <div className="neo-brutalist-card bg-white p-6 rounded space-y-4">
                <h3 className="font-bold text-lg text-[#00236f] flex items-center gap-2 border-b border-[#e2e8f0] pb-2">
                  <span className="material-symbols-outlined">alt_route</span>
                  <span>Timeline Status Pengiriman</span>
                </h3>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e2e8f0]">
                  {trackingData.timeline?.map((step) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';
                    return (
                      <div key={step.step} className="relative flex items-start gap-4">
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : isCurrent
                              ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                              : 'bg-white border-slate-300 text-slate-400'
                          }`}
                        >
                          {isCompleted && <span className="material-symbols-outlined text-xs font-bold">check</span>}
                        </div>
                        <div className="flex-1 bg-[#f7f9fb] p-3 rounded border border-[#e2e8f0]">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className={`font-bold text-sm ${isCompleted ? 'text-[#191c1e]' : 'text-[#505f76]'}`}>
                              {step.title}
                            </h4>
                            {step.timestamp && (
                              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {step.timestamp}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#505f76]">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Map Route Location */}
              <div className="neo-brutalist-card bg-white p-6 rounded space-y-4">
                <h3 className="font-bold text-lg text-[#00236f] flex items-center gap-2 border-b border-[#e2e8f0] pb-2">
                  <span className="material-symbols-outlined">map</span>
                  <span>Peta Lokasi Hub & BTS Site</span>
                </h3>
                <div className="h-72 rounded overflow-hidden border border-[#e2e8f0]">
                  <TrackingMap />
                </div>
              </div>

              {/* Dismantle Material Table */}
              {trackingData.assets && trackingData.assets.length > 0 && (
                <div className="neo-brutalist-card bg-white p-6 rounded space-y-4">
                  <h3 className="font-bold text-lg text-[#00236f] flex items-center gap-2 border-b border-[#e2e8f0] pb-2">
                    <span className="material-symbols-outlined">inventory_2</span>
                    <span>Daftar Material Dismantle ({trackingData.assets.length} Item)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9fb] border-b border-[#e2e8f0] text-xs text-[#505f76] font-bold">
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">Kategori</th>
                          <th className="py-2 px-3">Serial Number</th>
                          <th className="py-2 px-3">Jumlah</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0] text-xs text-[#191c1e]">
                        {trackingData.assets.map((asset, index) => (
                          <tr key={asset.id || index} className="hover:bg-[#f7f9fb]">
                            <td className="py-2 px-3 font-bold text-slate-400">{index + 1}</td>
                            <td className="py-2 px-3 font-bold text-[#00236f]">{asset.category || 'Router/Switch'}</td>
                            <td className="py-2 px-3 font-mono">{asset.serial_number || '-'}</td>
                            <td className="py-2 px-3">{asset.quantity || 1} {asset.unit || 'PCS'}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Decorative Background Elements */}
        <div className="mt-12 opacity-20 w-full max-w-4xl h-24 flex items-end justify-between px-4 overflow-hidden pointer-events-none">
          <div className="w-12 h-12 bg-[#1e3a8a] rounded-sm transform rotate-12"></div>
          <div className="w-20 h-20 bg-[#d0e1fb] rounded-full mb-6"></div>
          <div className="w-28 h-28 bg-[#c5c5d3] transform -rotate-6"></div>
          <div className="w-10 h-10 bg-[#00236f] rounded-sm transform translate-y-3"></div>
          <div className="w-16 h-16 bg-[#384055] rounded-full -mb-3"></div>
        </div>
      </main>

      {/* ─── 3. Footer ─── */}
      <footer className="w-full py-6 px-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-t border-[#c5c5d3]">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-bold text-sm text-[#191c1e]">ARTACOMINDO X AKS</span>
          <p className="text-xs text-[#505f76]">
            © 2026 LogisticsPro Enterprise Solutions. All rights reserved.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <a className="text-[#505f76] text-xs hover:text-[#00236f] underline" href="#">
            Privacy Policy
          </a>
          <a className="text-[#505f76] text-xs hover:text-[#00236f] underline" href="#">
            Terms of Service
          </a>
          <a className="text-[#505f76] text-xs hover:text-[#00236f] underline" href="#">
            System Status
          </a>
          <a className="text-[#505f76] text-xs hover:text-[#00236f] underline" href="#">
            Contact Support
          </a>
        </div>
      </footer>
    </div>
  );
}
