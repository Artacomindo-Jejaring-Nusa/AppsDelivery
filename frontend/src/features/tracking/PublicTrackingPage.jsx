import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import TrackingMap from '../../components/shared/TrackingMap';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';

export default function PublicTrackingPage() {
  const { t } = useTranslation();
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

      // Real-time live polling every 5 seconds for GPS position & status updates
      const interval = setInterval(() => {
        fetchTrackingInfo(queryNum, false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pathTrackingNumber]);

  const fetchTrackingInfo = async (numToSearch, showSpinner = true) => {
    if (!numToSearch || !numToSearch.trim()) return;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/track/${encodeURIComponent(numToSearch.trim())}`);
      setTrackingData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch tracking:', err);
      if (showSpinner) setTrackingData(null);
      setError(err.response?.data?.message || 'Nomor pengiriman yang Anda masukkan tidak valid atau belum terdaftar dalam sistem kami.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputNumber.trim()) {
      setSearched(true);
      navigate(`/track/${encodeURIComponent(inputNumber.trim())}`);
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '26 Jul 2026, 14:30 GMT+8';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[#f7f9fb] font-sans text-[#191c1e] flex flex-col min-h-screen">
      {/* Inline styles for custom material symbols & scrollbar */}
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .neo-brutalist-input {
          box-shadow: 4px 4px 0px 0px #00236f;
        }
        .neo-brutalist-card {
          border: 2px solid #c5c5d3;
        }
      `}</style>

      {/* ─── 1. Public TopAppBar ─── */}
      <header className="flex items-center justify-between px-6 py-4 w-full bg-[#f7f9fb] border-b-2 border-[#c5c5d3] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="font-bold text-xl md:text-2xl text-[#00236f] leading-tight">Merkurius Delivery</h1>
            <p className="text-[10px] text-[#444651] uppercase tracking-widest font-bold">Logistics Tracking System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 border-2 border-[#00236f] text-[#00236f] font-bold text-xs uppercase">
            <span className="material-symbols-outlined text-[18px]">public</span>
            Public Tracking
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1 px-4 py-2 bg-[#00236f] text-white font-bold text-xs uppercase active:translate-y-0.5 shadow-sm hover:bg-[#1e3a8a]"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            Staff Login
          </button>
        </div>
      </header>

      {/* ─── 2. Main Content Area ─── */}
      <main className="flex-1 flex flex-col min-h-screen bg-[#f7f9fb]">
        <div className="p-6 max-w-[1400px] mx-auto w-full space-y-6 pb-12">
          
          {/* Search Header Container */}
          <section className="bg-white border-2 border-[#c5c5d3] p-6 shadow-sm">
            <h2 className="font-bold text-xl text-[#00236f] mb-1">{t('tracking.public_title', 'Lacak Pengiriman Logistik')}</h2>
            <p className="text-sm text-[#505f76] mb-6">
              {t('tracking.public_subtitle', 'Masukkan Nomor Surat Jalan (DO), Nomor Manifest, atau Barcode Material untuk melacak status real-time.')}
            </p>

            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                <label className="absolute -top-3 left-3 bg-white px-1 text-xs font-bold text-[#505f76]">
                  {t('tracking.placeholder', 'Contoh: DO-2026-07-002 atau INB-DO-...')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('tracking.placeholder', 'Contoh: DO-2026-07-002 atau INB-DO-...')}
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  className="w-full h-14 px-4 border-2 border-[#00236f] bg-white font-mono text-sm focus:ring-0 focus:border-[#00236f] outline-none neo-brutalist-input transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-14 px-8 bg-[#00236f] text-white font-bold text-sm hover:bg-[#1e3a8a] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">search</span>
                )}
                <span>{loading ? t('tracking.searching', 'Memproses...') : t('tracking.btn_track', 'Lacak')}</span>
              </button>
            </form>
          </section>

          {/* Loading Indicator */}
          {loading && (
            <div className="bg-white border-2 border-[#c5c5d3] p-12 text-center space-y-3">
              <span className="material-symbols-outlined text-[#00236f] text-4xl animate-spin">sync</span>
              <p className="font-bold text-base text-[#505f76]">Memproses pencarian data pengiriman...</p>
            </div>
          )}

          {/* Error Alert Box */}
          {error && !loading && (
            <div className="bg-[#ffdad6] border-2 border-[#ba1a1a] p-6 rounded flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="bg-[#ba1a1a] rounded-full p-2 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">warning</span>
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="font-bold text-lg text-[#93000a] mb-1">Pengiriman Tidak Ditemukan</h3>
                <p className="text-sm text-[#93000a] opacity-90 mb-4">{error}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#93000a] text-white px-4 py-2 text-xs font-bold rounded"
                  >
                    Hubungi Support
                  </a>
                  <button
                    onClick={() => setError(null)}
                    className="border border-[#93000a] text-[#93000a] px-4 py-2 text-xs font-bold rounded"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tracking Results (When Data Exists) ─── */}
          {trackingData && !loading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Public Heading Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="font-bold text-2xl text-[#00236f]">Shipment Tracking Status</h2>
                  <p className="text-sm text-[#444651]">Real-time status for your delivery order</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#444651] uppercase">Last Update:</span>
                  <span className="text-xs font-mono bg-[#eceef0] px-2 py-0.5 border border-[#c5c5d3]">
                    {formatTimestamp(trackingData.updated_at)}
                  </span>
                </div>
              </div>

              {/* Shipment Header Section */}
              <section className="bg-white border-2 border-[#c5c5d3] p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-xs text-[#444651] uppercase tracking-[0.2em] font-bold">
                      Nomor Surat Jalan (DO)
                    </p>
                    <div className="flex items-center gap-3">
                      <h3 className="font-mono text-3xl md:text-[40px] text-[#00236f] tracking-tight leading-none font-extrabold">
                        {trackingData.do_number}
                      </h3>
                      {trackingData.type === 'outbound' || trackingData.notes?.toLowerCase().includes('dismantle') || trackingData.description?.toLowerCase().includes('dismantle') ? (
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 border-2 border-amber-400 font-bold text-xs uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">north_east</span>
                          OUTBOUND / DISMANTLE
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-900 border-2 border-blue-400 font-bold text-xs uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">south_west</span>
                          INBOUND LOGISTICS
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[#d0e1fb] text-[#54647a] px-6 py-2 border-2 border-[#00236f]">
                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {trackingData.status ? trackingData.status.replace('_', ' ') : 'IN TRANSIT'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t-2 border-[#c5c5d3]">
                  {/* Material Info */}
                  <div className="p-6 border-b md:border-b-0 md:border-r-2 border-[#c5c5d3] bg-[#f7f9fb]/50">
                    <p className="text-xs text-[#444651] uppercase font-bold mb-2 tracking-wider">
                      Material / Deskripsi Unit
                    </p>
                    <p className="text-base font-bold text-[#00236f]">
                      {trackingData.description || 'Material Migrasi BTS Balikpapan - Replacement Unit'}
                    </p>
                  </div>

                  {/* Origin */}
                  <div className="p-6 border-b md:border-b-0 md:border-r-2 border-[#c5c5d3]">
                    <p className="text-xs text-[#444651] uppercase font-bold mb-2 tracking-wider">
                      Asal Pengiriman (HUB)
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#00236f]">warehouse</span>
                      <p className="text-sm font-bold text-[#191c1e]">
                        {trackingData.origin_address && !trackingData.origin_address.includes('PT. AKS')
                          ? trackingData.origin_address
                          : (trackingData.type === 'outbound' ? 'Site BTS (Dismantle)' : 'Gudang Utama Ericsson (Banjarmasin)')}
                      </p>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="p-6">
                    <p className="text-xs text-[#444651] uppercase font-bold mb-2 tracking-wider">
                      Tujuan Site BTS Ericsson
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ba1a1a]">cell_tower</span>
                      <p className="text-sm font-bold text-[#191c1e]">
                        {trackingData.site?.site_name ? `${trackingData.site.site_name} (${trackingData.site.site_id})` : trackingData.destination_address}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Main Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Shipment Journey (Timeline) */}
                <section className="lg:col-span-5 bg-white border-2 border-[#c5c5d3] p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b-2 border-[#c5c5d3] pb-3">
                    <span className="material-symbols-outlined text-[#00236f]">route</span>
                    <h4 className="font-bold text-lg text-[#00236f] uppercase tracking-wider">Shipment Journey</h4>
                  </div>

                  <div className="relative space-y-0 pl-10">
                    {/* Vertical Line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-[#c5c5d3]"></div>

                    {trackingData.timeline?.map((step, idx) => {
                      const isCompleted = step.status === 'completed';
                      const isCurrent = step.status === 'current';

                      return (
                        <div key={step.step || idx} className="relative pb-8 group">
                          {isCompleted ? (
                            <>
                              <div className="absolute -left-[30px] top-0 w-6 h-6 bg-[#00236f] border-2 border-[#00236f] flex items-center justify-center z-10">
                                <span className="material-symbols-outlined text-[16px] text-white">check</span>
                              </div>
                              <div className="absolute -left-[10px] top-1 bottom-0 w-[2px] bg-[#00236f]"></div>
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-sm font-bold text-[#191c1e]">{step.title}</p>
                                {step.timestamp && (
                                  <span className="text-[11px] font-mono bg-[#eceef0] px-2 py-0.5 border border-[#c5c5d3]">
                                    {step.timestamp}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#444651]">{step.description}</p>
                            </>
                          ) : isCurrent ? (
                            <>
                              <div className="absolute -left-[30px] top-0 w-6 h-6 bg-white border-2 border-[#00236f] flex items-center justify-center z-10">
                                <div className="w-2 h-2 bg-[#00236f] animate-pulse"></div>
                              </div>
                              <div className="absolute -left-[10px] top-1 bottom-0 w-[2px] bg-[#c5c5d3]"></div>
                              <div className="bg-[#1e3a8a] text-white p-4 border-2 border-[#00236f]">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-sm font-bold uppercase">{step.title}</p>
                                </div>
                                <p className="text-xs text-blue-100">{step.description}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="absolute -left-[30px] top-0 w-6 h-6 bg-[#e6e8ea] border-2 border-[#c5c5d3] flex items-center justify-center z-10"></div>
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-sm font-bold text-[#444651]">{step.title}</p>
                              </div>
                              <p className="text-xs text-[#757682]">{step.description}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Right Column: Map & Summary */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Integrated Map Card */}
                  <section className="bg-white border-2 border-[#c5c5d3] p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00236f]">map</span>
                        <h4 className="text-xs font-bold text-[#00236f] uppercase tracking-widest">
                          Real-time Positioning
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-[#00236f] border-2 border-[#00236f] px-3 py-0.5 bg-[#1e3a8a]/10">
                        KALIMANTAN REGIONAL
                      </span>
                    </div>

                    <div className="aspect-video relative border-2 border-[#c5c5d3] overflow-hidden rounded">
                      <TrackingMap 
                        driverLat={trackingData.driver?.current_lat || trackingData.site?.latitude || -1.2654}
                        driverLng={trackingData.driver?.current_lng || trackingData.site?.longitude || 116.8312}
                        driverName={trackingData.driver?.full_name || 'Driver Transport AKS'}
                      />
                      
                      {/* Map Overlay Badge */}
                      <div className="absolute top-3 right-3 bg-white border-2 border-[#00236f] p-3 space-y-2 shadow-xl z-10 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#505f76]"></div>
                          <span className="font-bold">Origin Hub</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#ba1a1a]"></div>
                          <span className="font-bold">BTS Destination</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Driver & Vehicle Info */}
                  <section className="bg-white border-2 border-[#c5c5d3] p-6 shadow-sm">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs text-[#444651] uppercase font-bold">Vehicle Info</p>
                        <p className="text-sm font-bold text-[#00236f]">
                          {trackingData.driver?.vehicle_type || 'Box Truck'} - {trackingData.driver?.vehicle_plate || 'B 9210 PK'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[#444651] uppercase font-bold">Driver Assigned</p>
                        <p className="text-sm font-bold text-[#00236f]">
                          {trackingData.driver?.full_name || 'Driver Standby Logistik'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Material Table Section */}
              {(() => {
                const isOutbound = trackingData.type === 'outbound' || trackingData.notes?.toLowerCase().includes('dismantle') || trackingData.description?.toLowerCase().includes('dismantle');
                const count = trackingData.assets ? trackingData.assets.length : 0;

                return (
                  <section className="bg-white border-2 border-[#c5c5d3] shadow-sm overflow-hidden">
                    <div className="p-6 border-b-2 border-[#c5c5d3] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00236f]">inventory_2</span>
                        <h4 className="font-bold text-lg text-[#00236f] uppercase tracking-wider">
                          {isOutbound ? `Daftar Material Dismantle (${count} Item)` : `Daftar Material Inbound / Baru (${count} Item)`}
                        </h4>
                      </div>
                    </div>

                    <div className="overflow-x-auto hide-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#f2f4f6] border-b-2 border-[#c5c5d3]">
                            <th className="px-6 py-3 text-xs font-bold text-[#444651] uppercase tracking-widest">No</th>
                            <th className="px-6 py-3 text-xs font-bold text-[#444651] uppercase tracking-widest">Kategori Material</th>
                            <th className="px-6 py-3 text-xs font-bold text-[#444651] uppercase tracking-widest">Nomor Serial</th>
                            <th className="px-6 py-3 text-xs font-bold text-[#444651] uppercase tracking-widest">Jumlah</th>
                            <th className="px-6 py-3 text-xs font-bold text-[#444651] uppercase tracking-widest text-center">Status Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-[#c5c5d3]">
                          {trackingData.assets && trackingData.assets.length > 0 ? (
                            trackingData.assets.map((asset, idx) => (
                              <tr key={asset.id || idx} className="hover:bg-[#00236f]/5 transition-colors">
                                <td className="px-6 py-4 text-sm text-[#444651] font-mono">
                                  {String(idx + 1).padStart(2, '0')}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-[#00236f]">
                                  {asset.category ? asset.category.toUpperCase() : 'MATERIAL UNIT'}
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-[#191c1e]">
                                  {asset.serial_number || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">
                                  {asset.quantity || 1} {asset.unit ? asset.unit.toUpperCase() : 'UNITS'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center gap-1 bg-[#1e3a8a] text-white px-4 py-1 border-2 border-[#00236f] text-xs font-bold uppercase">
                                    <span className="material-symbols-outlined text-[16px]">verified</span>
                                    Scanned & Verified
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-[#505f76] font-bold">
                                {isOutbound 
                                  ? 'Belum ada item dismantle yang tercatat untuk Surat Jalan ini.' 
                                  : 'Belum ada item material inbound yang tercatat untuk Surat Jalan ini.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })()}

            </div>
          )}

        </div>
      </main>

      {/* ─── 3. Public Footer ─── */}
      <footer className="mt-auto py-6 border-t-2 border-[#c5c5d3] bg-[#f2f4f6]">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-[#444651]">© 2026 PT. Artacomindo Logistics. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <a className="text-xs font-bold text-[#00236f] uppercase hover:underline" href="#">Support Center</a>
            <a className="text-xs font-bold text-[#00236f] uppercase hover:underline" href="#">Privacy Policy</a>
            <a className="text-xs font-bold text-[#00236f] uppercase hover:underline" href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
