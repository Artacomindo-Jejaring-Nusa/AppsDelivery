import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import api from '../../services/api';
import zteBtsSites from '../../data/zte_bts_sites.json';
import BulkImportDOModal from './BulkImportDOModal';

export default function DeliveryOrdersPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [selectedPOD, setSelectedPOD] = useState(null);
  const [selectedDOForPOD, setSelectedDOForPOD] = useState(null);
  const [showPODModal, setShowPODModal] = useState(false);

  // Batch Selection State
  const [selectedBatchDOIds, setSelectedBatchDOIds] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] = useState('completed');
  const [batchNotes, setBatchNotes] = useState('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Timeline Modal State
  const [selectedDOForTimeline, setSelectedDOForTimeline] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const handleSelectAllBatch = (e) => {
    if (e.target.checked) {
      setSelectedBatchDOIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedBatchDOIds([]);
    }
  };

  const handleToggleSelectBatch = (id) => {
    setSelectedBatchDOIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openBatchModal = (status) => {
    setBatchTargetStatus(status);
    setBatchNotes('');
    setShowBatchModal(true);
  };

  const handleBatchUpdateSubmit = async (e) => {
    e.preventDefault();
    if (selectedBatchDOIds.length === 0) return;
    setIsSubmittingBatch(true);
    try {
      const res = await api.put('/delivery-orders/batch-status', {
        ids: selectedBatchDOIds,
        status: batchTargetStatus,
        notes: batchNotes || `Batch update status ke ${batchTargetStatus}`,
      });
      alert(`Berhasil memperbarui ${res.data.data?.updated_count || selectedBatchDOIds.length} Delivery Order ke status "${batchTargetStatus.toUpperCase()}"`);
      setShowBatchModal(false);
      setSelectedBatchDOIds([]);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal melakukan batch update status.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const parsePODNotes = (notesStr) => {
    if (!notesStr) return null;
    
    // Check if it's a POD notes string
    const receivedByMatch = notesStr.match(/Received by:\s*([^.]+)/i);
    const notesMatch = notesStr.match(/notes:\s*([^.[]+)/i);
    const barcodeMatch = notesStr.match(/Barcode:\s*([^.\s[]+)/i);
    const photoMatch = notesStr.match(/\[Proof of Delivery Photo:\s*([^\]]+)\]/i);
    const recSigMatch = notesStr.match(/\[Receiver Signature:\s*([^\]]+)\]/i);
    const drvSigMatch = notesStr.match(/\[Driver Signature:\s*([^\]]+)\]/i);
    
    if (receivedByMatch || notesMatch || photoMatch) {
      return {
        receivedBy: receivedByMatch ? receivedByMatch[1].trim() : 'Penerima',
        notes: notesMatch ? notesMatch[1].trim() : '-',
        barcode: barcodeMatch ? barcodeMatch[1].trim() : '-',
        photoUrl: photoMatch ? photoMatch[1].trim() : null,
        receiverSignatureUrl: recSigMatch ? recSigMatch[1].trim() : null,
        driverSignatureUrl: drvSigMatch ? drvSigMatch[1].trim() : null,
        raw: notesStr
      };
    }
    return null;
  };

  const getPODFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:image')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (url.includes('/uploads/')) {
        return url.substring(url.indexOf('/uploads/'));
      }
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return cleanUrl;
  };

  const handlePrintPOD = async (item, podData) => {
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(podData.barcode || item.do_number, {
        width: 150,
        margin: 1,
      });
    } catch (err) {
      console.error('Failed to generate QR code for POD print:', err);
    }

    const rawBarcode = podData.barcode || item.do_number;
    let line1 = rawBarcode;
    let line2 = '';
    if (rawBarcode.length > 20) {
      line1 = rawBarcode.substring(0, 20);
      line2 = rawBarcode.substring(20);
    }

    const foundManifest = manifests.find(m => 
      m.items && m.items.some(mit => mit.delivery_order_id === item.id)
    );
    const driverName = foundManifest && foundManifest.driver ? foundManifest.driver.full_name : 'Dedi';

    const slaClass = item.sla_status === 'red' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : item.sla_status === 'yellow' 
      ? 'bg-amber-100 text-amber-800 border-amber-200' 
      : 'bg-green-100 text-green-800 border-green-200';
    const slaText = item.sla_status === 'red' ? 'Red' : item.sla_status === 'yellow' ? 'Yellow' : 'Green';

    const statusClass = item.status === 'delivered' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';

    const recSigImg = podData?.receiverSignatureUrl 
      ? `<img class="max-h-12 max-w-full object-contain" src="${getPODFileUrl(podData.receiverSignatureUrl)}" />`
      : '<div class="text-[10px] text-gray-300 italic">Belum Tanda Tangan</div>';

    const drvSigImg = podData?.driverSignatureUrl 
      ? `<img class="max-h-12 max-w-full object-contain" src="${getPODFileUrl(podData.driverSignatureUrl)}" />`
      : '<div class="text-[10px] text-gray-300 italic">Belum Tanda Tangan</div>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html class="light" lang="id">
        <head>
          <meta charset="utf-8">
          <meta content="width=device-width, initial-scale=1.0" name="viewport">
          <title>Digital Proof of Delivery - ${item?.do_number || ''}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
          <script id="tailwind-config">
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  "colors": {
                      "inverse-primary": "#b6c4ff",
                      "surface-dim": "#d8dadc",
                      "on-secondary-container": "#54647a",
                      "error-container": "#ffdad6",
                      "surface-container-low": "#f2f4f6",
                      "outline": "#757682",
                      "primary-fixed": "#dce1ff",
                      "surface-container-lowest": "#ffffff",
                      "surface-container-high": "#e6e8ea",
                      "on-primary-container": "#90a8ff",
                      "surface-container": "#eceef0",
                      "primary-container": "#1e3a8a",
                      "inverse-surface": "#2d3133",
                      "secondary": "#505f76",
                      "primary": "#00236f",
                      "on-tertiary-fixed-variant": "#3f465c",
                      "on-tertiary-fixed": "#131b2e",
                      "on-error": "#ffffff",
                      "on-tertiary-container": "#a4acc5",
                      "on-background": "#191c1e",
                      "on-surface-variant": "#444651",
                      "on-primary-fixed": "#00164e",
                      "outline-variant": "#c5c5d3",
                      "on-secondary": "#ffffff",
                      "inverse-on-surface": "#eff1f3",
                      "background": "#f7f9fb",
                      "on-secondary-fixed": "#0b1c30",
                      "surface-container-highest": "#e0e3e5",
                      "surface-variant": "#e0e3e5",
                      "on-primary": "#ffffff",
                      "on-error-container": "#93000a",
                      "surface-bright": "#f7f9fb",
                      "surface-tint": "#4059aa",
                      "error": "#ba1a1a",
                      "surface": "#f7f9fb",
                      "tertiary-fixed-dim": "#bec6e0",
                      "secondary-fixed-dim": "#b7c8e1",
                      "tertiary-fixed": "#dae2fd",
                      "secondary-container": "#d0e1fb",
                      "tertiary-container": "#384055",
                      "secondary-fixed": "#d3e4fe",
                      "primary-fixed-dim": "#b6c4ff",
                      "on-tertiary": "#ffffff",
                      "on-surface": "#191c1e",
                      "on-secondary-fixed-variant": "#38485d",
                      "tertiary": "#222a3e",
                      "on-primary-fixed-variant": "#264191"
                  },
                  "borderRadius": {
                      "DEFAULT": "0.125rem",
                      "lg": "0.25rem",
                      "xl": "0.5rem",
                      "full": "0.75rem"
                  },
                  "spacing": {
                      "lg": "24px",
                      "base": "4px",
                      "xs": "4px",
                      "margin": "24px",
                      "gutter": "16px",
                      "sm": "8px",
                      "xl": "32px",
                      "md": "16px"
                  },
                  "fontFamily": {
                      "body-sm": ["Inter"],
                      "headline-sm": ["Inter"],
                      "headline-lg": ["Inter"],
                      "headline-md": ["Inter"],
                      "label-sm": ["Inter"],
                      "data-mono": ["JetBrains Mono"],
                      "body-lg": ["Inter"],
                      "label-md": ["Inter"],
                      "body-md": ["Inter"]
                  },
                  "fontSize": {
                      "body-sm": ["11px", {"lineHeight": "16px", "fontWeight": "400"}],
                      "headline-sm": ["18px", {"lineHeight": "24px", "fontWeight": "600"}],
                      "headline-lg": ["24px", {"lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                      "headline-md": ["20px", {"lineHeight": "26px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
                      "label-sm": ["10px", {"lineHeight": "12px", "fontWeight": "500"}],
                      "data-mono": ["12px", {"lineHeight": "18px", "fontWeight": "400"}],
                      "body-lg": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                      "label-md": ["11px", {"lineHeight": "14px", "fontWeight": "600"}],
                      "body-md": ["13px", {"lineHeight": "18px", "fontWeight": "400"}]
                  }
                },
              },
            }
          </script>
          <style>
            @page {
                size: A4 portrait;
                margin: 0;
            }
            .a4-container {
                width: 210mm;
                height: 297mm;
                max-height: 297mm;
                margin: 20px auto;
                background: #ffffff;
                box-shadow: 0 0 20px rgba(0,0,0,0.05);
                padding: 15mm 20mm;
                position: relative;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            @media print {
                body { background: none; margin: 0; padding: 0; }
                .a4-container { margin: 0; box-shadow: none; border: none; height: 297mm; max-height: 297mm; }
                .no-print { display: none; }
            }
            .material-symbols-outlined {
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }
            .data-dotted-border {
                border-bottom: 1px dotted #E2E8F0;
            }
          </style>
        </head>
        <body class="bg-surface-container-lowest font-body-md text-on-surface">
          <header class="fixed top-0 w-full z-50 flex justify-between items-center px-margin h-16 bg-surface dark:bg-on-background border-b border-outline-variant no-print">
            <div class="font-headline-md text-headline-md font-bold text-primary">Merkurius Delivery</div>
            <div class="flex gap-md">
              <button class="flex items-center gap-xs bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:opacity-90 transition-all" onclick="window.print()">
                <span class="material-symbols-outlined">print</span>
                PRINT POD
              </button>
            </div>
          </header>

          <main class="pt-20 pb-20">
            <article class="a4-container border border-outline-variant flex flex-col justify-between">
              <div>
                <!-- 1. Header Branding -->
                <div class="flex justify-between items-start border-b-2 border-primary-container pb-sm mb-sm">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-sm">
                      <span class="font-headline-sm text-headline-sm font-extrabold text-primary tracking-tight">Merkurius Delivery</span>
                    </div>
                    <p class="font-label-sm text-label-sm uppercase tracking-widest text-secondary mt-xs">Logistics & Supply Chain Operations Center</p>
                  </div>
                  <div class="text-right">
                    <p class="font-label-md text-label-md font-bold text-primary tracking-tighter">SISTEM INTEGRASI DIGITAL</p>
                    <p class="font-data-mono text-data-mono text-on-surface-variant mt-xs">Ref: ${item?.do_number || ''}</p>
                  </div>
                </div>

                <!-- 2. Title Section -->
                <div class="mb-sm">
                  <div class="border-2 border-primary-container bg-surface-container-lowest p-sm text-center rounded-DEFAULT">
                    <h1 class="font-headline-sm text-headline-sm font-extrabold text-primary tracking-tight">BUKTI PENERIMAAN BARANG DIGITAL (POD)</h1>
                    <div class="mt-xs flex justify-center items-center gap-xs">
                      <span class="font-label-md text-label-md uppercase text-secondary">DO NUMBER:</span>
                      <span class="font-data-mono text-headline-sm font-bold text-primary tracking-widest">${item?.do_number || ''}</span>
                    </div>
                  </div>
                </div>

                <!-- 3. Information Grid -->
                <div class="grid grid-cols-2 gap-md mb-sm">
                  <!-- Left Column -->
                  <div class="border border-outline-variant rounded-lg p-sm bg-surface-container-low">
                    <h2 class="font-label-md text-label-md font-bold text-primary uppercase border-b border-outline-variant pb-xs mb-xs">Informasi Surat Jalan (DO)</h2>
                    <div class="space-y-xs">
                      <div class="flex justify-between items-center data-dotted-border pb-xs">
                        <span class="font-body-sm text-body-sm text-secondary">No. Surat Jalan</span>
                        <span class="font-data-mono text-data-mono font-medium">${item?.do_number || ''}</span>
                      </div>
                      <div class="flex justify-between items-start data-dotted-border pb-xs">
                        <span class="font-body-sm text-body-sm text-secondary shrink-0">Site BTS Tujuan</span>
                        <span class="font-body-sm text-body-sm text-right font-semibold">${item?.bts_site?.site_id || 'Site BTS'} - ${item?.bts_site?.site_name || item?.destination_address || ''}</span>
                      </div>
                      <div class="flex justify-between items-start data-dotted-border pb-xs">
                        <span class="font-body-sm text-body-sm text-secondary shrink-0">Material</span>
                        <span class="font-body-sm text-body-sm text-right font-medium">${item?.description || ''}</span>
                      </div>
                      <div class="flex justify-between items-center pt-xs">
                        <span class="font-body-sm text-body-sm text-secondary">Status SLA</span>
                        <span class="px-md py-xs ${slaClass} text-label-sm font-bold rounded-full border uppercase tracking-wider">${slaText}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Right Column -->
                  <div class="border border-outline-variant rounded-lg p-sm bg-surface-container-low">
                    <h2 class="font-label-md text-label-md font-bold text-primary uppercase border-b border-outline-variant pb-xs mb-xs">Detail Penerima (POD)</h2>
                    <div class="space-y-xs">
                      <div class="flex justify-between items-center data-dotted-border pb-xs">
                        <span class="font-body-sm text-body-sm text-secondary">Nama Penerima</span>
                        <span class="font-body-sm text-body-sm font-semibold">${podData?.receivedBy || ''}</span>
                      </div>
                      <div class="flex justify-between items-center data-dotted-border pb-xs">
                        <span class="font-body-sm text-body-sm text-secondary">Catatan Terima</span>
                        <span class="font-body-sm text-body-sm italic">${podData?.notes || 'Sudah di terima'}</span>
                      </div>
                      <div class="flex justify-between items-center data-dotted-border pb-xs">
                        <span class="font-body-sm text-body-sm text-secondary">Tanggal Selesai</span>
                        <span class="font-data-mono text-data-mono">${item?.updated_at ? new Date(item.updated_at).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}</span>
                      </div>
                      <div class="flex justify-between items-center pt-xs">
                        <span class="font-body-sm text-body-sm text-secondary">Status DO</span>
                        <span class="px-md py-xs ${statusClass} font-bold text-label-sm rounded-full border uppercase tracking-wider">${item?.status || ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 4. Validation Section -->
                <div class="border border-outline-variant rounded-lg p-sm mb-sm">
                  <h2 class="font-label-md text-label-md font-bold text-primary uppercase border-b border-outline-variant pb-xs mb-xs">Dokumentasi & Scan Validasi</h2>
                  <div class="grid grid-cols-4 gap-md">
                    <!-- Photo Grid Item -->
                    <div class="col-span-3 border border-outline-variant rounded p-xs bg-surface-container">
                      <div class="w-full h-44 overflow-hidden rounded bg-white relative group">
                        ${podData?.photoUrl 
                          ? `<img class="w-full h-full object-cover" src="${getPODFileUrl(podData.photoUrl)}" />` 
                          : '<div class="w-full h-full flex items-center justify-center bg-surface-container text-secondary italic">Foto/Tanda Tangan Bukti Penerimaan Digital</div>'
                        }
                        <div class="absolute bottom-0 left-0 w-full p-xs bg-black/50 text-white font-label-sm text-center opacity-85 backdrop-blur-xs">Asset Verification Scan - Timestamp: ${item?.updated_at ? new Date(item.updated_at).toISOString().replace('T', ' ').slice(0, 19) : new Date().toISOString().replace('T', ' ').slice(0, 19)}</div>
                      </div>
                    </div>

                    <!-- QR Code Grid Item -->
                    <div class="col-span-1 flex flex-col items-center justify-center border border-outline-variant rounded p-xs bg-white">
                      <div class="w-full aspect-square border border-outline-variant p-xs mb-xs bg-white">
                        ${qrCodeDataUrl ? `<img class="w-full h-full object-contain" src="${qrCodeDataUrl}" />` : ''}
                      </div>
                      <div class="text-center w-full overflow-hidden">
                        <p class="font-data-mono text-[9px] leading-tight text-primary font-bold break-all">${line1}</p>
                        ${line2 ? `<p class="font-data-mono text-[8px] text-secondary break-all mt-[1px]">${line2}</p>` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Signatures Row -->
                <div class="grid grid-cols-2 gap-lg mt-sm pt-xs border-t border-dashed border-outline-variant">
                  <div class="flex flex-col items-center justify-end h-24">
                    <p class="font-label-md text-label-md font-bold text-primary uppercase mb-xs">Penerima (Recipient)</p>
                    <div class="h-10 w-28 flex items-center justify-center overflow-hidden mb-xs bg-gray-50 border border-gray-100 rounded">
                      ${recSigImg}
                    </div>
                    <div class="w-36 border-b border-outline mb-xs"></div>
                    <p class="font-body-sm text-[10px] text-secondary">( ${podData?.receivedBy || 'Nama Terang'} )</p>
                  </div>
                  <div class="flex flex-col items-center justify-end h-24">
                    <p class="font-label-md text-label-md font-bold text-primary uppercase mb-xs">Kurir (Courier)</p>
                    <div class="h-10 w-28 flex items-center justify-center overflow-hidden mb-xs bg-gray-50 border border-gray-100 rounded">
                      ${drvSigImg}
                    </div>
                    <div class="w-36 border-b border-outline mb-xs"></div>
                    <p class="font-body-sm text-[10px] text-secondary">( ${driverName.toUpperCase()} )</p>
                  </div>
                </div>
              </div>

              <!-- 5. Footer -->
              <div class="pt-sm border-t border-outline-variant text-center mt-auto">
                <p class="font-body-sm text-[9px] text-secondary leading-relaxed max-w-2xl mx-auto italic">
                  Dokumen ini diterbitkan secara otomatis dan sah sebagai bukti serah terima barang digital yang tervalidasi menggunakan scan barcode. 
                  Seluruh data yang tercantum dalam dokumen ini merupakan representasi valid dari sistem manajemen aset Merkurius Delivery
                </p>
                <div class="flex justify-between items-end mt-sm">
                  <p class="font-label-sm text-label-sm font-bold text-primary uppercase">Sistem Tracking Logistik Merkurius Delivery</p>
                  <div class="text-right">
                    <p class="font-data-mono text-[9px] text-secondary">PAGE 1 OF 1</p>
                    <p class="font-data-mono text-[9px] text-secondary">${new Date().toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </article>
          </main>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintBAST = async (item) => {
    let assets = [];
    try {
      const res = await api.get(`/delivery-orders/${item.id}/assets`);
      assets = res.data.data || [];
    } catch (err) {
      console.error('Failed to fetch dismantle assets for BAST:', err);
    }

    const podData = parsePODNotes(item.notes) || {
      receivedBy: 'Ericsson WH Agent',
      notes: 'Handover complete',
      receiverSignatureUrl: null,
      driverSignatureUrl: null,
      photoUrl: null
    };

    const isInbound = item.type === 'inbound' || (!item.type && !item.notes?.toLowerCase().includes('dismantle') && !item.description?.toLowerCase().includes('dismantle'));
    const docTitle = isInbound 
      ? 'SURAT JALAN PENGIRIMAN MATERIAL (INBOUND LOGISTICS)'
      : 'BERITA ACARA SERAH TERIMA (BAST) DISMANTLE (OUTBOUND LOGISTICS)';
    const docBadge = isInbound
      ? '<span style="background:#00236f;color:white;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:bold;margin-left:8px;">INBOUND LOGISTICS</span>'
      : '<span style="background:#d97706;color:white;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:bold;margin-left:8px;">OUTBOUND / DISMANTLE LOGISTICS</span>';
    const docDescription = isInbound
      ? `Pada hari ini, tanggal ${new Date(item.created_at || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, telah dilaksanakan pengiriman material/perangkat unit baru dari Gudang Utama Ericsson ke Site BTS Ericsson oleh pihak-pihak di bawah ini:`
      : `Pada hari ini, tanggal ${new Date(item.updated_at || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, telah dilakukan serah terima barang pembongkaran (dismantle) dari Site BTS via Gudang Temporer AKS ke Gudang Utama Ericsson oleh pihak-pihak di bawah ini:`;

    const foundManifest = manifests.find(m => 
      m.items && m.items.some(mit => mit.delivery_order_id === item.id)
    );
    const driverName = foundManifest && foundManifest.driver ? foundManifest.driver.full_name : 'Dedi';
    const vehiclePlate = foundManifest && foundManifest.driver ? foundManifest.driver.vehicle_plate : 'Armada AKS';
    const manifestNum = foundManifest ? foundManifest.manifest_number : '-';

    const mainManifestQR = await generateQRDataUrl(manifestNum);

    const assetsHtml = assets.length > 0
      ? assets.map((asset, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${asset.category || 'Network Equipment'}</td>
            <td>${asset.item_name || 'ZTE BBU/RRU unit'}</td>
            <td style="font-family:monospace;font-weight:bold;color:#00236f;">${asset.serial_number || '-'}</td>
            <td style="text-align:center;">${asset.quantity || 1} ${asset.unit || 'pcs'}</td>
            <td style="text-align:center;text-transform:uppercase;font-weight:bold;color:${asset.condition === 'good' ? '#047857' : '#b91c1c'};">
              ${asset.condition || 'good'}
            </td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" style="text-align:center;color:#64748b;font-style:italic;">Tidak ada detail asset ${isInbound ? 'material' : 'dismantle'} terdaftar</td></tr>`;

    const recSigImg = podData?.receiverSignatureUrl 
      ? `<img class="max-h-12 max-w-full object-contain" src="${getPODFileUrl(podData.receiverSignatureUrl)}" />`
      : '<div class="text-[10px] text-gray-300 italic">Belum Tanda Tangan</div>';

    const drvSigImg = podData?.driverSignatureUrl 
      ? `<img class="max-h-12 max-w-full object-contain" src="${getPODFileUrl(podData.driverSignatureUrl)}" />`
      : '<div class="text-[10px] text-gray-300 italic">Belum Tanda Tangan</div>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html class="light" lang="id">
        <head>
          <meta charset="utf-8">
          <meta content="width=device-width, initial-scale=1.0" name="viewport">
          <title>${isInbound ? 'Surat Jalan Inbound' : 'BAST Dismantle Outbound'} - ${item?.do_number || ''}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
          <script id="tailwind-config">
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  "colors": {
                      "inverse-primary": "#b6c4ff",
                      "surface-dim": "#d8dadc",
                      "on-secondary-container": "#54647a",
                      "error-container": "#ffdad6",
                      "surface-container-low": "#f2f4f6",
                      "outline": "#757682",
                      "primary-fixed": "#dce1ff",
                      "surface-container-lowest": "#ffffff",
                      "surface-container-high": "#e6e8ea",
                      "on-primary-container": "#90a8ff",
                      "surface-container": "#eceef0",
                      "primary-container": "#1e3a8a",
                      "inverse-surface": "#2d3133",
                      "secondary": "#505f76",
                      "primary": "#00236f",
                      "on-tertiary-fixed-variant": "#3f465c",
                      "on-tertiary-fixed": "#131b2e",
                      "on-error": "#ffffff",
                      "on-tertiary-container": "#a4acc5",
                      "on-background": "#191c1e",
                      "on-surface-variant": "#444651",
                      "on-primary-fixed": "#00164e",
                      "outline-variant": "#c5c5d3",
                      "on-secondary": "#ffffff",
                      "inverse-on-surface": "#eff1f3",
                      "background": "#f7f9fb",
                      "on-secondary-fixed": "#0b1c30",
                      "surface-container-highest": "#e0e3e5",
                      "surface-variant": "#e0e3e5",
                      "on-primary": "#ffffff",
                      "on-error-container": "#93000a",
                      "surface-bright": "#f7f9fb",
                      "surface-tint": "#4059aa",
                      "error": "#ba1a1a",
                      "surface": "#f7f9fb",
                      "tertiary-fixed-dim": "#bec6e0",
                      "secondary-fixed-dim": "#b7c8e1",
                      "tertiary-fixed": "#dae2fd",
                      "secondary-container": "#d0e1fb",
                      "tertiary-container": "#384055",
                      "secondary-fixed": "#d3e4fe",
                      "primary-fixed-dim": "#b6c4ff",
                      "on-tertiary": "#ffffff",
                      "on-surface": "#191c1e",
                      "on-secondary-fixed-variant": "#38485d",
                      "tertiary": "#222a3e",
                      "on-primary-fixed-variant": "#264191"
                  },
                  "borderRadius": {
                      "DEFAULT": "0.125rem",
                      "lg": "0.25rem",
                      "xl": "0.5rem",
                      "full": "0.75rem"
                  },
                  "spacing": {
                      "lg": "24px",
                      "base": "4px",
                      "xs": "4px",
                      "margin": "24px",
                      "gutter": "16px",
                      "sm": "8px",
                      "xl": "32px",
                      "md": "16px"
                  },
                  "fontFamily": {
                      "body-sm": ["Inter"],
                      "headline-sm": ["Inter"],
                      "headline-lg": ["Inter"],
                      "headline-md": ["Inter"],
                      "label-sm": ["Inter"],
                      "data-mono": ["JetBrains Mono"],
                      "body-lg": ["Inter"],
                      "label-md": ["Inter"],
                      "body-md": ["Inter"]
                  },
                  "fontSize": {
                      "body-sm": ["11px", {"lineHeight": "16px", "fontWeight": "400"}],
                      "headline-sm": ["18px", {"lineHeight": "24px", "fontWeight": "600"}],
                      "headline-lg": ["24px", {"lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                      "headline-md": ["20px", {"lineHeight": "26px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
                      "label-sm": ["10px", {"lineHeight": "12px", "fontWeight": "500"}],
                      "data-mono": ["12px", {"lineHeight": "18px", "fontWeight": "400"}],
                      "body-lg": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                      "label-md": ["11px", {"lineHeight": "14px", "fontWeight": "600"}],
                      "body-md": ["13px", {"lineHeight": "18px", "fontWeight": "400"}]
                  }
                },
              },
            }
          </script>
          <style>
            @page {
                size: A4 portrait;
                margin: 0;
            }
            .a4-container {
                width: 210mm;
                height: 297mm;
                max-height: 297mm;
                margin: 20px auto;
                background: #ffffff;
                box-shadow: 0 0 20px rgba(0,0,0,0.05);
                padding: 15mm 20mm;
                position: relative;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            @media print {
                body { background: none; margin: 0; padding: 0; }
                .a4-container { margin: 0; box-shadow: none; border: none; height: 297mm; max-height: 297mm; }
                .no-print { display: none; }
            }
            .material-symbols-outlined {
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }
            .data-dotted-border {
                border-bottom: 1px dotted #E2E8F0;
            }
            table.items-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            table.items-table th { background: #00236f; color: white; padding: 5px 8px; font-size: 8.5pt; text-align: left; border: 1px solid #00236f; text-transform: uppercase; }
            table.items-table td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 8.5pt; vertical-align: middle; }
          </style>
        </head>
        <body class="bg-surface-container-lowest font-body-md text-on-surface">
          <header class="fixed top-0 w-full z-50 flex justify-between items-center px-margin h-16 bg-surface dark:bg-on-background border-b border-outline-variant no-print">
            <div class="font-headline-md text-headline-md font-bold text-primary">Merkurius Delivery</div>
            <div class="flex gap-md">
              <button class="flex items-center gap-xs bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:opacity-90 transition-all" onclick="window.print()">
                <span class="material-symbols-outlined">print</span>
                PRINT DOKUMEN ${isInbound ? 'INBOUND' : 'OUTBOUND'}
              </button>
            </div>
          </header>

          <main class="pt-20 pb-20">
            <article class="a4-container border border-outline-variant flex flex-col justify-between">
              <div>
                <!-- 1. Header Branding -->
                <div class="flex justify-between items-start border-b-2 border-primary-container pb-sm mb-sm">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-sm">
                      <span class="font-headline-sm text-headline-sm font-extrabold text-primary tracking-tight">Merkurius Delivery</span>
                    </div>
                    <p class="font-label-sm text-label-sm uppercase tracking-widest text-secondary mt-xs">Logistics & Supply Chain Operations Center</p>
                  </div>
                  <div class="text-right">
                    <p class="font-label-md text-label-md font-bold text-primary tracking-tighter">${isInbound ? 'SURAT JALAN PENGIRIMAN' : 'BERITA ACARA SERAH TERIMA'}</p>
                    <p class="font-data-mono text-data-mono text-on-surface-variant mt-xs">Ref: ${isInbound ? 'SJ' : 'BAST'}-${item?.do_number || ''}</p>
                  </div>
                </div>

                <!-- 2. Title Section -->
                <div class="mb-sm">
                  <div class="border-2 border-primary-container bg-surface-container-lowest p-sm text-center rounded-DEFAULT">
                    <h1 class="font-headline-sm text-headline-sm font-extrabold text-primary tracking-tight flex items-center justify-center gap-2">
                      <span>${docTitle}</span>
                      ${docBadge}
                    </h1>
                    <div class="mt-xs flex justify-center items-center gap-xs">
                      <span class="font-label-md text-label-md uppercase text-secondary">MANIFEST NO:</span>
                      <span class="font-data-mono text-headline-sm font-bold text-primary tracking-widest">${manifestNum}</span>
                    </div>
                  </div>
                </div>

                <!-- Pihak Info -->
                <div class="border border-outline-variant rounded-lg p-sm bg-surface-container-low mb-sm text-[12px] leading-relaxed">
                  <p class="font-semibold text-primary mb-xs">${docDescription}</p>
                  <table class="w-full">
                    <tr>
                      <td class="font-medium text-secondary w-36">PIHAK PERTAMA (Pemberi):</td>
                      <td class="font-bold text-primary">${driverName.toUpperCase()} (Kurir PT AKS - ${vehiclePlate})</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-secondary">PIHAK KEDUA (Penerima):</td>
                      <td class="font-bold text-primary">${podData.receivedBy.toUpperCase()} (${isInbound ? 'Penerima Site BTS Ericsson' : 'Warehouse Agent Ericsson'})</td>
                    </tr>
                  </table>
                </div>

                <!-- 3. Assets list Table -->
                <div class="mb-sm">
                  <h2 class="font-label-md text-label-md font-bold text-primary uppercase mb-xs">Daftar Material / Perangkat Dismantle (ZTE)</h2>
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th style="width: 5%; text-align:center;">No</th>
                        <th style="width: 25%;">Kategori</th>
                        <th style="width: 30%;">Nama Barang</th>
                        <th style="width: 25%;">Serial Number (S/N)</th>
                        <th style="width: 15%; text-align:center;">Qty</th>
                        <th style="width: 10%; text-align:center;">Kondisi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assetsHtml}
                    </tbody>
                  </table>
                </div>

                <!-- 4. Validation Section -->
                <div class="border border-outline-variant rounded-lg p-xs mb-sm">
                  <div class="grid grid-cols-4 gap-md">
                    <!-- Photo Grid Item -->
                    <div class="col-span-3 border border-outline-variant rounded p-xs bg-surface-container">
                      <div class="w-full h-36 overflow-hidden rounded bg-white relative">
                        ${podData?.photoUrl 
                          ? `<img class="w-full h-full object-cover" src="${getPODFileUrl(podData.photoUrl)}" />` 
                          : '<div class="w-full h-full flex items-center justify-center bg-surface-container text-secondary italic">Foto/Tanda Tangan Bukti Penerimaan Digital</div>'
                        }
                        <div class="absolute bottom-0 left-0 w-full p-xs bg-black/50 text-white font-label-sm text-center opacity-85 backdrop-blur-xs">Asset Verification Scan - Timestamp: ${item?.updated_at ? new Date(item.updated_at).toISOString().replace('T', ' ').slice(0, 19) : new Date().toISOString().replace('T', ' ').slice(0, 19)}</div>
                      </div>
                    </div>

                    <!-- QR Code Grid Item -->
                    <div class="col-span-1 flex flex-col items-center justify-center border border-outline-variant rounded p-xs bg-white">
                      <div class="w-full aspect-square border border-outline-variant p-xs mb-xs bg-white">
                        ${mainManifestQR ? `<img class="w-full h-full object-contain" src="${mainManifestQR}" />` : ''}
                      </div>
                      <div class="text-center w-full overflow-hidden">
                        <p class="font-data-mono text-[8px] leading-tight text-primary font-bold break-all">${item?.do_number}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Signatures Row -->
                <div class="grid grid-cols-2 gap-lg mt-sm pt-xs border-t border-dashed border-outline-variant">
                  <div class="flex flex-col items-center justify-end h-24">
                    <p class="font-label-md text-label-md font-bold text-primary uppercase mb-xs">Pihak Kedua (WH Ericsson)</p>
                    <div class="h-10 w-28 flex items-center justify-center overflow-hidden mb-xs bg-gray-50 border border-gray-100 rounded">
                      ${recSigImg}
                    </div>
                    <div class="w-36 border-b border-outline mb-xs"></div>
                    <p class="font-body-sm text-[10px] text-secondary">( ${podData?.receivedBy || 'Nama Terang'} )</p>
                  </div>
                  <div class="flex flex-col items-center justify-end h-24">
                    <p class="font-label-md text-label-md font-bold text-primary uppercase mb-xs">Pihak Pertama (AKS/Courier)</p>
                    <div class="h-10 w-28 flex items-center justify-center overflow-hidden mb-xs bg-gray-50 border border-gray-100 rounded">
                      ${drvSigImg}
                    </div>
                    <div class="w-36 border-b border-outline mb-xs"></div>
                    <p class="font-body-sm text-[10px] text-secondary">( ${driverName.toUpperCase()} )</p>
                  </div>
                </div>
              </div>

              <!-- 5. Footer -->
              <div class="pt-sm border-t border-outline-variant text-center mt-auto">
                <p class="font-body-sm text-[9px] text-secondary leading-relaxed max-w-2xl mx-auto italic">
                  Dokumen Berita Acara Serah Terima (BAST) ini diterbitkan secara otomatis dan sah sebagai bukti serah terima barang digital yang tervalidasi menggunakan scan barcode serial number.
                  Seluruh data yang tercantum merupakan representasi valid dari sistem manajemen aset Merkurius Delivery.
                </p>
                <div class="flex justify-between items-end mt-sm">
                  <p class="font-label-sm text-label-sm font-bold text-primary uppercase">Sistem Reverse Logistik Merkurius Delivery</p>
                  <div class="text-right">
                    <p class="font-data-mono text-[9px] text-secondary">PAGE 1 OF 1</p>
                    <p class="font-data-mono text-[9px] text-secondary">${new Date().toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </article>
          </main>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filters for DO list
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal !== null) {
      setSearch(searchVal);
    }
  }, [searchParams]);
  const [slaFilter, setSlaFilter] = useState('');

  // New DO Form State
  const [formData, setFormData] = useState({
    do_number: '',
    bts_site_id: '',
    description: '',
    sla_days: 3,
    origin_address: 'Gudang Utama Ericsson (Banjarmasin)',
    destination_address: 'Site BTS Telkomsel Kalimantan',
    notes: '',
  });

  const [btsSitesList, setBtsSitesList] = useState([]);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');

  // Active Inbound Scan Session State
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'scan'
  const [selectedDO, setSelectedDO] = useState(null);
  const [scanRows, setScanRows] = useState([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [isFetchingBarcodes, setIsFetchingBarcodes] = useState(null); // stores DO id while loading
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifests, setManifests] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDOIds, setSelectedDOIds] = useState([]);
  const [manifestNotes, setManifestNotes] = useState('');

  const tableEndRef = useRef(null);

  useEffect(() => {
    fetchOrders();
    fetchBtsSites();
    fetchManifestsAndDrivers();
  }, [slaFilter]);

  const fetchBtsSites = async (searchVal = '') => {
    try {
      const res = await api.get(`/bts-sites?per_page=100&search=${encodeURIComponent(searchVal)}`);
      const data = res.data.data;
      if (data && data.length > 0) {
        setBtsSitesList(data);
      } else {
        const localFiltered = zteBtsSites.filter(s => 
          s.site_id.toLowerCase().includes(searchVal.toLowerCase()) || 
          s.site_name.toLowerCase().includes(searchVal.toLowerCase()) ||
          s.city.toLowerCase().includes(searchVal.toLowerCase())
        );
        setBtsSitesList(localFiltered.slice(0, 300));
      }
    } catch (err) {
      console.error('Failed to fetch BTS Sites:', err);
      const localFiltered = zteBtsSites.filter(s => 
        s.site_id.toLowerCase().includes(searchVal.toLowerCase()) || 
        s.site_name.toLowerCase().includes(searchVal.toLowerCase()) ||
        s.city.toLowerCase().includes(searchVal.toLowerCase())
      );
      setBtsSitesList(localFiltered.slice(0, 300));
    }
  };

  const handleSiteSearchChange = (val) => {
    setSiteSearchQuery(val);
    fetchBtsSites(val);
  };

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
        api.get('/drivers?available=true'),
      ]);
      setManifests(mRes.data.data || []);
      setDriversList(dRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch manifests/drivers', err);
    }
  };

  const generateAutoDONumber = (existingOrders = []) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `DO-${year}-${month}-`;
    
    let maxSeq = 0;
    existingOrders.forEach(o => {
      if (o.do_number && o.do_number.startsWith(prefix)) {
        const parts = o.do_number.split('-');
        const seqNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });

    if (maxSeq === 0) {
      maxSeq = existingOrders.length;
    }
    
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  };

  const handlePrintManifest = async (manifest) => {
    let manifestData = manifest;
    try {
      const res = await api.get(`/manifests/${manifest.id}`);
      if (res.data?.data) {
        manifestData = res.data.data;
      }
    } catch (err) {
      console.warn('Using cached manifest data:', err);
    }

    const driverName = manifestData.driver?.full_name || 'Assigned Driver';
    const vehiclePlate = manifestData.driver?.vehicle_plate || 'Semua Armada';
    const vehicleType = manifestData.driver?.vehicle_type || 'Box Truck';
    const items = manifestData.items || [];

    // Generate main Manifest QR Code data URL
    const mainManifestQR = await generateQRDataUrl(manifestData.manifest_number);

    // Generate QR Code data URLs for each attached DO item
    const itemQRs = await Promise.all(
      items.map(async (item) => {
        const doData = item.delivery_order || item;
        const doNum = doData.do_number || item.do_number || '-';
        const qrUrl = await generateQRDataUrl(doNum);
        return { ...doData, qrUrl, doNum };
      })
    );

    const itemsHtml = itemQRs.length > 0
      ? itemQRs.map((doData, idx) => {
          return `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td style="font-family:monospace;font-weight:bold;color:#00236f;white-space:nowrap;">
                ${doData.doNum}
              </td>
              <td style="text-align:center;">
                ${doData.qrUrl ? `<img src="${doData.qrUrl}" style="width:55px;height:55px;object-fit:contain;display:block;margin:0 auto;" />` : '-'}
              </td>
              <td>${doData.description || 'Material Logistics'}</td>
              <td>${doData.origin_address || 'Warehouse Hub'}</td>
              <td>${doData.destination_address || 'BTS Site'}</td>
              <td style="text-align:center;font-weight:bold;color:#00236f;">${doData.sla_status || 'Green'}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="7" style="text-align:center;color:#64748b;">DO item details attached in manifest document</td></tr>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Surat Jalan & Manifest - ${manifest.manifest_number}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; color: #0f172a; padding: 5px; }
            .header-table { width: 100%; border-bottom: 2px solid #00236f; padding-bottom: 10px; margin-bottom: 12px; }
            .logo-title { color: #00236f; font-size: 15pt; font-weight: bold; margin: 0; }
            .logo-sub { font-size: 8.5pt; color: #64748b; font-weight: bold; letter-spacing: 0.5px; }
            .doc-header-box { display: flex; align-items: center; justify-content: space-between; border: 1.5px solid #00236f; background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 15px; }
            .doc-title-text h2 { color: #00236f; margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px; }
            .doc-title-text p { margin: 4px 0 0 0; font-family: monospace; font-weight: bold; font-size: 12pt; color: #00236f; }
            .main-qr-box { text-align: center; }
            .main-qr-box img { width: 75px; height: 75px; display: block; margin: 0 auto; }
            .main-qr-box span { font-size: 7.5pt; color: #64748b; font-style: italic; font-weight: bold; }
            .grid-info { display: table; width: 100%; margin-bottom: 15px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
            .grid-col { display: table-cell; width: 50%; vertical-align: top; }
            .info-row { margin-bottom: 5px; font-size: 9.5pt; }
            .info-label { color: #64748b; font-size: 8pt; font-weight: bold; text-transform: uppercase; display: block; }
            .info-val { font-weight: bold; color: #0f172a; }
            table.items-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            table.items-table th { background: #00236f; color: white; padding: 7px; font-size: 9pt; text-align: left; border: 1px solid #00236f; }
            table.items-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; vertical-align: middle; }
            .sig-section { display: table; width: 100%; margin-top: 30px; page-break-inside: avoid; }
            .sig-box { display: table-cell; width: 33.33%; text-align: center; vertical-align: top; }
            .sig-line { margin-top: 45px; border-top: 1px solid #475569; width: 80%; margin-left: auto; margin-right: auto; padding-top: 4px; font-weight: bold; font-size: 8.5pt; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="logo-title">OPERATIONS CENTER LOGISTICS</div>
                <div class="logo-sub">Merkurius Delivery</div>
              </td>
              <td style="text-align:right;">
                <div style="font-size:8.5pt;color:#64748b;">Dokumen Resmi Surat Jalan</div>
                <div style="font-family:monospace;font-size:10pt;font-weight:bold;">${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </td>
            </tr>
          </table>

          <div class="doc-header-box">
            <div class="doc-title-text">
              <h2>SURAT JALAN & MANIFEST PENUGASAN KURIR</h2>
              <p>NO: ${manifestData.manifest_number}</p>
            </div>
            <div class="main-qr-box">
              ${mainManifestQR ? `<img src="${mainManifestQR}" />` : ''}
              <span>Scan QR Manifest</span>
            </div>
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
                <span class="info-val" style="text-transform:uppercase;color:#00236f;">${manifestData.status}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Catatan Rute / Instruksi</span>
                <span class="info-val">${manifestData.notes || 'Rute standar pengiriman'}</span>
              </div>
            </div>
          </div>

          <p style="font-weight:bold;margin-bottom:5px;font-size:9.5pt;">Daftar Surat Jalan (Delivery Orders) & QR Code Material:</p>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:25px;text-align:center;">No</th>
                <th>No. Surat Jalan (DO)</th>
                <th style="width:70px;text-align:center;">QR Code</th>
                <th>Deskripsi Material</th>
                <th>Asal Pengiriman</th>
                <th>Tujuan Site / Gudang</th>
                <th style="width:40px;text-align:center;">SLA</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p style="font-size:8pt;color:#64748b;font-style:italic;margin-top:5px;">
            * Surat Jalan & QR Code ini diterbitkan secara otomatis oleh Sistem Operations Center Artacomindo dan dapat di-scan oleh driver/petugas site sebagai bukti sah serah terima di lapangan.
          </p>

          <div class="sig-section">
            <div class="sig-box">
              <p style="margin:0;font-size:8.5pt;color:#475569;">Diserahkan oleh (Gudang Hub)</p>
              <div class="sig-line">Petugas Gudang Hub</div>
            </div>
            <div class="sig-box">
              <p style="margin:0;font-size:8.5pt;color:#475569;">Diberangkatkan oleh (Kurir)</p>
              <div class="sig-line">${driverName}</div>
            </div>
            <div class="sig-box">
              <p style="margin:0;font-size:8.5pt;color:#475569;">Diterima oleh (Site / Ericsson)</p>
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

  const handleOpenCreateModal = () => {
    const autoNumber = generateAutoDONumber(orders);
    const defaultSite = btsSitesList.length > 0 ? btsSitesList[0] : null;
    setFormData({
      do_number: autoNumber,
      bts_site_id: defaultSite ? defaultSite.id : '',
      type: 'inbound',
      description: '',
      sla_days: 3,
      origin_address: 'Gudang Utama Ericsson (Banjarmasin)',
      destination_address: defaultSite ? `${defaultSite.site_name || defaultSite.name} (${defaultSite.city || defaultSite.province || 'Kalimantan'})` : 'Site BTS Telkomsel Kalimantan',
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleOpenManifestModal = () => {
    fetchManifestsAndDrivers();
    setShowManifestModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        type: formData.type || 'inbound',
        sla_days: parseInt(formData.sla_days) || 3,
      };
      if (!payload.bts_site_id || payload.bts_site_id.trim() === '') {
        delete payload.bts_site_id;
      }
      await api.post('/delivery-orders', payload);
      setShowCreateModal(false);
      setFormData({
        do_number: '',
        bts_site_id: '',
        type: 'inbound',
        description: '',
        sla_days: 3,
        origin_address: 'Gudang Utama Ericsson (Banjarmasin)',
        destination_address: 'Site BTS Telkomsel Kalimantan',
        notes: '',
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to create Delivery Order');
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

  // QRCodeCard: renders Master Barcode Card for the DO
  const QRCodeCard = ({ barcode }) => {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    useEffect(() => {
      if (barcode?.barcode_data) {
        generateQRDataUrl(barcode.barcode_data).then(setQrDataUrl);
      }
    }, [barcode?.barcode_data]);

    const isOutbound = barcode?.barcode_data?.startsWith('OTB-') || barcode?.type === 'outbound' || barcode?.notes?.toLowerCase().includes('dismantle') || barcode?.description?.toLowerCase().includes('dismantle');
    const materialTitle = isOutbound ? 'Daftar Material Dismantle' : 'Daftar Material Inbound';
    const paketTitle = isOutbound ? 'Paket Material Dismantle' : 'Paket Material Inbound';

    return (
      <div className="w-full border-2 border-outline-variant p-lg rounded-xl flex flex-col items-center justify-between bg-white text-center shadow-xs mx-auto space-y-md">
        <div className="border-b border-outline-variant pb-xs w-full">
          <span className="font-data-mono text-headline-sm text-primary font-bold tracking-wide break-all text-[15px]">
            {barcode.barcode_data}
          </span>
          {barcode.bts_site && (
            <p className="text-body-sm font-semibold text-on-surface mt-0.5">
              Site: {barcode.bts_site.site_id} - {barcode.bts_site.site_name}
            </p>
          )}
        </div>
        
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={barcode.barcode_data} className="h-44 w-44 object-contain my-xs" />
        ) : (
          <div className="h-44 w-44 flex items-center justify-center bg-surface-container rounded-lg my-xs">
            <span className="material-symbols-outlined text-secondary animate-spin">progress_activity</span>
          </div>
        )}

        {barcode.items && barcode.items.length > 0 ? (
          <div className="w-full bg-surface-container-low p-sm rounded-lg text-left text-body-sm border border-outline-variant">
            <div className="font-bold text-on-surface mb-xs flex justify-between">
              <span>{materialTitle} ({barcode.total_items || barcode.items.length} items):</span>
            </div>
            <ul className="max-h-36 overflow-y-auto space-y-1 font-data-mono text-[12px] text-secondary">
              {barcode.items.map((item, idx) => (
                <li key={idx} className="flex justify-between border-b border-outline-variant/30 pb-0.5">
                  <span className="truncate pr-2">{idx + 1}. {item.category} ({item.serial_number || 'No S/N'})</span>
                  <span className="font-semibold text-on-surface shrink-0">{item.quantity || 1} {item.unit || 'PCS'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="w-full bg-surface-container-low p-sm rounded-lg text-left text-body-sm border border-outline-variant">
            <div className="font-bold text-on-surface mb-xs">
              <span>{paketTitle} (1 Master Koli):</span>
            </div>
            <p className="text-[12px] text-secondary font-body-sm font-semibold">
              {barcode.description || (isOutbound ? 'Material Dismantle Site BTS' : 'Material Pengiriman Inbound Ericsson')}
            </p>
          </div>
        )}
        
        <div className="space-y-[2px] pt-xs">
          <p className="text-[10px] text-outline italic font-medium">
            1 Master Barcode per Delivery Order - Automatically Generated by System
          </p>
          <div className="text-[11px] text-secondary font-data-mono font-bold tracking-wider uppercase">
            PT. AKS X ARTACOMINDO
          </div>
        </div>
      </div>
    );
  };

  // Submit scan data & generate 1 Master Barcode for the DO
  const handleProcessShipment = async () => {
    const newAssets = scanRows.filter(r => 
      r.serialNumber && 
      r.serialNumber.trim() !== '' && 
      String(r.id).startsWith('temp-')
    );

    setIsSubmittingScan(true);
    try {
      if (newAssets.length > 0) {
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
        await api.post(`/delivery-orders/${selectedDO.id}/assets/batch`, payload);
      }

      // Fetch all assets for this DO to compile items summary
      const refreshRes = await api.get(`/delivery-orders/${selectedDO.id}/assets`);
      const allAssets = refreshRes.data.data || [];

      // Generate 1 Master Barcode Object for this Delivery Order
      const isOutbound = selectedDO?.type === 'outbound' || selectedDO?.notes?.toLowerCase().includes('dismantle') || selectedDO?.description?.toLowerCase().includes('dismantle');
      const prefix = isOutbound ? 'OTB' : 'INB';
      const masterBarcodeData = `${prefix}-${selectedDO.do_number}`;
      const masterBarcodeObj = {
        id: selectedDO.id,
        do_number: selectedDO.do_number,
        type: selectedDO.type,
        notes: selectedDO.notes,
        description: selectedDO.description,
        barcode_data: masterBarcodeData,
        bts_site: selectedDO.bts_site,
        total_items: allAssets.length > 0 ? allAssets.length : 1,
        items: allAssets,
      };

      setGeneratedBarcodes([masterBarcodeObj]);
      setShowBarcodeModal(true);
      setViewMode('list');

      const mappedRows = allAssets.map((asset, index) => ({
        id: asset.id,
        no: index + 1,
        category: asset.category || 'Network Equipment',
        serialNumber: asset.serial_number || '',
        quantity: asset.quantity || 1,
        unit: asset.unit || 'PCS',
        status: 'scanned',
      }));
      setScanRows(mappedRows.length > 0 ? mappedRows : [createEmptyRow(1)]);
      setScannedCount(mappedRows.length);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save scanned assets.');
    } finally {
      setIsSubmittingScan(false);
    }
  };

  // Show & Print Barcode from the DO list (1 Master Barcode for the DO)
  const handleShowPrintBarcode = async (doItem) => {
    setIsFetchingBarcodes(doItem.id);
    try {
      let assets = [];
      try {
        const assetsRes = await api.get(`/delivery-orders/${doItem.id}/assets`);
        assets = assetsRes.data.data || [];
      } catch (e) {
        assets = [];
      }

      const isOutbound = doItem?.type === 'outbound' || doItem?.notes?.toLowerCase().includes('dismantle') || doItem?.description?.toLowerCase().includes('dismantle');
      const prefix = isOutbound ? 'OTB' : 'INB';
      const masterBarcodeData = `${prefix}-${doItem.do_number}`;
      const masterBarcodeObj = {
        id: doItem.id,
        do_number: doItem.do_number,
        type: doItem.type,
        notes: doItem.notes,
        description: doItem.description,
        barcode_data: masterBarcodeData,
        bts_site: doItem.bts_site,
        total_items: assets.length > 0 ? assets.length : 1,
        items: assets,
      };

      setSelectedDO(doItem);
      setGeneratedBarcodes([masterBarcodeObj]);
      setShowBarcodeModal(true);
    } catch (err) {
      console.error('Failed to fetch assets for barcode:', err);
      alert('Gagal mengambil data material untuk DO ini.');
    } finally {
      setIsFetchingBarcodes(null);
    }
  };

  const [typeFilter, setTypeFilter] = useState(''); // '' | 'inbound' | 'outbound'

  const filteredOrders = orders.filter((doItem) => {
    const matchesSearch = doItem.do_number.toLowerCase().includes(search.toLowerCase()) ||
      doItem.description?.toLowerCase().includes(search.toLowerCase());
    
    const isOutbound = doItem.type === 'outbound' || (!doItem.type && (doItem.notes?.toLowerCase().includes('dismantle') || doItem.description?.toLowerCase().includes('dismantle') || doItem.destination_address?.toLowerCase().includes('gudang')));
    const isInbound = !isOutbound;
    
    if (typeFilter === 'inbound') return matchesSearch && isInbound;
    if (typeFilter === 'outbound') return matchesSearch && isOutbound;
    return matchesSearch;
  });

  return (
    <div className="space-y-lg">
      {viewMode === 'list' ? (
        <>
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-xs">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                {t('delivery.title', 'Manajemen Surat Jalan (DO)')}
              </h1>
              <p className="font-body-md text-body-md text-secondary mt-xs">
                {t('delivery.subtitle', 'Kelola pengiriman Inbound & Outbound Dismantle material telekomunikasi Ericsson Telkomsel')}
              </p>
            </div>
            <div className="flex items-center gap-sm">
              <button
                onClick={handleOpenManifestModal}
                className="flex items-center gap-xs px-md py-sm bg-secondary text-on-secondary font-label-md text-label-md rounded-lg shadow-sm hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">assignment</span>
                <span>{t('delivery.create_manifest', 'Buat Manifest')}</span>
              </button>
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="flex items-center gap-xs px-md py-sm bg-emerald-600 text-white font-label-md text-label-md rounded-lg shadow-sm hover:bg-emerald-700 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">file_upload</span>
                <span>Import Bulk Excel</span>
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>{t('delivery.create_do', 'Buat Surat Jalan')}</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-xs flex flex-col gap-md">
            <div className="flex flex-col md:flex-row gap-md justify-between items-center">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder={t('common.search', 'Cari...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 bg-surface px-md pl-10 border border-outline-variant focus:border-primary outline-none font-body-md rounded-lg text-body-md"
                />
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
              </div>

              {/* Logistik Type Filter Buttons (Inbound vs Outbound) */}
              <div className="flex items-center gap-xs overflow-x-auto w-full md:w-auto">
                <button
                  onClick={() => setTypeFilter('')}
                  className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
                    typeFilter === ''
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                  }`}
                >
                  {t('delivery.filter_all', 'Semua Jenis')}
                </button>
                <button
                  onClick={() => setTypeFilter('inbound')}
                  className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
                    typeFilter === 'inbound'
                      ? 'bg-blue-800 text-white'
                      : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                  }`}
                >
                  {t('delivery.filter_inbound', 'Inbound Logistics')}
                </button>
                <button
                  onClick={() => setTypeFilter('outbound')}
                  className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
                    typeFilter === 'outbound'
                      ? 'bg-amber-600 text-white'
                      : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                  }`}
                >
                  {t('delivery.filter_outbound', 'Outbound Dismantle')}
                </button>
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
                  Semua SLA
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
                  🟡 Warning
                </button>
                <button
                  onClick={() => setSlaFilter('red')}
                  className={`px-md py-xs rounded-lg font-label-md text-label-md transition-all ${
                    slaFilter === 'red'
                      ? 'bg-error text-white'
                      : 'bg-error-container text-error hover:bg-error-container/80'
                  }`}
                >
                  🔴 Overdue
                </button>
              </div>
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
              <div className="overflow-x-auto custom-scrollbar w-full">
                <table className="w-full text-left border-collapse min-w-[1250px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-secondary uppercase whitespace-nowrap">
                      <th className="py-md px-md w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && selectedBatchDOIds.length === filteredOrders.length}
                          onChange={handleSelectAllBatch}
                          className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary cursor-pointer"
                          title="Pilih Semua DO"
                        />
                      </th>
                      <th className="py-md px-lg w-36">No. DO</th>
                      <th className="py-md px-lg w-48">Kategori Logistik</th>
                      <th className="py-md px-lg w-64">Site BTS / Tujuan</th>
                      <th className="py-md px-lg min-w-[180px]">Deskripsi Material</th>
                      <th className="py-md px-lg w-36">Target SLA (Hari)</th>
                      <th className="py-md px-lg w-44">Sisa Waktu SLA</th>
                      <th className="py-md px-lg w-32">Status</th>
                      <th className="py-md px-lg text-right min-w-[420px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant font-body-md text-body-md">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((item) => {
                        const isFinished = item.status === 'completed' || item.status === 'delivered' || item.status === 'returned' || item.status === 'cancelled';
                        const isRed = !isFinished && (item.sla_status === 'red' || item.sla_detail?.is_overdue);
                        const isYellow = !isFinished && item.sla_status === 'yellow';
                        const isOutbound = item.type === 'outbound' || (!item.type && (item.notes?.toLowerCase().includes('dismantle') || item.description?.toLowerCase().includes('dismantle') || item.destination_address?.toLowerCase().includes('gudang')));

                        return (
                          <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-md px-md text-center">
                              <input
                                type="checkbox"
                                checked={selectedBatchDOIds.includes(item.id)}
                                onChange={() => handleToggleSelectBatch(item.id)}
                                className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary cursor-pointer"
                              />
                            </td>
                            <td className="py-md px-lg font-data-mono font-bold text-primary whitespace-nowrap">
                              {item.do_number}
                            </td>
                            <td className="py-md px-lg whitespace-nowrap">
                              {isOutbound ? (
                                <span className="px-sm py-xs rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">north_east</span>
                                  OUTBOUND / DISMANTLE
                                </span>
                              ) : (
                                <span className="px-sm py-xs rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">south_west</span>
                                  INBOUND LOGISTICS
                                </span>
                              )}
                            </td>
                            <td className="py-md px-lg whitespace-nowrap">
                              <span className="font-semibold text-on-surface font-data-mono block">
                                {item.bts_site?.site_id || item.bts_site_id?.substring(0,8) || 'Site BTS'}
                              </span>
                              <p className="font-body-sm text-body-sm text-secondary truncate max-w-[220px]" title={item.bts_site?.site_name || item.destination_address}>
                                {item.bts_site?.site_name || item.destination_address || 'Site Kalimantan'}
                              </p>
                            </td>
                            <td className="py-md px-lg text-secondary max-w-xs truncate" title={item.description}>
                              {item.description}
                            </td>
                            <td className="py-md px-lg font-data-mono font-medium whitespace-nowrap">
                              <span className="bg-surface-container px-sm py-xs rounded-md border border-outline-variant">
                                {item.sla_days || 3} Hari ({item.sla_hours || 72} Jam)
                              </span>
                            </td>
                            <td className="py-md px-lg font-data-mono whitespace-nowrap">
                              <span
                                className={`px-sm py-xs rounded-md text-body-sm font-semibold border ${
                                  isFinished
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isRed
                                    ? 'bg-error-container text-error border-error/30'
                                    : isYellow
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {isFinished ? '✅ SLA Selesai' : (item.sla_detail?.remaining_formatted || `${item.sla_days} Hari`)}
                              </span>
                            </td>
                            <td className="py-md px-lg whitespace-nowrap">
                              <span className={`capitalize px-sm py-xs rounded-full text-body-sm font-medium border ${
                                isFinished ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-surface-container border-outline-variant'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-md px-lg text-right min-w-[420px] whitespace-nowrap">
                              <div className="flex items-center justify-end gap-xs flex-nowrap">
                                <button
                                  onClick={() => {
                                    setSelectedDOForTimeline(item);
                                    setShowTimelineModal(true);
                                  }}
                                  className="px-sm py-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-label-md text-label-md rounded flex items-center gap-xs inline-flex shadow-xs"
                                  title="Lihat Timeline Perjalanan Pengiriman"
                                >
                                  <span className="material-symbols-outlined text-[16px]">timeline</span>
                                  <span>Timeline</span>
                                </button>
                                {(item.status === 'delivered' || item.status === 'completed') && (
                                  <button
                                    onClick={() => {
                                      const podData = parsePODNotes(item.notes);
                                      if (podData) {
                                        setSelectedDOForPOD(item);
                                        setSelectedPOD({ ...podData, do_number: item.do_number });
                                        setShowPODModal(true);
                                      } else {
                                        alert('Catatan POD tidak ditemukan atau format tidak sesuai.');
                                      }
                                    }}
                                    className="px-sm py-xs bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-label-md text-label-md rounded flex items-center gap-xs inline-flex shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                    <span>Lihat POD</span>
                                  </button>
                                )}
                                {(item.status === 'delivered' || item.status === 'returned' || item.status === 'completed') && (
                                  <button
                                    onClick={() => handlePrintBAST(item)}
                                    className="px-sm py-xs bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 font-label-md text-label-md rounded flex items-center gap-xs inline-flex shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                                    <span>Print BAST</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleShowPrintBarcode(item)}
                                  disabled={isFetchingBarcodes === item.id}
                                  className="px-sm py-xs bg-surface-container text-primary border border-primary/30 hover:bg-primary/10 font-label-md text-label-md rounded flex items-center gap-xs inline-flex disabled:opacity-50 disabled:cursor-wait"
                                >
                                  {isFetchingBarcodes === item.id ? (
                                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                                  )}
                                  <span>{isFetchingBarcodes === item.id ? 'Loading...' : 'Print Barcode'}</span>
                                </button>
                                <button
                                  onClick={() => startScanSession(item)}
                                  className="px-sm py-xs bg-primary text-on-primary hover:opacity-90 font-label-md text-label-md rounded flex items-center gap-xs inline-flex"
                                >
                                  <span className="material-symbols-outlined text-[16px]">barcode_scanner</span>
                                  <span>Scan Inbound</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-xl text-center text-secondary">
                          Tidak ada data Surat Jalan DO ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>) : (
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
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Kategori Logistik (Jenis Pengiriman)</label>
                <select
                  value={formData.type || 'inbound'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary font-bold text-primary"
                >
                  <option value="inbound">🟦 INBOUND LOGISTICS (Material Baru: Gudang Ericsson ➔ Site BTS)</option>
                  <option value="outbound">🟧 OUTBOUND / DISMANTLE (Bongkaran: Site BTS ➔ Gudang AKS ➔ Gudang Ericsson)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">No. Surat Jalan (DO Number)</label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-xs py-0.5 rounded border border-emerald-200 flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    <span>Otomatis Tergenerasi</span>
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DO-2026-07-006"
                  value={formData.do_number}
                  onChange={(e) => setFormData({ ...formData, do_number: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-data-mono text-primary font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Pilih Site BTS Tujuan (Master 4,600+ Sites)</label>
                <div className="relative mb-2">
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Ketik untuk cari ID atau Nama Site (e.g. AMT001)..."
                    value={siteSearchQuery}
                    onChange={(e) => handleSiteSearchChange(e.target.value)}
                    className="w-full h-10 bg-surface pl-[36px] pr-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary text-body-md"
                  />
                </div>
                <select
                  value={formData.bts_site_id}
                  onChange={(e) => {
                    const selectedSite = btsSitesList.find(s => s.id === e.target.value);
                    setFormData({
                      ...formData,
                      bts_site_id: e.target.value,
                      destination_address: selectedSite ? `${selectedSite.site_name || selectedSite.name} (${selectedSite.city || selectedSite.province || 'Kalimantan'})` : formData.destination_address
                    });
                  }}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary text-on-surface font-semibold"
                >
                  <option value="">-- Pilih Site BTS --</option>
                  {btsSitesList.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.site_id} - {site.site_name || site.name} ({site.city || site.province || 'Kalimantan'})
                    </option>
                  ))}
                </select>
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

      {/* Modal Barcodes Display for Printing (Single Master DO Barcode) */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-xl w-full space-y-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md flex-shrink-0">
              <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-sm">
                <span className="material-symbols-outlined">qr_code_2</span>
                <span>Print QR Code Label Master DO</span>
              </h3>
              <button onClick={() => setShowBarcodeModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-md space-y-md">
              <p className="text-body-md text-secondary">
                1 Master QR Code label berikut mewakili seluruh {selectedDO?.type === 'outbound' || selectedDO?.notes?.toLowerCase().includes('dismantle') || selectedDO?.description?.toLowerCase().includes('dismantle') ? 'material dismantle' : 'paket material inbound'} untuk <strong>{selectedDO?.do_number}</strong>. Tempelkan label master ini pada kargo/pengiriman. QR Code ini dapat di-scan untuk memverifikasi seluruh isi daftar barang.
              </p>
              
              {generatedBarcodes.map((barcode) => (
                <QRCodeCard key={barcode.id || barcode.do_number} barcode={barcode} />
              ))}
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
                  const barcode = generatedBarcodes[0];
                  if (!barcode) return;

                  const dataUrl = await generateQRDataUrl(barcode.barcode_data);
                  const isOutboundModal = selectedDO?.type === 'outbound' || selectedDO?.notes?.toLowerCase().includes('dismantle') || selectedDO?.description?.toLowerCase().includes('dismantle');
                  const printHeaderTitle = isOutboundModal ? 'LABEL MASTER OUTBOUND DISMANTLE' : 'LABEL MASTER INBOUND LOGISTICS';
                  
                  const itemsHtml = barcode.items?.map((item, idx) => 
                    '<tr>' +
                      '<td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;">' + (idx + 1) + '</td>' +
                      '<td style="padding: 4px 8px; border: 1px solid #cbd5e1;">' + (item.category || '-') + '</td>' +
                      '<td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-family: monospace;">' + (item.serial_number || '-') + '</td>' +
                      '<td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;">' + (item.quantity || 1) + ' ' + (item.unit || 'PCS') + '</td>' +
                    '</tr>'
                  ).join('') || '';

                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(
                    '<html><head>' +
                    '<title>Print Master QR Code - ' + (barcode.do_number || '') + '</title>' +
                    '<style>' +
                    '@page { size: portrait; margin: 10mm; }' +
                    '* { box-sizing: border-box; }' +
                    'body { font-family: "Inter", "Segoe UI", Arial, sans-serif; padding: 10px; color: #0f172a; background: #fff; }' +
                    'h3 { color: #00236f; margin-top: 0; margin-bottom: 8px; border-bottom: 2px solid #00236f; padding-bottom: 4px; font-size: 14pt; }' +
                    '.barcode-card { width: 110mm; min-height: 130mm; border: 2px solid #1e293b; padding: 6mm; text-align: center; border-radius: 12px; background: white; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }' +
                    'img { width: 44mm; height: 44mm; margin: 2mm auto; display: block; object-fit: contain; }' +
                    '.title { font-weight: bold; font-size: 11pt; color: #00236f; font-family: monospace; word-break: break-all; margin-bottom: 4px; }' +
                    '.site-info { font-size: 9pt; font-weight: 600; color: #334155; margin-bottom: 8px; }' +
                    '.item-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin: 8px 0; text-align: left; }' +
                    '.item-table th { background: #f1f5f9; padding: 4px 8px; border: 1px solid #cbd5e1; color: #0f172a; font-weight: bold; }' +
                    '.footer-wrap { width: 100%; text-align: center; margin-top: 8px; }' +
                    '.sys-note { font-size: 7.5pt; font-style: italic; color: #64748b; margin-bottom: 2px; }' +
                    '.company-footer { font-size: 9pt; font-weight: bold; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase; font-family: monospace; }' +
                    '</style></head><body>' +
                    '<div class="barcode-card">' +
                      '<div>' +
                        '<h3>' + printHeaderTitle + '</h3>' +
                        '<div class="title">' + (barcode.barcode_data || '') + '</div>' +
                        (barcode.bts_site ? '<div class="site-info">Site: ' + barcode.bts_site.site_id + ' - ' + barcode.bts_site.site_name + '</div>' : '') +
                      '</div>' +
                      (dataUrl ? '<img src="' + dataUrl + '" />' : '<p>QR Error</p>') +
                      '<table class="item-table">' +
                        '<thead><tr><th>No</th><th>Kategori</th><th>Serial Number</th><th>Qty</th></tr></thead>' +
                        '<tbody>' + itemsHtml + '</tbody>' +
                      '</table>' +
                      '<div class="footer-wrap">' +
                        '<div class="sys-note">1 Master Barcode per Delivery Order (Isi: ' + (barcode.total_items || 0) + ' Material)</div>' +
                        '<div class="company-footer">PT. AKS X ARTACOMINDO</div>' +
                      '</div>' +
                    '</div>' +
                    '<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>' +
                    '</body></html>'
                  );
                  printWindow.document.close();
                }}
                className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Label Master DO</span>
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
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Manifest Penugasan Driver</h3>
                <p className="text-body-sm text-secondary">Kelola daftar Manifest dan terbitkan penugasan pengiriman baru ke Driver</p>
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
                  <label className="font-label-sm text-label-sm text-secondary block mb-xs">Pilih Driver</label>
                  <select
                    required
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full h-10 bg-surface-container-lowest px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  >
                    <option value="">-- Pilih Driver Standby --</option>
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
                        <p className="text-body-sm text-secondary mt-xs">Driver: {m.driver?.full_name || 'Assigned Driver'} | {m.notes || 'Rute standar'}</p>
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
      {/* ─── Proof of Delivery (POD) Modal ─── */}
      {showPODModal && selectedPOD && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary text-xl">verified</span>
                  <span>Bukti Pengiriman (Proof of Delivery)</span>
                </h3>
                <p className="text-body-sm text-secondary font-data-mono mt-xs">{selectedPOD.do_number}</p>
              </div>
              <button 
                onClick={() => {
                  setShowPODModal(false);
                  setSelectedPOD(null);
                  setSelectedDOForPOD(null);
                }} 
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-md">
              <div className="bg-surface p-md rounded-lg border border-outline-variant grid grid-cols-2 gap-sm">
                <div>
                  <span className="text-label-sm text-secondary uppercase block">Nama Penerima</span>
                  <span className="font-semibold text-body-md text-on-surface block mt-xs">{selectedPOD.receivedBy}</span>
                </div>
                <div>
                  <span className="text-label-sm text-secondary uppercase block">Verifikasi Barcode</span>
                  <span className="font-semibold text-body-md text-on-surface font-data-mono block mt-xs">{selectedPOD.barcode}</span>
                </div>
              </div>

              <div>
                <span className="text-label-sm text-secondary uppercase block mb-xs">Catatan Penerima</span>
                <div className="bg-surface p-md rounded-lg border border-outline-variant text-body-md text-on-surface">
                  {selectedPOD.notes || '-'}
                </div>
              </div>

              {selectedPOD.photoUrl && (
                <div>
                  <span className="text-label-sm text-secondary uppercase block mb-sm">Foto Tanda Terima / Tanda Tangan (POD)</span>
                  <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-container flex items-center justify-center max-h-64">
                    <img 
                      src={getPODFileUrl(selectedPOD.photoUrl)} 
                      alt="Proof of Delivery"
                      className="max-w-full max-h-64 object-contain"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/400x300?text=Gambar+POD+Tidak+Dapat+Dimuat';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => handlePrintPOD(selectedDOForPOD, selectedPOD)}
                className="px-md py-sm bg-secondary text-on-secondary font-label-md rounded-lg hover:opacity-90 flex items-center gap-xs text-[13px] shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Cetak Surat POD (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPODModal(false);
                  setSelectedPOD(null);
                  setSelectedDOForPOD(null);
                }}
                className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Batch Update */}
      {selectedBatchDOIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-5 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shadow-xs">
              {selectedBatchDOIds.length}
            </span>
            <span className="text-sm font-semibold tracking-wide">DO Terpilih</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => openBatchModal('delivered')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>Set Delivered</span>
            </button>
            <button
              onClick={() => openBatchModal('completed')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Set Completed</span>
            </button>
            <button
              onClick={() => openBatchModal('cancelled')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Batalkan</span>
            </button>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <button
            onClick={() => setSelectedBatchDOIds([])}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Batal</span>
          </button>
        </div>
      )}

      {/* Batch Status Update Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-2xl border border-outline-variant max-w-md w-full space-y-lg shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <div className="flex items-center gap-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">published_with_changes</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-primary">Konfirmasi Batch Update</h3>
                  <p className="text-body-sm text-secondary">Ubah status banyak DO sekaligus</p>
                </div>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-md">
              <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant space-y-sm">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-secondary">Target Status:</span>
                  <span className={`px-sm py-xs rounded-full text-xs font-bold uppercase tracking-wider ${
                    batchTargetStatus === 'completed'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : batchTargetStatus === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {batchTargetStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-secondary">Jumlah DO Terpilih:</span>
                  <span className="font-bold text-body-md text-primary font-data-mono">{selectedBatchDOIds.length} DO</span>
                </div>
              </div>

              <div>
                <label className="text-label-sm font-bold text-secondary uppercase block mb-xs">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder={`Contoh: Selesai diverifikasi serah terima massal (${batchTargetStatus})...`}
                  rows={3}
                  className="w-full px-md py-sm bg-surface rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-body-md"
                />
              </div>

              <div className="p-sm bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-amber-600 shrink-0 mt-0.5">info</span>
                <span>Perubahan status akan otomatis mencatat timestamp timeline dan mengirimkan notifikasi WebSocket/FCM ke sistem.</span>
              </div>
            </div>

            <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                disabled={isSubmittingBatch}
                className="px-md py-sm border border-outline-variant rounded-xl font-label-md text-secondary hover:bg-surface-container-low transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBatchUpdateSubmit}
                disabled={isSubmittingBatch}
                className="px-lg py-sm bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 flex items-center gap-xs shadow-sm disabled:opacity-50 transition-all"
              >
                {isSubmittingBatch ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Terapkan ({selectedBatchDOIds.length} DO)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Timeline Modal */}
      {showTimelineModal && selectedDOForTimeline && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-2xl border border-outline-variant max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-lg shadow-2xl custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-md">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                  <span className="material-symbols-outlined text-2xl">timeline</span>
                </div>
                <div>
                  <div className="flex items-center gap-sm">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-primary">Timeline Pengiriman DO</h3>
                    <span className="px-sm py-0.5 rounded-full text-xs font-bold uppercase bg-surface-container border border-outline-variant text-secondary">
                      {selectedDOForTimeline.type === 'outbound' ? 'Outbound' : 'Inbound'}
                    </span>
                  </div>
                  <p className="font-data-mono text-body-md font-bold text-indigo-900 mt-0.5">{selectedDOForTimeline.do_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTimelineModal(false);
                  setSelectedDOForTimeline(null);
                }}
                className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-3 gap-sm bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Site BTS Tujuan</span>
                <span className="font-semibold text-body-sm text-on-surface block mt-1 truncate" title={selectedDOForTimeline.bts_site?.site_name || selectedDOForTimeline.destination_address}>
                  {selectedDOForTimeline.bts_site?.site_id || 'BTS'} - {selectedDOForTimeline.bts_site?.site_name || selectedDOForTimeline.destination_address || 'Kalimantan'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Status Pengiriman</span>
                <span className="inline-block mt-1 px-sm py-0.5 rounded-full text-xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                  {selectedDOForTimeline.status?.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Total Durasi</span>
                <span className="font-bold text-body-sm text-indigo-700 block mt-1 font-data-mono">
                  ⏱️ {selectedDOForTimeline.duration_info?.total_duration || 'Sedang berjalan'}
                </span>
              </div>
            </div>

            {/* Stepper Timeline Visual */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-[17px] before:top-3 before:bottom-3 before:w-0.5 before:bg-outline-variant">
              {/* Step 1: Created */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-emerald-100">
                  <span className="material-symbols-outlined text-[14px]">done</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-outline-variant flex-1 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-body-md text-on-surface">1. DO Diterbitkan (Created)</span>
                    <span className="text-xs text-secondary font-data-mono">
                      {selectedDOForTimeline.created_at ? new Date(selectedDOForTimeline.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </span>
                  </div>
                  <p className="text-body-sm text-secondary mt-1">Surat Jalan DO diterbitkan di sistem logistics.</p>
                  {selectedDOForTimeline.duration_info?.pending_to_assigned && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded-full text-[11px] font-semibold text-secondary border border-outline-variant">
                      <span className="material-symbols-outlined text-[13px]">timer</span>
                      <span>Menunggu penugasan: {selectedDOForTimeline.duration_info.pending_to_assigned}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Assigned */}
              {(() => {
                const isPassed = !!selectedDOForTimeline.assigned_at;
                const isCurrent = selectedDOForTimeline.status === 'assigned';
                return (
                  <div className="relative flex items-start gap-4">
                    <div className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ${
                      isPassed ? 'bg-emerald-500 text-white ring-emerald-100' : isCurrent ? 'bg-primary text-white ring-primary/20 animate-pulse' : 'bg-surface-container text-secondary ring-outline-variant/50'
                    }`}>
                      {isPassed ? <span className="material-symbols-outlined text-[14px]">done</span> : '2'}
                    </div>
                    <div className={`p-3 rounded-xl border flex-1 shadow-xs ${isPassed || isCurrent ? 'bg-white border-outline-variant' : 'bg-surface-container-low border-dashed border-outline-variant/80 opacity-75'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-body-md text-on-surface">2. Driver Ditugaskan (Assigned)</span>
                        <span className="text-xs text-secondary font-data-mono">
                          {selectedDOForTimeline.assigned_at ? new Date(selectedDOForTimeline.assigned_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Menunggu Manifest'}
                        </span>
                      </div>
                      <p className="text-body-sm text-secondary mt-1">
                        {selectedDOForTimeline.driver ? `Driver: ${selectedDOForTimeline.driver.full_name} (${selectedDOForTimeline.driver.vehicle_plate || 'Armada'})` : 'DO dialokasikan ke kurir armada.'}
                      </p>
                      {selectedDOForTimeline.duration_info?.assigned_to_in_transit && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded-full text-[11px] font-semibold text-secondary border border-outline-variant">
                          <span className="material-symbols-outlined text-[13px]">timer</span>
                          <span>Waktu persiapan armada: {selectedDOForTimeline.duration_info.assigned_to_in_transit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: In Transit */}
              {(() => {
                const isPassed = !!selectedDOForTimeline.in_transit_at;
                const isCurrent = selectedDOForTimeline.status === 'in_transit';
                return (
                  <div className="relative flex items-start gap-4">
                    <div className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ${
                      isPassed ? 'bg-emerald-500 text-white ring-emerald-100' : isCurrent ? 'bg-primary text-white ring-primary/20 animate-pulse' : 'bg-surface-container text-secondary ring-outline-variant/50'
                    }`}>
                      {isPassed ? <span className="material-symbols-outlined text-[14px]">done</span> : '3'}
                    </div>
                    <div className={`p-3 rounded-xl border flex-1 shadow-xs ${isPassed || isCurrent ? 'bg-white border-outline-variant' : 'bg-surface-container-low border-dashed border-outline-variant/80 opacity-75'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-body-md text-on-surface">3. Dalam Perjalanan (In Transit)</span>
                        <span className="text-xs text-secondary font-data-mono">
                          {selectedDOForTimeline.in_transit_at ? new Date(selectedDOForTimeline.in_transit_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Menunggu Keberangkatan'}
                        </span>
                      </div>
                      <p className="text-body-sm text-secondary mt-1">Driver sedang mengantar muatan menuju lokasi tujuan.</p>
                      {selectedDOForTimeline.duration_info?.in_transit_to_delivered && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded-full text-[11px] font-semibold text-secondary border border-outline-variant">
                          <span className="material-symbols-outlined text-[13px]">timer</span>
                          <span>Waktu tempuh perjalanan: {selectedDOForTimeline.duration_info.in_transit_to_delivered}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Delivered */}
              {(() => {
                const isPassed = !!selectedDOForTimeline.delivered_at;
                const isCurrent = selectedDOForTimeline.status === 'delivered';
                return (
                  <div className="relative flex items-start gap-4">
                    <div className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ${
                      isPassed ? 'bg-emerald-500 text-white ring-emerald-100' : isCurrent ? 'bg-primary text-white ring-primary/20 animate-pulse' : 'bg-surface-container text-secondary ring-outline-variant/50'
                    }`}>
                      {isPassed ? <span className="material-symbols-outlined text-[14px]">done</span> : '4'}
                    </div>
                    <div className={`p-3 rounded-xl border flex-1 shadow-xs ${isPassed || isCurrent ? 'bg-white border-outline-variant' : 'bg-surface-container-low border-dashed border-outline-variant/80 opacity-75'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-body-md text-on-surface">4. Sampai di Lokasi (Delivered)</span>
                        <span className="text-xs text-secondary font-data-mono">
                          {selectedDOForTimeline.delivered_at ? new Date(selectedDOForTimeline.delivered_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum Sampai'}
                        </span>
                      </div>
                      <p className="text-body-sm text-secondary mt-1">Barang telah tiba di site tujuan dan bukti POD dicatat.</p>
                      {selectedDOForTimeline.duration_info?.delivered_to_completed && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded-full text-[11px] font-semibold text-secondary border border-outline-variant">
                          <span className="material-symbols-outlined text-[13px]">timer</span>
                          <span>Waktu verifikasi dokumen: {selectedDOForTimeline.duration_info.delivered_to_completed}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Step 5: Completed */}
              {(() => {
                const isPassed = !!selectedDOForTimeline.completed_at;
                const isCurrent = selectedDOForTimeline.status === 'completed';
                return (
                  <div className="relative flex items-start gap-4">
                    <div className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ${
                      isPassed ? 'bg-emerald-500 text-white ring-emerald-100' : isCurrent ? 'bg-emerald-600 text-white ring-emerald-200' : 'bg-surface-container text-secondary ring-outline-variant/50'
                    }`}>
                      {isPassed ? <span className="material-symbols-outlined text-[14px]">done_all</span> : '5'}
                    </div>
                    <div className={`p-3 rounded-xl border flex-1 shadow-xs ${isPassed || isCurrent ? 'bg-white border-outline-variant' : 'bg-surface-container-low border-dashed border-outline-variant/80 opacity-75'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-body-md text-on-surface">5. Selesai & Terverifikasi (Completed)</span>
                        <span className="text-xs text-secondary font-data-mono">
                          {selectedDOForTimeline.completed_at ? new Date(selectedDOForTimeline.completed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Menunggu Verifikasi'}
                        </span>
                      </div>
                      <p className="text-body-sm text-secondary mt-1">Dokumen BAST & data dismantle/inbound telah divalidasi final.</p>
                    </div>
                  </div>
                );
              })()}

              {/* Handle Returned / Cancelled if applicable */}
              {selectedDOForTimeline.returned_at && (
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-amber-100">
                    <span className="material-symbols-outlined text-[14px]">replay</span>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 flex-1 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-body-md text-amber-900">Barang Dikembalikan (Returned)</span>
                      <span className="text-xs text-amber-800 font-data-mono">
                        {new Date(selectedDOForTimeline.returned_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-body-sm text-amber-800 mt-1">Pengiriman dikembalikan ke gudang asal atau di-reschedule.</p>
                  </div>
                </div>
              )}

              {selectedDOForTimeline.cancelled_at && (
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-rose-100">
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 flex-1 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-body-md text-rose-900">Pesanan Dibatalkan (Cancelled)</span>
                      <span className="text-xs text-rose-800 font-data-mono">
                        {new Date(selectedDOForTimeline.cancelled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-body-sm text-rose-800 mt-1">Surat Jalan ini telah dibatalkan oleh dispatcher/admin.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-md border-t border-outline-variant">
              <span className="text-xs text-secondary">
                Catatan: {selectedDOForTimeline.notes || 'Tidak ada catatan khusus.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowTimelineModal(false);
                  setSelectedDOForTimeline(null);
                }}
                className="px-lg py-sm bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 shadow-sm"
              >
                Tutup Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportDOModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => fetchOrders()}
      />
    </div>
  );
}
