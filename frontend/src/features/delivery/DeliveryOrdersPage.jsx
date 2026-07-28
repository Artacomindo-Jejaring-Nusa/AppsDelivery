import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters for DO list
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

  // Active Inbound Scan Session State
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'scan'
  const [selectedDO, setSelectedDO] = useState(null);
  const [scanRows, setScanRows] = useState([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifests, setManifests] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDOIds, setSelectedDOIds] = useState([]);
  const [manifestNotes, setManifestNotes] = useState('');

  const tableEndRef = useRef(null);

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

  const fetchManifestsAndDrivers = async () => {
    try {
      const [mRes, dRes] = await Promise.all([
        api.get('/manifests'),
        api.get('/drivers'),
      ]);
      setManifests(mRes.data.data || []);
      setDriversList(dRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch manifests/drivers', err);
    }
  };

  const handleOpenManifestModal = () => {
    fetchManifestsAndDrivers();
    setShowManifestModal(true);
  };

  const handlePrintManifest = (manifest) => {
    const driverName = manifest.driver?.full_name || 'Driver AKS';
    const vehiclePlate = manifest.driver?.vehicle_plate || '-';
    const vehicleType = manifest.driver?.vehicle_type || 'Box Truck';
    const items = manifest.items || [];

    const itemsHtml = items.length > 0
      ? items.map((item, idx) => {
          const doData = item.delivery_order || item;
          return `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td style="font-family:monospace;font-weight:bold;color:#00236f;">${doData.do_number || item.do_number || '-'}</td>
              <td>${doData.description || 'Material Logistics'}</td>
              <td>${doData.origin_address || 'Warehouse Hub'}</td>
              <td>${doData.destination_address || 'BTS Site'}</td>
              <td style="text-align:center;">${doData.sla_status || 'Green'}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="6" style="text-align:center;color:#64748b;">DO item details attached in manifest document</td></tr>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Surat Jalan & Manifest - ${manifest.manifest_number}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; color: #0f172a; padding: 10px; }
            .header-table { width: 100%; border-bottom: 2px solid #00236f; padding-bottom: 10px; margin-bottom: 15px; }
            .logo-title { color: #00236f; font-size: 16pt; font-weight: bold; margin: 0; }
            .logo-sub { font-size: 9pt; color: #64748b; font-weight: bold; letter-spacing: 1px; }
            .doc-title { text-align: center; margin: 15px 0; }
            .doc-title h2 { color: #00236f; margin: 0; font-size: 14pt; text-transform: uppercase; text-decoration: underline; }
            .doc-title p { margin: 3px 0 0 0; font-family: monospace; font-weight: bold; font-size: 11pt; }
            .grid-info { display: table; width: 100%; margin-bottom: 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
            .grid-col { display: table-cell; width: 50%; vertical-align: top; }
            .info-row { margin-bottom: 5px; font-size: 9.5pt; }
            .info-label { color: #64748b; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; display: block; }
            .info-val { font-weight: bold; color: #0f172a; }
            table.items-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            table.items-table th { background: #00236f; color: white; padding: 8px; font-size: 9.5pt; text-align: left; border: 1px solid #00236f; }
            table.items-table td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; }
            .sig-section { display: table; width: 100%; margin-top: 40px; page-break-inside: avoid; }
            .sig-box { display: table-cell; width: 33.33%; text-align: center; vertical-align: top; }
            .sig-line { margin-top: 50px; border-top: 1px solid #475569; width: 80%; margin-left: auto; margin-right: auto; padding-top: 4px; font-weight: bold; font-size: 9pt; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="logo-title">OPERATIONS CENTER LOGISTICS</div>
                <div class="logo-sub">PT. AKS X PT. ARTACOMINDO JEJARING NUSA</div>
              </td>
              <td style="text-align:right;">
                <div style="font-size:9pt;color:#64748b;">Dokumen Resmi Surat Jalan</div>
                <div style="font-family:monospace;font-size:10pt;font-weight:bold;">${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </td>
            </tr>
          </table>

          <div class="doc-title">
            <h2>SURAT JALAN & MANIFEST PENUGASAN KURIR</h2>
            <p>NO: ${manifest.manifest_number}</p>
          </div>

          <div class="grid-info">
            <div class="grid-col">
              <div class="info-row">
                <span class="info-label">Pengemudi / Kurir (PT AKS)</span>
                <span class="info-val">${driverName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Kendaraan & Plat Nomor</span>
                <span class="info-val">${vehicleType} (${vehiclePlate})</span>
              </div>
            </div>
            <div class="grid-col">
              <div class="info-row">
                <span class="info-label">Status Manifest</span>
                <span class="info-val" style="text-transform:uppercase;color:#00236f;">${manifest.status}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Catatan Rute / Instruksi</span>
                <span class="info-val">${manifest.notes || 'Rute standar pengiriman'}</span>
              </div>
            </div>
          </div>

          <p style="font-weight:bold;margin-bottom:5px;font-size:10pt;">Daftar Surat Jalan (Delivery Orders) yang Diberangkatkan:</p>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:30px;text-align:center;">No</th>
                <th>No. Surat Jalan (DO)</th>
                <th>Deskripsi Material</th>
                <th>Asal Pengiriman</th>
                <th>Tujuan Site / Gudang</th>
                <th style="text-align:center;">SLA</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p style="font-size:8.5pt;color:#64748b;font-style:italic;margin-top:10px;">
            * Surat Jalan ini diterbitkan secara otomatis oleh Sistem Operations Center Artacomindo dan menjadi bukti sah serah terima barang di lapangan.
          </p>

          <div class="sig-section">
            <div class="sig-box">
              <p style="margin:0;font-size:9pt;color:#475569;">Diserahkan oleh (Gudang Hub)</p>
              <div class="sig-line">Petugas Gudang Hub</div>
            </div>
            <div class="sig-box">
              <p style="margin:0;font-size:9pt;color:#475569;">Diberangkatkan oleh (Kurir)</p>
              <div class="sig-line">${driverName}</div>
            </div>
            <div class="sig-box">
              <p style="margin:0;font-size:9pt;color:#475569;">Diterima oleh (Site / Ericsson)</p>
              <div class="sig-line">Penerima Site</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreateManifestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) {
      alert('Pilih Driver terlebih dahulu');
      return;
    }
    if (selectedDOIds.length === 0) {
      alert('Pilih minimal 1 Delivery Order untuk dibuatkan Manifest');
      return;
    }
    try {
      await api.post('/manifests', {
        driver_id: selectedDriverId,
        delivery_order_ids: selectedDOIds,
        notes: manifestNotes,
      });
      alert('Manifest Surat Jalan berhasil diterbitkan!');
      setSelectedDOIds([]);
      setManifestNotes('');
      fetchManifestsAndDrivers();
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan Manifest');
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

  // Start scanning session for a specific Delivery Order
  const startScanSession = async (doItem) => {
    setSelectedDO(doItem);
    setViewMode('scan');
    
    // Fetch any existing assets for this DO
    try {
      const res = await api.get(`/delivery-orders/${doItem.id}/assets`);
      const existingAssets = res.data.data || [];
      
      if (existingAssets.length > 0) {
        const mappedRows = existingAssets.map((asset, index) => ({
          id: asset.id,
          serialNumber: asset.serial_number || '',
          category: asset.category || 'Router/Switch',
          quantity: asset.quantity || 1,
          unit: asset.unit || 'PCS',
          status: 'scanned', // check_circle status
        }));
        setScanRows([...mappedRows, createEmptyRow(mappedRows.length + 1)]);
        setScannedCount(mappedRows.length);
      } else {
        setScanRows([createEmptyRow(1)]);
        setScannedCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch existing assets', err);
      setScanRows([createEmptyRow(1)]);
      setScannedCount(0);
    }
  };

  const createEmptyRow = (index) => ({
    id: `temp-${Date.now()}-${index}`,
    serialNumber: '',
    category: 'Router/Switch',
    quantity: 1,
    unit: 'PCS',
    status: 'pending',
  });

  const handleRowChange = (index, field, value) => {
    const updated = [...scanRows];
    updated[index][field] = value;
    setScanRows(updated);
  };

  const handleKey = (event, index, inputVal) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (inputVal.trim() !== '') {
        const updated = [...scanRows];
        updated[index].status = 'scanned';
        updated[index].serialNumber = inputVal.trim();
        
        // Auto add a new empty row
        const newIndex = updated.length + 1;
        const newRow = createEmptyRow(newIndex);
        const finalRows = [...updated, newRow];
        
        setScanRows(finalRows);
        
        // Recalculate scanned items count
        const completed = finalRows.filter(r => r.status === 'scanned').length;
        setScannedCount(completed);

        // Auto focus the next input field
        setTimeout(() => {
          const inputs = document.querySelectorAll('.barcode-input');
          if (inputs[inputs.length - 1]) {
            inputs[inputs.length - 1].focus();
          }
          // Scroll container to bottom
          if (tableEndRef.current) {
            tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  };

  const addManualRow = () => {
    const newIndex = scanRows.length + 1;
    setScanRows([...scanRows, createEmptyRow(newIndex)]);
    
    setTimeout(() => {
      const inputs = document.querySelectorAll('.barcode-input');
      if (inputs[inputs.length - 1]) {
        inputs[inputs.length - 1].focus();
      }
      if (tableEndRef.current) {
        tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const removeRow = (index) => {
    const updated = scanRows.filter((_, i) => i !== index);
    setScanRows(updated.length > 0 ? updated : [createEmptyRow(1)]);
    
    // Recalculate scanned items count
    setTimeout(() => {
      const completed = updated.filter(r => r.status === 'scanned').length;
      setScannedCount(completed);
    }, 50);
  };

  const clearAllRows = () => {
    if (window.confirm('Are you sure you want to clear all scanned data?')) {
      setScanRows([createEmptyRow(1)]);
      setScannedCount(0);
    }
  };

  // Generate QR Code data URL client-side
  const generateQRDataUrl = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('QR generation failed:', err);
      return null;
    }
  };

  // QRCodeCard: renders a single barcode card with client-generated QR (Fixed Label Dimensions)
  const QRCodeCard = ({ barcode }) => {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    useEffect(() => {
      if (barcode?.barcode_data) {
        generateQRDataUrl(barcode.barcode_data).then(setQrDataUrl);
      }
    }, [barcode?.barcode_data]);

    return (
      <div className="w-[320px] min-h-[240px] border-2 border-outline-variant p-md rounded-xl flex flex-col items-center justify-between bg-white text-center shadow-xs mx-auto">
        <span className="font-data-mono text-label-md text-primary font-bold tracking-wide break-all text-[12px]">
          {barcode.barcode_data}
        </span>
        
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={barcode.barcode_data} className="h-32 w-32 object-contain my-xs" />
        ) : (
          <div className="h-32 w-32 flex items-center justify-center bg-surface-container rounded-lg my-xs">
            <span className="material-symbols-outlined text-secondary animate-spin">progress_activity</span>
          </div>
        )}
        
        <div className="space-y-[2px]">
          <p className="text-[10px] text-outline italic font-medium">
            Barcode Has Been Automatically Generated by System
          </p>
          <div className="text-[11px] text-secondary font-data-mono font-bold tracking-wider uppercase">
            PT. AKS X ARTACOMINDO
          </div>
        </div>
      </div>
    );
  };

  // Submit scan data & generate barcodes
  const handleProcessShipment = async () => {
    // Only submit NEW rows (temp IDs), skip already-persisted ones
    const newAssets = scanRows.filter(r => 
      r.serialNumber.trim() !== '' && 
      String(r.id).startsWith('temp-')
    );
    if (newAssets.length === 0) {
      alert('Tidak ada item baru untuk disimpan. Semua data sudah tersimpan.');
      return;
    }

    setIsSubmittingScan(true);
    try {
      // 1. Submit batch assets to backend
      const payload = {
        assets: newAssets.map(r => ({
          category: r.category,
          item_name: `${r.category} - ${r.serialNumber}`,
          serial_number: r.serialNumber,
          quantity: parseInt(r.quantity) || 1,
          unit: r.unit,
          condition: 'good',
          notes: 'Scanned from Inbound Logistics Portal',
        }))
      };

      const res = await api.post(`/delivery-orders/${selectedDO.id}/assets/batch`, payload);
      const createdAssets = res.data.data || [];

      // 2. Generate barcodes for each asset
      const barcodePromises = createdAssets.map(asset => 
        api.post(`/assets/${asset.id}/barcode`)
          .then(res => res.data.data)
          .catch(err => {
            console.error(`Failed to generate barcode for asset ${asset.id}`, err);
            return null;
          })
      );

      const barcodes = await Promise.all(barcodePromises);
      const validBarcodes = barcodes.filter(b => b !== null);

      setGeneratedBarcodes(validBarcodes);
      setShowBarcodeModal(true);

      // Refresh scan rows (reload assets from server) without clearing barcodes
      try {
        const refreshRes = await api.get(`/delivery-orders/${selectedDO.id}/assets`);
        const existingAssets = refreshRes.data.data || [];
        if (existingAssets.length > 0) {
          const mappedRows = existingAssets.map((asset, index) => ({
            id: asset.id,
            serialNumber: asset.serial_number || '',
            category: asset.category || 'Router/Switch',
            quantity: asset.quantity || 1,
            unit: asset.unit || 'PCS',
            status: 'scanned',
          }));
          setScanRows([...mappedRows, createEmptyRow(mappedRows.length + 1)]);
          setScannedCount(mappedRows.length);
        }
      } catch (refreshErr) {
        console.error('Failed to refresh assets after barcode generation', refreshErr);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save scanned assets.');
    } finally {
      setIsSubmittingScan(false);
    }
  };

  const filteredOrders = orders.filter((doItem) =>
    doItem.do_number.toLowerCase().includes(search.toLowerCase()) ||
    doItem.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-lg">
      {viewMode === 'list' ? (
        <>
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
            <div className="flex items-center gap-sm">
              <button
                onClick={handleOpenManifestModal}
                className="flex items-center gap-xs px-md py-sm bg-secondary text-on-secondary font-label-md text-label-md rounded-lg shadow-sm hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">assignment</span>
                <span>Manifest Surat Jalan</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Buat DO Baru</span>
              </button>
            </div>
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
                      <th className="py-md px-lg text-right">Aksi</th>
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
                            <td className="py-md px-lg text-right space-x-sm">
                              <button
                                onClick={() => startScanSession(item)}
                                className="px-sm py-xs bg-primary text-on-primary hover:opacity-90 font-label-md text-label-md rounded flex items-center gap-xs inline-flex"
                              >
                                <span className="material-symbols-outlined text-[16px]">barcode_scanner</span>
                                <span>Scan Inbound</span>
                              </button>
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
        </>
      ) : (
        /* Inbound Goods / Dismantle Scanning View */
        <div className="space-y-lg animate-in fade-in duration-300">
          {/* Back Button */}
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-xs text-primary hover:underline font-label-md text-label-md mb-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali ke Daftar DO</span>
          </button>

          {/* 1. Top Panel: Active Ticket Summary */}
          <section className="bg-white border border-outline-variant shadow-sm rounded-lg p-lg">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm leading-tight">Inbound Goods / Dismantle</h2>
                  <p className="text-body-sm text-on-surface-variant uppercase tracking-wider font-semibold">Active Inbound Session</p>
                </div>
              </div>
              <div className="flex gap-md">
                <div className="text-right">
                  <span className="block text-label-sm text-on-surface-variant">Arrival Time</span>
                  <span className="block font-data-mono text-data-mono">
                    {new Date(selectedDO.created_at || Date.now()).toISOString().replace('T', ' ').slice(0, 19)}
                  </span>
                </div>
                <div className="bg-primary/5 px-md py-sm rounded border border-primary/20">
                  <span className="text-label-sm text-primary block">SLA Warning</span>
                  <span className="text-headline-sm font-headline-sm text-primary">
                    {selectedDO.sla_detail?.remaining_formatted || `${selectedDO.sla_days} Hari`}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-xl pt-md border-t border-outline-variant/50">
              <div>
                <span className="text-label-sm text-on-surface-variant uppercase">DO / BTS ID</span>
                <div className="flex items-center gap-sm mt-xs">
                  <span className="font-headline-md text-headline-md text-primary">{selectedDO.do_number}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDO.do_number);
                      alert('DO Number copied to clipboard!');
                    }}
                    className="material-symbols-outlined text-outline text-sm hover:text-primary"
                  >
                    content_copy
                  </button>
                </div>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant uppercase">Origin City</span>
                <div className="flex items-center gap-sm mt-xs">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  <span className="font-headline-md text-headline-md">
                    {selectedDO.bts_site?.city || 'Kalimantan'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant uppercase">Category</span>
                <div className="flex items-center gap-sm mt-xs">
                  <span className="font-headline-md text-headline-md">Network Infrastructure</span>
                </div>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant uppercase">Items Scanned</span>
                <div className="flex items-baseline gap-xs mt-xs">
                  <span className="font-headline-md text-headline-md text-primary" id="scanned-count">
                    {scannedCount}
                  </span>
                  <span className="text-on-surface-variant">/ 48 items</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full mt-sm overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${Math.min((scannedCount / 48) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          {/* 2 & 3. Dynamic Form Table with Auto-append */}
          <section className="bg-white border border-outline-variant shadow-sm rounded-lg overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-surface-container-low border-b border-outline-variant px-lg py-sm flex items-center justify-between">
              <span className="font-label-md text-label-md flex items-center gap-sm text-primary uppercase font-bold tracking-wider">
                <span className="material-symbols-outlined text-primary text-lg animate-pulse">barcode_scanner</span>
                SCANNER READY: CLICK SERIAL NUMBER FIELD TO BEGIN
              </span>
              <div className="flex gap-md">
                <button 
                  onClick={clearAllRows}
                  className="text-label-md text-error flex items-center gap-xs hover:bg-error/10 px-sm py-xs rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-surface-container-highest sticky top-0 z-10">
                  <tr className="font-label-sm text-label-sm text-secondary uppercase border-b border-outline-variant">
                    <th className="w-12 py-sm px-md text-left border-r border-outline-variant/30">#</th>
                    <th className="py-sm px-md text-left">Serial Number (S/N)</th>
                    <th className="w-64 py-sm px-md text-left">Asset Category</th>
                    <th className="w-32 py-sm px-md text-left text-right">Quantity</th>
                    <th className="w-32 py-sm px-md text-left">Unit</th>
                    <th className="w-20 py-sm px-md text-center">Status</th>
                    <th className="w-16 py-sm px-md"></th>
                  </tr>
                </thead>
                <tbody>
                  {scanRows.map((row, index) => (
                    <tr 
                      key={row.id} 
                      className={`zebra-row group border-b border-outline-variant/30 h-12 transition-colors ${
                        row.status === 'scanned' ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-md font-data-mono text-on-surface-variant border-r border-outline-variant/30">
                        {index + 1}
                      </td>
                      <td className="px-sm">
                        <div className="flex items-center gap-sm transition-all duration-150 rounded border border-transparent">
                          <input
                            type="text"
                            placeholder="Scan Barcode..."
                            value={row.serialNumber}
                            onChange={(e) => handleRowChange(index, 'serialNumber', e.target.value)}
                            onKeyDown={(e) => handleKey(e, index, e.target.value)}
                            className="w-full bg-transparent border-none font-data-mono text-body-md py-xs px-sm focus:ring-0 barcode-input"
                            autoFocus={index === scanRows.length - 1}
                          />
                        </div>
                      </td>
                      <td className="px-sm">
                        <select
                          value={row.category}
                          onChange={(e) => handleRowChange(index, 'category', e.target.value)}
                          className="w-full bg-transparent border-none text-body-md py-xs focus:ring-0 focus:bg-white transition-colors cursor-pointer outline-none"
                        >
                          <option value="Router/Switch">Router/Switch</option>
                          <option value="Base Station Unit">Base Station Unit</option>
                          <option value="Antenna Modular">Antenna Modular</option>
                          <option value="Power Module">Power Module</option>
                          <option value="Cable Set">Cable Set</option>
                        </select>
                      </td>
                      <td className="px-sm">
                        <input
                          type="number"
                          value={row.quantity}
                          min={1}
                          onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                          className="w-full text-right bg-transparent border-none text-body-md py-xs focus:ring-0 outline-none"
                        />
                      </td>
                      <td className="px-sm">
                        <span className="text-body-sm text-on-surface-variant uppercase font-medium">PCS</span>
                      </td>
                      <td className="px-sm text-center">
                        <span 
                          className={`material-symbols-outlined text-sm ${
                            row.status === 'scanned' ? 'text-primary' : 'text-outline-variant'
                          }`}
                        >
                          {row.status === 'scanned' ? 'check_circle' : 'pending_actions'}
                        </span>
                      </td>
                      <td className="px-sm text-center">
                        <button
                          onClick={() => removeRow(index)}
                          className="text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr ref={tableEndRef}></tr>
                </tbody>
              </table>
            </div>
            <div className="p-md bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
              <div className="flex gap-lg">
                <div className="flex items-center gap-xs">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-body-sm font-medium">Active Scanner</span>
                </div>
                <div className="flex items-center gap-xs">
                  <div className="w-3 h-3 bg-outline-variant rounded-full"></div>
                  <span className="text-body-sm text-secondary">Waiting Input</span>
                </div>
              </div>
              <button
                onClick={addManualRow}
                className="bg-primary/5 text-primary border border-primary/20 px-lg py-sm font-label-md flex items-center gap-sm hover:bg-primary hover:text-white transition-all rounded-lg"
              >
                <span className="material-symbols-outlined">add</span>
                <span>Manual Add Row (Ctrl+Space)</span>
              </button>
            </div>
          </section>

          {/* 4. Floating 'Simpan & Generate Barcode' Button */}
          <div className="fixed bottom-lg right-lg flex flex-col gap-md items-end z-30">
            <button
              onClick={handleProcessShipment}
              disabled={isSubmittingScan}
              className="bg-primary hover:bg-primary-container text-white shadow-2xl px-xl py-lg rounded-full flex items-center gap-md transform hover:scale-105 active:scale-95 transition-all group disabled:opacity-50"
            >
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md tracking-widest uppercase">Process Shipment</span>
                <span className="font-headline-sm text-headline-sm">
                  {isSubmittingScan ? 'Processing Assets...' : 'Simpan & Generate Barcode'}
                </span>
              </div>
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white">print</span>
              </div>
            </button>
          </div>
        </div>
      )}

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

      {/* Modal Barcodes Display for Printing */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-2xl w-full space-y-lg shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md flex-shrink-0">
              <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-sm">
                <span className="material-symbols-outlined">qr_code_2</span>
                <span>Print QR Code Label Inbound</span>
              </h3>
              <button onClick={() => setShowBarcodeModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-md space-y-md">
              <p className="text-body-md text-secondary">
                QR Code label berikut telah berhasil digenerate untuk material dismantle {selectedDO?.do_number}. Silakan print label ini untuk ditempelkan pada unit fisik. QR Code dapat di-scan oleh driver menggunakan kamera HP.
              </p>
              <div className="grid grid-cols-2 gap-md" id="print-area">
                {generatedBarcodes.map((barcode) => (
                  <QRCodeCard key={barcode.id} barcode={barcode} />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-md pt-md border-t border-outline-variant flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Generate all QR codes as data URLs for print
                  const qrEntries = await Promise.all(
                    generatedBarcodes.map(async (b) => {
                      const dataUrl = await generateQRDataUrl(b.barcode_data);
                      return { barcode_data: b.barcode_data, dataUrl };
                    })
                  );

                  const cardsHtml = qrEntries.map(entry => {
                    return '<div class="barcode-card">' +
                      '<div class="title">' + (entry.barcode_data || '') + '</div>' +
                      (entry.dataUrl ? '<img src="' + entry.dataUrl + '" />' : '<p>QR Error</p>') +
                      '<div class="footer-wrap">' +
                        '<div class="sys-note">Barcode Has Been Automatically Generated by System</div>' +
                        '<div class="company-footer">PT. AKS X ARTACOMINDO</div>' +
                      '</div>' +
                    '</div>';
                  }).join('');

                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(
                    '<html><head>' +
                    '<title>Print QR Codes - ' + (selectedDO?.do_number || '') + '</title>' +
                    '<style>' +
                    '@page { size: portrait; margin: 10mm; }' +
                    '* { box-sizing: border-box; }' +
                    'body { font-family: "Inter", "Segoe UI", Arial, sans-serif; padding: 10px; color: #0f172a; background: #fff; }' +
                    'h3 { color: #00236f; margin-top: 0; margin-bottom: 12px; border-bottom: 2px solid #00236f; padding-bottom: 6px; font-size: 14pt; }' +
                    '.print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12mm; justify-items: center; align-items: start; }' +
                    '.barcode-card { width: 90mm; height: 62mm; border: 2px solid #1e293b; padding: 4mm 4mm; text-align: center; border-radius: 10px; background: white; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: space-between; overflow: hidden; }' +
                    'img { width: 34mm; height: 34mm; margin: 1mm auto; display: block; object-fit: contain; }' +
                    '.title { font-weight: bold; font-size: 9.5pt; color: #00236f; font-family: monospace; word-break: break-all; line-height: 1.2; }' +
                    '.footer-wrap { width: 100%; text-align: center; }' +
                    '.sys-note { font-size: 7pt; font-style: italic; color: #64748b; margin-bottom: 2px; }' +
                    '.company-footer { font-size: 8.5pt; font-weight: bold; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase; font-family: monospace; }' +
                    '</style></head><body>' +
                    '<h3>Material Dismantle QR Codes: ' + (selectedDO?.do_number || '') + '</h3>' +
                    '<div class="print-grid">' + cardsHtml + '</div>' +
                    '<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>' +
                    '</body></html>'
                  );
                  printWindow.document.close();
                }}
                className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Labels</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Manifest Management Modal ─── */}
      {showManifestModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-3xl w-full space-y-lg shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Manifest Penugasan Kurir</h3>
                <p className="text-body-sm text-secondary">Kelola daftar Manifest dan terbitkan penugasan pengiriman baru ke Kurir</p>
              </div>
              <button onClick={() => setShowManifestModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Create Manifest Form */}
            <form onSubmit={handleCreateManifestSubmit} className="bg-surface p-md rounded-lg border border-outline-variant space-y-md">
              <h4 className="font-label-lg text-label-lg text-primary font-bold">Terbitkan Manifest Baru</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-secondary block mb-xs">Pilih Kurir / Driver</label>
                  <select
                    required
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full h-10 bg-surface-container-lowest px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  >
                    <option value="">-- Pilih Kurir Standby --</option>
                    {driversList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.vehicle_plate || 'No Plate'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-secondary block mb-xs">Catatan Rute / Petunjuk</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rute pengiriman Banjarmasin - Balikpapan"
                    value={manifestNotes}
                    onChange={(e) => setManifestNotes(e.target.value)}
                    className="w-full h-10 bg-surface-container-lowest px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-xs">
                  <label className="font-label-sm text-label-sm text-secondary block">Pilih Surat Jalan (Delivery Orders) untuk dimasukkan:</label>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-xs py-0.5 rounded">
                    {orders.filter(d => d.status === 'pending').length} Tersedia
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-xs border border-outline-variant rounded-lg p-sm bg-surface-container-lowest">
                  {orders.filter(d => d.status === 'pending').length > 0 ? (
                    orders.filter(d => d.status === 'pending').map((doItem) => (
                      <label key={doItem.id} className="flex items-center gap-sm p-xs hover:bg-surface rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDOIds.includes(doItem.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDOIds([...selectedDOIds, doItem.id]);
                            } else {
                              setSelectedDOIds(selectedDOIds.filter(id => id !== doItem.id));
                            }
                          }}
                          className="h-4 w-4 text-primary rounded border-outline-variant"
                        />
                        <span className="font-data-mono text-body-sm font-bold text-primary">{doItem.do_number}</span>
                        <span className="text-body-sm text-on-surface truncate">{doItem.description}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-body-sm text-secondary py-md text-center italic">
                      Semua Surat Jalan (DO) sudah dimasukkan ke dalam Manifest / Berstatus Assigned.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  <span>Terbitkan Manifest</span>
                </button>
              </div>
            </form>

            {/* List Manifests */}
            <div>
              <h4 className="font-label-lg text-label-lg text-on-surface font-bold mb-sm">Daftar Manifest Aktif</h4>
              <div className="space-y-sm">
                {manifests.length > 0 ? (
                  manifests.map((m) => (
                    <div key={m.id} className="p-md bg-surface border border-outline-variant rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
                      <div>
                        <div className="flex items-center gap-sm">
                          <span className="font-data-mono font-bold text-primary">{m.manifest_number}</span>
                          <span className="px-xs py-[2px] rounded text-[11px] font-bold bg-blue-100 text-blue-800 uppercase">{m.status}</span>
                        </div>
                        <p className="text-body-sm text-secondary mt-xs">Kurir: {m.driver?.full_name || 'Assigned Driver'} | {m.notes || 'Rute standar'}</p>
                      </div>
                      <div className="flex items-center gap-md w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-label-sm text-outline block">{m.items?.length || 0} Items DO</span>
                        <button
                          type="button"
                          onClick={() => handlePrintManifest(m)}
                          className="px-md py-xs bg-primary text-on-primary font-label-sm rounded-lg hover:bg-primary-container flex items-center gap-xs text-[12px] shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">print</span>
                          <span>Print Surat Jalan</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-body-md text-secondary py-md text-center">Belum ada Manifest diterbitkan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
