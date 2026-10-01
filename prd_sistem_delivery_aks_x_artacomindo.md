# PRODUCT REQUIREMENTS DOCUMENT
**Sistem Delivery & Reverse Logistics Management**
**AKS X Artacomindo**
**Proyek Migrasi BTS Telkomsel — 4.600 Titik, Kalimantan**

| Kategori | Detail |
| :--- | :--- |
| **Dokumen** | Product Requirements Document (PRD) |
| **Klien / Mitra** | PT. Eriksin (Gudang) — Telkomsel |
| **Status** | Draft — Revisi Roadmap Pengembangan |
| **Tanggal** | 22 Juli 2026 |
| **Versi** | 2.0 |

---

## Daftar Isi
1. Ringkasan Eksekutif (Objective)
2. Arsitektur & Tech Stack Inti
3. Roadmap & Tahapan Pengembangan (Development Phasing)
4. Alur Bisnis Inti (Core Flow)
5. Kebutuhan Fitur Berdasarkan Fase

---

## 1. Ringkasan Eksekutif (Objective)
Membangun sistem terpusat untuk mengelola, melacak, dan memvalidasi proses distribusi material proyek migrasi BTS Telkomsel yang mencakup 4.600 titik di wilayah Kalimantan. Sistem ini berfokus pada manajemen rute (Outbound) dan pencatatan aset dismantle untuk logistik balik (Inbound), dengan pemantauan batas waktu (SLA) secara real-time.

## 2. Arsitektur & Tech Stack Inti

| Komponen | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Backend (Core API & SLA Engine)** | Golang | Performa tinggi untuk background task dan konkurensi. |
| **Database** | PostgreSQL | Mendukung JSONB dan PostGIS, dengan topologi Master-Slave Replication. |
| **Frontend Web (Admin Dashboard)** | ReactJS | SPA untuk kelancaran render tabel data dalam jumlah masif. |
| **Mobile App (Driver/Kurir)** | Flutter | Offline-first architecture dengan penyimpanan lokal SQLite. |
| **Infrastruktur** | Docker Containers | Lingkungan Linux terisolasi untuk kemudahan deployment dan skalabilitas. |

## 3. Roadmap & Tahapan Pengembangan (Development Phasing)
Pendekatan pengerjaan proyek dilakukan secara berurutan (API-First Approach) untuk meminimalisir bottleneck teknis antar platform.

### Fase 1: Backend Development (Golang)
* **Fokus:** Database, Logika Bisnis, dan REST API.
* Fase ini murni membangun “otak” dari sistem. 
* Target luarannya adalah dokumentasi API (misalnya menggunakan Swagger/Postman) yang sudah berfungsi penuh.
* Perancangan skema database PostgreSQL & migrasi awal.
* Pembuatan REST API untuk CRUD Master Data (BTS, Driver).
* Logika bisnis pembuatan Manifest dan kalkulasi SLA Engine di latar belakang.
* Modul Barcode Generator untuk barang Inbound.

### Fase 2: Frontend Web Development (ReactJS)
* **Fokus:** Web Dashboard dan Integrasi API.
* Setelah API Golang stabil, pengembangan bergeser ke antarmuka untuk Admin dan Dispatcher di kantor pusat PT. AKS X Artacomindo.
* Pembuatan UI/UX Dashboard pemantauan SLA.
* Pengembangan form dinamis untuk pencatatan detail barang dismantle (SN, Qty) yang mendukung integrasi scanner gun.
* Integrasi penuh dengan API Golang dari Fase 1.
* Testing end-to-end untuk operasional web.

### Fase 3: Mobile App Development (Flutter)
* **Fokus:** Field Execution dan Fitur Offline.
* Fase terakhir difokuskan pada alat bantu kurir di lapangan untuk menggantikan update status manual.
* Pengembangan UI/UX aplikasi kurir (Daftar Tugas, Navigasi).
* Integrasi Barcode Scanner via kamera HP untuk validasi serah terima barang.
* Pembuatan logika sinkronisasi Offline-First (menyimpan data ke SQLite saat blank spot dan mengirim otomatis ke API Golang saat sinyal pulih).

## 4. Alur Bisnis Inti (Core Flow)
1. **Fase Outbound & Dispatching:** Admin PT. AKS X Artacomindo menerima DO dari PT. Eriksin, mengelompokkannya ke dalam Manifest via WebApps, dan menugaskannya ke Kurir. Status berubah menjadi In Transit, argo SLA mulai berjalan.
2. **Pemantauan SLA & Delivery:** SLA Engine Golang terus menghitung waktu. Visual dashboard ReactJS akan menandai DO yang mendekati batas waktu.
3. **Input Data Dismantle (Inbound):** Barang bongkaran dari BTS dibawa kembali ke pool. Admin Data Entry mendata detail tiap barang (Kategori, Serial Number, Qty, Satuan) menggunakan ReactJS.
4. **Generate Barcode Inbound:** Sistem Golang memvalidasi input barang bongkaran dan membuat Barcode Inbound resmi.
5. **Serah Terima Akhir:** Barcode dicetak, ditempel ke barang, dan diserahkan kembali ke gudang PT. Eriksin sebagai bukti penyelesaian siklus (Closed/Completed).

### Legenda Indikator SLA Warning Engine

| Status Warna | Arti / Tindakan |
| :--- | :--- |
| **Hijau** | Pengiriman berjalan sesuai target, masih dalam batas waktu aman. |
| **Kuning** | Mendekati batas SLA (misal H-1), memerlukan perhatian Dispatcher. |
| **Merah** | Melewati batas SLA, memerlukan eskalasi segera. |

## 5. Kebutuhan Fitur Berdasarkan Fase

**Fase 1 (Backend Golang) harus menyediakan endpoint untuk:**
* Autentikasi & Otorisasi Role-based (Admin, Dispatcher, Driver).
* Manajemen Delivery Order dan Manifest (Create, Update Status).
* Task Scheduler (Cron) internal Golang untuk mengevaluasi status SLA setiap entitas pengiriman.
* API Dynamic Input untuk pencatatan Asset/Dismantle dan Generate Barcode 2D.

**Fase 2 (Frontend ReactJS) harus memiliki modul:**
* Interactive Data Grid untuk memantau SLA dengan fitur filtering canggih.
* Dynamic Form untuk memasukkan ratusan Serial Number dengan cepat tanpa lag.
* Fitur cetak dokumen (Surat Jalan/Manifest & Barcode Stiker).

> **Catatan:** Fitur Fase 3 (Flutter) akan didefinisikan lebih detail menjelang akhir Fase 2.