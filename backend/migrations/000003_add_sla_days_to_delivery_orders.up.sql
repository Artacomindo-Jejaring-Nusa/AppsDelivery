-- Add sla_days column to delivery_orders table
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS sla_days INT NOT NULL DEFAULT 3;

-- Update existing records to reflect sla_days calculated from sla_hours
UPDATE delivery_orders SET sla_days = CEIL(sla_hours::decimal / 24.0) WHERE sla_days IS NULL OR sla_days = 3;
