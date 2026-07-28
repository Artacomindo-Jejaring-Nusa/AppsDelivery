# 🚚 AppsDelivery — Logistics & Reverse Logistics Enterprise System

**Single Inbox & Delivery Management System**
**PT. AKS X PT. ARTACOMINDO JEJARING NUSA**

Sistem manajemen logistik dan logistik balik (*reverse logistics*) terintegrasi yang dirancang khusus untuk mengelola, melacak, memvalidasi distribusi material, serta memantau SLA penugasan pengiriman proyek migrasi dan replacement BTS Telkomsel (4.600+ titik site di Kalimantan).

---

## 🌟 Fitur Utama Sistem

### 1. 📥 Inbound Asset Scanner (Barcode / QR Code)
- **Scanning Real-Time**: Pemindaian cepat QR Code & Barcode serial number material dari kamera HP atau scanner logistik.
- **Auto-Fill & Validasi Struk**: Pengisian otomatis data material dan pencegahan duplikasi serial number secara instan.

### 2. 📋 Delivery Orders (DO) & Pemantauan SLA
- **Nomor DO Otomatis**: Penomoran otomatis berurutan (`DO-YYYY-MM-XXX`) dengan penanda *Auto-Generated*.
- **Integrasi Master 4.600+ Site BTS**: Dropdown pilihan Site BTS tujuan terhubung langsung ke Master Database Kalimantan.
- **Engine SLA Live**: Penghitung mundur SLA otomatis (24-120 Jam) dengan indikator status SLA: 🟢 *On-Track*, 🟡 *SLA Warning*, 🔴 *SLA Breach / Overdue*.

### 3. 📄 Manifest Penugasan Driver & Cetak Surat Jalan Resmi
- **Deduplikasi Manifest**: Filter otomatis DO berstatus *pending* agar tidak terjadi penugasan ganda.
- **Cetak Surat Jalan Standard A4**: Dokumen cetak fisik resmi **Surat Jalan & Manifest Penugasan Driver** yang dilengkapi:
  - Header resmi PT. AKS X PT. ARTACOMINDO.
  - Detail Driver, Tipe Kendaraan, Plat Nomor, dan Status Pengiriman.
  - **QR Code Manifest & QR Code Per-Material Item** yang siap di-scan di lapangan.
  - 3 Kotak Tanda Tangan Resmi (*Gudang Hub*, *Driver AKS*, dan *Penerima Site / Ericsson*).

### 4. 📍 Master BTS Sites Inventory & Bulk CSV Import
- **Peta & Grid Inventory**: Inventarisir lengkap 4.600+ titik BTS Telkomsel Kalimantan.
- **Bulk CSV / Excel Import**: Unggah massal ribuan titik site via CSV file atau paste teks CSV.
- **Unduh Template CSV**: Fitur satu-klik untuk mendownload file template impor CSV standar (`Template_Import_BTS_Sites.csv`).

### 5. 🚛 Fleet & Driver Management
- Pengelolaan status kesiapan armada pengiriman (Box Truck, Pick Up, Blind Van) dan pengemudi (PT AKS).

### 6. 🗺️ Interactive Live Tracking Map
- Peta interaktif berbasis OpenStreetMap / Leaflet untuk melacak lokasi armada dan titik BTS cluster Kalimantan.

### 7. 📜 Audit Log & Activity Timeline
- Pencatatan riwayat transaksi dan aktivitas penugasan secara detail (*audit trail*).

---

## 🛠️ Teknologi & Justifikasi (*Tech Stack*)

### **Backend (Golang)**
- **Bahasa**: Golang 1.24 (Clean Architecture & High Concurrency)
- **Framework HTTP**: Gin Gonic
- **Database Driver**: `pgx/v5` dengan Connection Pooling (`pgxpool`)
- **Authentication**: JWT Token (Role-Based Access Control: Admin, Dispatcher, Driver)
- **Engine Cron**: `robfig/cron` (Pembaruan status SLA background)
- **Migration**: `golang-migrate/v4`

### **Frontend (ReactJS + Vite)**
- **Framework**: React 18 & Vite 8
- **Styling**: Tailwind CSS & Material Symbols Icons
- **State Management**: Zustand & API Client (Axios Interceptors)
- **QR Engine**: `qrcode` Data URL Renderer

### **Database & Container Infrastructure**
- **Database**: PostgreSQL 16 (ACID Compliant)
- **Cache & Broker**: Redis 7
- **Reverse Proxy**: Nginx Alpine
- **Orchestration**: Docker Compose Multi-Stage Build

---

## 🚀 Panduan Memulai (*Quick Start*)

### **Prasyarat**
- Docker & Docker Compose v2+
- Git

### **Menjalankan Aplikasi dengan Docker**

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Artacomindo-Jejaring-Nusa/AppsDelivery.git
   cd AppsDelivery
   ```

2. **Jalankan Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

3. **Akses Layanan**:
   - **Frontend WebApp**: `http://localhost`
   - **Backend API Base**: `http://localhost:8080/api/v1`
   - **API Health Check**: `http://localhost:8080/api/v1/health`

4. **Kredensial Default Login**:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## 🔌 Dokumentasi REST API Principal

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Login pengguna & penerbitan JWT token |
| `GET` | `/api/v1/delivery-orders` | Mengambil daftar Delivery Orders (dengan filter SLA) |
| `POST` | `/api/v1/delivery-orders` | Membuat Delivery Order baru (Nomor DO otomatis) |
| `GET` | `/api/v1/manifests` | Mengambil daftar Manifest & Driver preloaded |
| `POST` | `/api/v1/manifests` | Menerbitkan Manifest Penugasan Driver baru |
| `GET` | `/api/v1/manifests/:id` | Mengambil detail lengkap Manifest & Items untuk cetak Surat Jalan |
| `GET` | `/api/v1/bts-sites` | Mengambil inventaris Master Site BTS |
| `POST` | `/api/v1/bts-sites` | Menambah titik BTS Site baru / Bulk Import |
| `GET` | `/api/v1/drivers` | Mengambil daftar Armada & Driver AKS |
| `GET` | `/api/v1/timeline` | Mengambil log aktivitas & timeline sistem |

---

## 📄 Lisensi & Hak Cipta

© 2026 **PT. AKS X PT. ARTACOMINDO JEJARING NUSA**. All rights reserved.
*Logistics Pro Enterprise Solutions*.
