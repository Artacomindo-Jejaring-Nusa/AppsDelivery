# AppsDelivery — Sistem Delivery & Reverse Logistics Management

Sistem terpusat untuk mengelola, melacak, dan memvalidasi proses distribusi material proyek migrasi BTS Telkomsel (4.600 titik di Kalimantan) serta pencatatan aset dismantle untuk logistik balik (Inbound) dengan pemantauan SLA real-time.

PT. AKS X Artacomindo

---

## Tech Stack (Phase 1 — Backend Core)
- **Language**: Golang 1.23 (Clean Architecture)
- **HTTP Framework**: Gin Gonic
- **Database**: PostgreSQL 16 (pgx driver + migrations)
- **Cache & Broker**: Redis 7
- **Auth**: JWT (Role-Based Access Control: Admin, Dispatcher, Driver, Data Entry)
- **Background Engine**: SLA Engine Cron (`robfig/cron`)
- **Barcode**: 2D QR Code Generator (`boombuler/barcode`)
- **Container**: Docker & Docker Compose

---

## Quick Start (Docker)

```bash
# Clone repository
git clone https://github.com/Artacomindo-Jejaring-Nusa/AppsDelivery.git
cd AppsDelivery

# Jalankan dengan Docker Compose
docker compose up -d --build
```

- **API Base URL**: `http://localhost:8080`
- **Health Check**: `http://localhost:8080/api/v1/health`
- **Default Admin Login**:
  - `POST /api/v1/auth/login`
  - Body: `{"username": "admin", "password": "admin123"}`

---

## Documentation & Postman
- **OpenAPI Specification**: `docs/openapi.json`
- **Postman Collection**: `docs/Delivery_API.postman_collection.json`
- **Postman Environment**: `docs/Delivery_API.postman_environment.json`
