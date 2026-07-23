-- ============================================
-- Delivery & Reverse Logistics Management
-- Initial Schema Migration
-- ============================================

-- ============================================
-- 1. ENUM Types
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver', 'data_entry');
CREATE TYPE do_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'returned', 'completed', 'cancelled');
CREATE TYPE manifest_status AS ENUM ('draft', 'dispatched', 'in_transit', 'completed', 'cancelled');
CREATE TYPE sla_status AS ENUM ('green', 'yellow', 'red');

-- ============================================
-- 2. Extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 3. Tables
-- ============================================

-- Users (Admin, Dispatcher, Driver, Data Entry)
CREATE TABLE users (
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
CREATE TABLE bts_sites (
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
CREATE TABLE drivers (
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
CREATE TABLE delivery_orders (
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
CREATE TABLE manifests (
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
CREATE TABLE manifest_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID NOT NULL REFERENCES manifests(id) ON DELETE CASCADE,
    delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    sequence_number INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(manifest_id, delivery_order_id)
);

-- Dismantle Assets (Barang bongkaran dari BTS)
CREATE TABLE dismantle_assets (
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
CREATE TABLE barcodes (
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
CREATE TABLE sla_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    previous_status sla_status,
    new_status sla_status NOT NULL,
    remaining_hours DECIMAL(10, 2),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. Indexes
-- ============================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_bts_sites_site_id ON bts_sites(site_id);
CREATE INDEX idx_bts_sites_province ON bts_sites(province);
CREATE INDEX idx_bts_sites_city ON bts_sites(city);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_is_available ON drivers(is_available);

CREATE INDEX idx_do_do_number ON delivery_orders(do_number);
CREATE INDEX idx_do_status ON delivery_orders(status);
CREATE INDEX idx_do_sla_status ON delivery_orders(sla_status);
CREATE INDEX idx_do_bts_site_id ON delivery_orders(bts_site_id);
CREATE INDEX idx_do_created_by ON delivery_orders(created_by);
CREATE INDEX idx_do_deleted_at ON delivery_orders(deleted_at);
CREATE INDEX idx_do_sla_deadline ON delivery_orders(sla_deadline);

CREATE INDEX idx_manifests_driver_id ON manifests(driver_id);
CREATE INDEX idx_manifests_status ON manifests(status);
CREATE INDEX idx_manifests_manifest_number ON manifests(manifest_number);

CREATE INDEX idx_manifest_items_manifest_id ON manifest_items(manifest_id);
CREATE INDEX idx_manifest_items_do_id ON manifest_items(delivery_order_id);

CREATE INDEX idx_assets_do_id ON dismantle_assets(delivery_order_id);
CREATE INDEX idx_assets_serial_number ON dismantle_assets(serial_number);
CREATE INDEX idx_assets_category ON dismantle_assets(category);

CREATE INDEX idx_barcodes_asset_id ON barcodes(asset_id);
CREATE INDEX idx_barcodes_barcode_data ON barcodes(barcode_data);

CREATE INDEX idx_sla_logs_do_id ON sla_logs(delivery_order_id);
CREATE INDEX idx_sla_logs_created_at ON sla_logs(created_at);

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

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bts_sites_updated_at BEFORE UPDATE ON bts_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_do_updated_at BEFORE UPDATE ON delivery_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manifests_updated_at BEFORE UPDATE ON manifests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON dismantle_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Seed Data (Default Admin)
-- password: admin123 (bcrypt hash)
-- ============================================
INSERT INTO users (username, email, password_hash, full_name, role, phone) VALUES
('admin', 'admin@aksartacomindo.com', '$2a$10$DC6bFKoxFbklzQfht4N1JuomtbmaKaS3c3VLlfvEWp4NahHjllpUO', 'System Administrator', 'admin', '081200000000');
