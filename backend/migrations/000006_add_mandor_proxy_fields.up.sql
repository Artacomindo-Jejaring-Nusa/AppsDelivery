-- Add Mandor Proxy fields to delivery_orders and manifests
ALTER TABLE delivery_orders 
ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recording_method VARCHAR(50) DEFAULT 'DIRECT_DRIVER',
ADD COLUMN IF NOT EXISTS partner_driver_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS partner_vehicle_plate VARCHAR(50);

ALTER TABLE manifests 
ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recording_method VARCHAR(50) DEFAULT 'DIRECT_DRIVER',
ADD COLUMN IF NOT EXISTS partner_driver_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS partner_vehicle_plate VARCHAR(50);
