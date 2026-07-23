-- ============================================
-- Delivery & Reverse Logistics Management
-- Initial Schema Migration (Idempotent)
-- ============================================

-- ============================================
-- 1. ENUM Types (Safe DO-BLOCK Creation)
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver', 'data_entry');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE do_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'returned', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE manifest_status AS ENUM ('draft', 'dispatched', 'in_transit', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sla_status AS ENUM ('green', 'yellow', 'red');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 3. Tables
-- ============================================

-- Users (Admin, Dispatcher, Driver, Data Entry)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BTS Sites (4.600 titik di Kalimantan)
CREATE TABLE IF NOT EXISTS bts_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id VARCHAR(50) UNIQUE NOT NULL,
    site_name VARCHAR(200) NOT NULL,
    address TEXT,
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drivers (Kurir lapangan)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_plate VARCHAR(20),
    vehicle_type VARCHAR(50),
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery Orders (DO dari PT. Eriksin)
CREATE TABLE IF NOT EXISTS delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    do_number VARCHAR(50) UNIQUE NOT NULL,
    bts_site_id UUID REFERENCES bts_sites(id) ON DELETE SET NULL,
    description TEXT,
    status do_status NOT NULL DEFAULT 'pending',
    sla_hours INTEGER NOT NULL DEFAULT 72,
    sla_deadline TIMESTAMPTZ,
    sla_status sla_status NOT NULL DEFAULT 'green',
    origin_address TEXT,
    destination_address TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Manifests (Pengelompokan beberapa DO)
CREATE TABLE IF NOT EXISTS manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    status manifest_status NOT NULL DEFAULT 'draft',
    dispatch_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manifest Items (Relasi Manifest <-> DO)
CREATE TABLE IF NOT EXISTS manifest_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID NOT NULL REFERENCES manifests(id) ON DELETE CASCADE,
    delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    sequence_number INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(manifest_id, delivery_order_id)
);

-- Dismantle Assets (Barang bongkaran dari BTS)
CREATE TABLE IF NOT EXISTS dismantle_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    serial_number VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    condition VARCHAR(50) DEFAULT 'good',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Barcodes (QR Code untuk setiap asset)
CREATE TABLE IF NOT EXISTS barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES dismantle_assets(id) ON DELETE CASCADE,
    barcode_data VARCHAR(200) UNIQUE NOT NULL,
    barcode_type VARCHAR(20) NOT NULL DEFAULT 'qrcode',
    image_path VARCHAR(500),
    is_scanned BOOLEAN NOT NULL DEFAULT false,
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SLA Logs (Riwayat perubahan status SLA)
CREATE TABLE IF NOT EXISTS sla_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    previous_status sla_status,
    new_status sla_status NOT NULL,
    remaining_hours DECIMAL(10, 2),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver Locations (Pelacakan koordinat GPS Driver)
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_bts_sites_site_id ON bts_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_bts_sites_province ON bts_sites(province);
CREATE INDEX IF NOT EXISTS idx_bts_sites_city ON bts_sites(city);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_available ON drivers(is_available);

CREATE INDEX IF NOT EXISTS idx_do_do_number ON delivery_orders(do_number);
CREATE INDEX IF NOT EXISTS idx_do_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_do_sla_status ON delivery_orders(sla_status);
CREATE INDEX IF NOT EXISTS idx_do_bts_site_id ON delivery_orders(bts_site_id);
CREATE INDEX IF NOT EXISTS idx_do_created_by ON delivery_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_do_deleted_at ON delivery_orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_do_sla_deadline ON delivery_orders(sla_deadline);

CREATE INDEX IF NOT EXISTS idx_manifests_driver_id ON manifests(driver_id);
CREATE INDEX IF NOT EXISTS idx_manifests_status ON manifests(status);
CREATE INDEX IF NOT EXISTS idx_manifests_manifest_number ON manifests(manifest_number);

CREATE INDEX IF NOT EXISTS idx_manifest_items_manifest_id ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_do_id ON manifest_items(delivery_order_id);

CREATE INDEX IF NOT EXISTS idx_assets_do_id ON dismantle_assets(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON dismantle_assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_category ON dismantle_assets(category);

CREATE INDEX IF NOT EXISTS idx_barcodes_asset_id ON barcodes(asset_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_barcode_data ON barcodes(barcode_data);

CREATE INDEX IF NOT EXISTS idx_sla_logs_do_id ON sla_logs(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_sla_logs_created_at ON sla_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON driver_locations(recorded_at);

-- ============================================
-- 5. Updated_at Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bts_sites_updated_at ON bts_sites;
CREATE TRIGGER update_bts_sites_updated_at BEFORE UPDATE ON bts_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_do_updated_at ON delivery_orders;
CREATE TRIGGER update_do_updated_at BEFORE UPDATE ON delivery_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manifests_updated_at ON manifests;
CREATE TRIGGER update_manifests_updated_at BEFORE UPDATE ON manifests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON dismantle_assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON dismantle_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Seed Data (Realistic Test Data for Dev & FE)
-- All user passwords are: admin123 ($2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO)
-- ============================================

-- Users (Admin, Dispatcher, Drivers, Data Entry)
INSERT INTO users (id, username, email, password_hash, full_name, role, phone, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@aksartacomindo.com', '$2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO', 'System Administrator', 'admin', '081200000000', true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'dispatcher1', 'dispatcher@aksartacomindo.com', '$2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO', 'Ahmad Dispatcher', 'dispatcher', '081234567890', true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'driver1', 'budi.driver@aksartacomindo.com', '$2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO', 'Budi Kurir', 'driver', '081299887766', true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'driver2', 'joko.driver@aksartacomindo.com', '$2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO', 'Joko Kurir', 'driver', '081388776655', true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'dataentry1', 'siti.data@aksartacomindo.com', '$2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO', 'Siti Data Entry', 'data_entry', '081477665544', true)
ON CONFLICT (id) DO NOTHING;

-- Drivers
INSERT INTO drivers (id, user_id, full_name, phone, vehicle_plate, vehicle_type, is_available, is_active) VALUES
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Budi Kurir', '081299887766', 'DA 1234 AB', 'Pickup Truck', true, true),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Joko Kurir', '081388776655', 'DA 5678 CD', 'Box Truck', true, true)
ON CONFLICT (id) DO NOTHING;

-- BTS Sites (10 Kalimantan Sites with real GPS coordinates)
INSERT INTO bts_sites (id, site_id, site_name, address, province, city, district, latitude, longitude, is_active) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'KAL-BTS-0001', 'BTS Banjarmasin Utara', 'Jl. A. Yani No. 123', 'Kalimantan Selatan', 'Banjarmasin', 'Banjarmasin Utara', -3.31940000, 114.59070000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'KAL-BTS-0002', 'BTS Balikpapan Tengah', 'Jl. Jend. Sudirman No. 45', 'Kalimantan Timur', 'Balikpapan', 'Balikpapan Tengah', -1.26540000, 116.83120000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'KAL-BTS-0003', 'BTS Samarinda Seberang', 'Jl. M. Yamin No. 88', 'Kalimantan Timur', 'Samarinda', 'Samarinda Seberang', -0.50220000, 117.15360000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'KAL-BTS-0004', 'BTS Pontianak Kota', 'Jl. Gajah Mada No. 12', 'Kalimantan Barat', 'Pontianak', 'Pontianak Kota', -0.02630000, 109.34250000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'KAL-BTS-0005', 'BTS Palangkaraya Pahandut', 'Jl. Tjilik Riwut Km. 5', 'Kalimantan Tengah', 'Palangkaraya', 'Pahandut', -2.20880000, 113.91600000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'KAL-BTS-0006', 'BTS Banjarbaru Selatan', 'Jl. Mistar Cokrokusumo No. 7', 'Kalimantan Selatan', 'Banjarbaru', 'Banjarbaru Selatan', -3.44020000, 114.83040000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c07', 'KAL-BTS-0007', 'BTS Tarakan Barat', 'Jl. Yos Sudarso No. 99', 'Kalimantan Utara', 'Tarakan', 'Tarakan Barat', 3.30650000, 117.59250000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c08', 'KAL-BTS-0008', 'BTS Singkawang Barat', 'Jl. St. Syahrir No. 15', 'Kalimantan Barat', 'Singkawang', 'Singkawang Barat', 0.90710000, 108.98600000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c09', 'KAL-BTS-0009', 'BTS Tenggarong Seberang', 'Jl. Raya Tenggarong No. 20', 'Kalimantan Timur', 'Kutai Kartanegara', 'Tenggarong', -0.41890000, 117.00120000, true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c10', 'KAL-BTS-0010', 'BTS Sampit Baamang', 'Jl. Iskandar No. 34', 'Kalimantan Tengah', 'Kotawaringin Timur', 'Baamang', -2.53670000, 112.95200000, true)
ON CONFLICT (id) DO NOTHING;

-- Delivery Orders (with Green, Yellow, and Red SLA statuses)
INSERT INTO delivery_orders (id, do_number, bts_site_id, description, status, sla_hours, sla_deadline, sla_status, origin_address, destination_address, notes, created_by, created_at) VALUES
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'DO-2026-07-001', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'Material Migrasi BTS Banjarmasin Utara - Batch 1', 'in_transit', 72, NOW() + INTERVAL '48 hours', 'green', 'Gudang PT. Eriksin Banjarmasin', 'Site BTS KAL-BTS-0001', 'Prioritas tinggi', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '24 hours'),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'DO-2026-07-002', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'Material Migrasi BTS Balikpapan - Replacement Unit', 'in_transit', 72, NOW() + INTERVAL '10 hours', 'yellow', 'Gudang PT. Eriksin Balikpapan', 'Site BTS KAL-BTS-0002', 'Mendekati tenggat waktu SLA', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW() - INTERVAL '62 hours'),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'DO-2026-07-003', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'Material Migrasi BTS Samarinda - Antenna Expansion', 'in_transit', 72, NOW() - INTERVAL '5 hours', 'red', 'Gudang PT. Eriksin Samarinda', 'Site BTS KAL-BTS-0003', 'ESKALASI: Terlambat karena kendala cuaca', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW() - INTERVAL '77 hours'),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'DO-2026-07-004', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'Material Migrasi BTS Pontianak Kota - Power Cable', 'pending', 72, NOW() + INTERVAL '72 hours', 'green', 'Gudang PT. Eriksin Pontianak', 'Site BTS KAL-BTS-0004', 'Siap dikirim', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'DO-2026-07-005', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'Material Migrasi BTS Palangkaraya - Battery Replacement', 'completed', 72, NOW() + INTERVAL '20 hours', 'green', 'Gudang PT. Eriksin Palangkaraya', 'Site BTS KAL-BTS-0005', 'Selesai serah terima', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '50 hours')
ON CONFLICT (id) DO NOTHING;

-- Manifests
INSERT INTO manifests (id, manifest_number, driver_id, status, dispatch_date, notes, created_by, created_at) VALUES
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'MNF-20260722-001', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'in_transit', NOW() - INTERVAL '24 hours', 'Pengiriman rute Banjarmasin - Balikpapan', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW() - INTERVAL '24 hours')
ON CONFLICT (id) DO NOTHING;

-- Manifest Items
INSERT INTO manifest_items (id, manifest_id, delivery_order_id, sequence_number) VALUES
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 1),
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 2)
ON CONFLICT (id) DO NOTHING;

-- Dismantle Assets
INSERT INTO dismantle_assets (id, delivery_order_id, category, item_name, serial_number, quantity, unit, condition, notes, created_by) VALUES
('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'Antenna', 'Antenna Panel 1800MHz (Bongkaran)', 'SN-ANT-2026001', 2, 'pcs', 'good', 'Kondisi mulus', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'),
('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'RRU', 'Remote Radio Unit 2100MHz', 'SN-RRU-2026002', 1, 'pcs', 'good', 'Bongkaran BTS Banjarmasin', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'),
('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'Battery', 'Battery Pack 48V 100Ah', 'SN-BAT-2026003', 4, 'unit', 'fair', 'Kondisi penurun kapasitas 10%', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55')
ON CONFLICT (id) DO NOTHING;

-- Barcodes
INSERT INTO barcodes (id, asset_id, barcode_data, barcode_type, is_scanned) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'INB-DO-2026-07-001-ANT001-20260722', 'qrcode', false),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'INB-DO-2026-07-001-RRU002-20260722', 'qrcode', false),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380003', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 'INB-DO-2026-07-002-BAT003-20260722', 'qrcode', false)
ON CONFLICT (id) DO NOTHING;

-- SLA Logs
INSERT INTO sla_logs (id, delivery_order_id, previous_status, new_status, remaining_hours, message) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'green', 'yellow', 10.0, 'SLA warning: 10.0 hours remaining'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'yellow', 'red', -5.0, 'SLA breached! Overdue by 5.0 hours')
ON CONFLICT (id) DO NOTHING;

-- Driver Locations
INSERT INTO driver_locations (id, driver_id, latitude, longitude, recorded_at) VALUES
(gen_random_uuid(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', -3.31940000, 114.59070000, NOW() - INTERVAL '15 minutes'),
(gen_random_uuid(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', -3.32100000, 114.59200000, NOW() - INTERVAL '10 minutes'),
(gen_random_uuid(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', -3.32350000, 114.59550000, NOW() - INTERVAL '5 minutes'),
(gen_random_uuid(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', -1.26540000, 116.83120000, NOW() - INTERVAL '10 minutes'),
(gen_random_uuid(), 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', -1.26800000, 116.83400000, NOW() - INTERVAL '5 minutes');
