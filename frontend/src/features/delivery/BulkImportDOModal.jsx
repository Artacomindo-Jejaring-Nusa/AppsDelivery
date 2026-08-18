import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

export default function BulkImportDOModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // 📥 Download Template Excel (.xlsx) with Guide Notes & Sample Rows
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'No DO (INB-/OTB-)': 'INB-DO-2026-08-003',
        'Kategori Logistik (inbound/outbound)': 'inbound',
        'ID Site BTS': 'STOAMUNTAI',
        'Deskripsi Material': '12 Unit Rectifier Ericsson & Cable 5 Roll',
        'Target SLA (Hari)': 2,
        'Alamat Asal': 'Gudang Utama Ericsson (Banjarmasin)',
        'Alamat Tujuan': 'Site BTS STOAMUNTAI (HULU SUNGAI UTARA)',
        'Catatan Tambahan': 'Material Inbound Migrasi Kritis',
      },
      {
        'No DO (INB-/OTB-)': 'OTB-DO-2026-08-004',
        'Kategori Logistik (inbound/outbound)': 'outbound',
        'ID Site BTS': 'AMT001',
        'Deskripsi Material': 'Dismantle Antenna & RRU 4 Unit',
        'Target SLA (Hari)': 3,
        'Alamat Asal': 'Site BTS STOAMUNTAI (HULU SUNGAI UTARA)',
        'Alamat Tujuan': 'Gudang Utama Ericsson (Banjarmasin)',
        'Catatan Tambahan': 'Outbound Dismantle Return Material',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 22 }, // No DO
      { wch: 28 }, // Kategori Logistik
      { wch: 18 }, // ID Site BTS
      { wch: 42 }, // Deskripsi Material
      { wch: 18 }, // Target SLA
      { wch: 38 }, // Alamat Asal
      { wch: 38 }, // Alamat Tujuan
      { wch: 32 }, // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import DO');
    XLSX.writeFile(workbook, 'Template_Bulk_Import_DO_Ericsson.xlsx');
  };

  // 📂 Handle Excel / CSV File Upload & Parsing
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg('');
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          setErrorMsg('File Excel kosong atau format tidak sesuai template.');
          return;
        }

        if (jsonData.length > 10) {
          setErrorMsg(
            `⚠️ Terdeteksi ${jsonData.length} baris data. Maksimal data per import adalah 10 Delivery Order.`
          );
        }

        // Map Excel columns to API Payload structure
        const mappedOrders = jsonData.map((row, idx) => {
          const doNumber =
            row['No DO (INB-/OTB-)'] || row['No DO'] || row['DO Number'] || '';
          let category = (
            row['Kategori Logistik (inbound/outbound)'] ||
            row['Kategori Logistik'] ||
            row['Type'] ||
            ''
          )
            .toString()
            .toLowerCase()
            .trim();

          // Auto-detect category based on DO prefix if not specified
          if (!category) {
            if (doNumber.toUpperCase().startsWith('OTB')) {
              category = 'outbound';
            } else {
              category = 'inbound';
            }
          }

          const btsSiteId =
            row['ID Site BTS'] || row['Site BTS'] || row['BTS Site'] || '';
          const description =
            row['Deskripsi Material'] || row['Description'] || '';
          const slaDays = parseInt(
            row['Target SLA (Hari)'] || row['SLA Days'] || 2,
            10
          );
          const originAddress =
            row['Alamat Asal'] ||
            row['Origin'] ||
            'Gudang Utama Ericsson (Banjarmasin)';
          const destinationAddress =
            row['Alamat Tujuan'] || row['Destination'] || '';
          const notes = row['Catatan Tambahan'] || row['Catatan'] || '';

          // Basic validation check
          const isValid =
            doNumber.trim() !== '' && description.trim() !== '';

          return {
            rowNum: idx + 1,
            do_number: doNumber.trim(),
            type: category,
            bts_site_id: btsSiteId.toString().trim(),
            description: description.trim(),
            sla_days: slaDays > 0 ? slaDays : 2,
            origin_address: originAddress.trim(),
            destination_address: destinationAddress.trim(),
            notes: notes.trim(),
            isValid,
          };
        });

        setPreviewData(mappedOrders);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setErrorMsg('Gagal membaca file Excel. Pastikan format file .xlsx/.csv valid.');
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // 🚀 Submit Bulk DOs to API
  const handleSubmit = async () => {
    if (previewData.length === 0) {
      setErrorMsg('Belum ada data file Excel yang diunggah.');
      return;
    }

    if (previewData.length > 10) {
      setErrorMsg('Maksimal import adalah 10 Delivery Order per sekali upload.');
      return;
    }

    const invalidRows = previewData.filter((d) => !d.isValid);
    if (invalidRows.length > 0) {
      setErrorMsg(
        `Terdapat ${invalidRows.length} baris data yang belum lengkap (No DO & Deskripsi wajib diisi).`
      );
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        orders: previewData.map(({ rowNum, isValid, ...order }) => order),
      };

      await api.post('/delivery-orders/bulk', payload);
      alert(`🎉 Berhasil mengimpor ${previewData.length} Delivery Order!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Bulk Import failed:', err);
      setErrorMsg(
        err.response?.data?.message || 'Gagal mengimpor Bulk Delivery Orders'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-md">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-lg py-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Import Bulk Delivery Orders (Max 10 Data)
              </h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Buat beberapa surat jalan sekaligus via file Excel (.xlsx / .csv)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-lg"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-lg overflow-y-auto space-y-md flex-1 custom-scrollbar">
          {/* Guide & Instructions Box */}
          <div className="p-md bg-primary-container/20 border border-primary/30 rounded-xl space-y-xs">
            <div className="flex justify-between items-center">
              <h4 className="font-title-sm font-semibold text-primary flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">info</span>
                Panduan Import Excel:
              </h4>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-md py-1.5 bg-primary text-on-primary hover:bg-primary-hover font-semibold text-label-sm rounded-lg flex items-center gap-xs shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download Template Excel (.xlsx)
              </button>
            </div>
            <ul className="text-body-sm text-on-surface-variant space-y-1 pl-md list-disc">
              <li>
                <strong>Maksimal Data</strong>: Maksimal <strong>10 DO</strong> per sekali unggah.
              </li>
              <li>
                <strong>Format Prefix Barcode</strong>: Gunakan <code>INB-</code> untuk <em>Inbound Logistics</em> (contoh: <code>INB-DO-2026-08-003</code>) dan <code>OTB-</code> untuk <em>Outbound Dismantle</em> (contoh: <code>OTB-DO-2026-08-004</code>).
              </li>
              <li>
                <strong>Site BTS & Alamat</strong>: Masukkan ID Site (contoh: <code>STOAMUNTAI</code> / <code>AMT001</code>).
              </li>
            </ul>
          </div>

          {/* File Selector */}
          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant mb-xs">
              Pilih File Excel (.xlsx / .csv):
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-sm file:mr-md file:py-1.5 file:px-md file:rounded-lg file:border-0 file:text-label-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-sm bg-error-container text-error border border-error/30 rounded-xl text-body-sm flex items-center gap-xs font-semibold">
              <span className="material-symbols-outlined">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Preview Table */}
          {previewData.length > 0 && (
            <div className="space-y-xs">
              <div className="flex justify-between items-center">
                <h4 className="font-title-sm font-bold text-on-surface flex items-center gap-xs">
                  Pratinjau Data ({previewData.length} DO)
                </h4>
                {previewData.length > 10 && (
                  <span className="px-xs py-0.5 bg-error-container text-error text-label-xs font-bold rounded">
                    Melebihi Limit 10 Data
                  </span>
                )}
              </div>
              <div className="border border-outline-variant rounded-xl overflow-x-auto custom-scrollbar max-h-60">
                <table className="w-full text-left text-body-sm min-w-[750px]">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-semibold">
                    <tr>
                      <th className="py-xs px-sm">#</th>
                      <th className="py-xs px-sm">No. DO</th>
                      <th className="py-xs px-sm">Kategori</th>
                      <th className="py-xs px-sm">BTS Site</th>
                      <th className="py-xs px-sm">Material</th>
                      <th className="py-xs px-sm">SLA</th>
                      <th className="py-xs px-sm">Status Baris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {previewData.map((d) => (
                      <tr
                        key={d.rowNum}
                        className={
                          !d.isValid ? 'bg-error-container/10' : 'hover:bg-surface-container-low'
                        }
                      >
                        <td className="py-xs px-sm text-on-surface-variant">{d.rowNum}</td>
                        <td className="py-xs px-sm font-data-mono font-bold text-primary">
                          {d.do_number || <span className="text-error italic">Kosong</span>}
                        </td>
                        <td className="py-xs px-sm">
                          <span
                            className={`px-xs py-0.5 rounded text-label-xs font-semibold capitalize ${
                              d.type === 'outbound'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {d.type}
                          </span>
                        </td>
                        <td className="py-xs px-sm">{d.bts_site_id || '-'}</td>
                        <td className="py-xs px-sm max-w-xs truncate">{d.description}</td>
                        <td className="py-xs px-sm font-semibold">{d.sla_days} Hari</td>
                        <td className="py-xs px-sm">
                          {d.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-label-xs bg-emerald-100 px-xs py-0.5 rounded">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-error font-semibold text-label-xs bg-error-container px-xs py-0.5 rounded">
                              <span className="material-symbols-outlined text-xs">error</span>
                              Tidak Lengkap
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-lg py-md bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-md py-sm bg-surface-container-high hover:bg-surface-container-highest font-semibold text-on-surface-variant rounded-xl text-body-md"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={
              loading ||
              previewData.length === 0 ||
              previewData.length > 10 ||
              previewData.some((d) => !d.isValid)
            }
            onClick={handleSubmit}
            className="px-lg py-sm bg-primary text-on-primary hover:bg-primary-hover font-bold text-body-md rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Memproses Import...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">cloud_upload</span>
                Proses Import Bulk ({previewData.length} DO)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
