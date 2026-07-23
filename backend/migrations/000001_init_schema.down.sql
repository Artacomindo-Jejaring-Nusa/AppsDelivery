-- ============================================
-- Rollback Initial Schema
-- ============================================

-- Drop triggers
DROP TRIGGER IF EXISTS update_assets_updated_at ON dismantle_assets;
DROP TRIGGER IF EXISTS update_manifests_updated_at ON manifests;
DROP TRIGGER IF EXISTS update_do_updated_at ON delivery_orders;
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
DROP TRIGGER IF EXISTS update_bts_sites_updated_at ON bts_sites;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (reverse order of creation)
DROP TABLE IF EXISTS driver_locations;
DROP TABLE IF EXISTS sla_logs;
DROP TABLE IF EXISTS barcodes;
DROP TABLE IF EXISTS dismantle_assets;
DROP TABLE IF EXISTS manifest_items;
DROP TABLE IF EXISTS manifests;
DROP TABLE IF EXISTS delivery_orders;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS bts_sites;
DROP TABLE IF EXISTS users;

-- Drop ENUMs
DROP TYPE IF EXISTS sla_status;
DROP TYPE IF EXISTS manifest_status;
DROP TYPE IF EXISTS do_status;
DROP TYPE IF EXISTS user_role;

-- Drop Extensions
DROP EXTENSION IF EXISTS "pgcrypto";
