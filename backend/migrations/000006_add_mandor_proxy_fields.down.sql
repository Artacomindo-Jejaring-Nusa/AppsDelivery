-- Remove Mandor Proxy fields from delivery_orders and manifests
ALTER TABLE delivery_orders 
DROP COLUMN IF EXISTS recorded_by,
DROP COLUMN IF EXISTS recording_method,
DROP COLUMN IF EXISTS partner_driver_name,
DROP COLUMN IF EXISTS partner_vehicle_plate;

ALTER TABLE manifests 
DROP COLUMN IF EXISTS recorded_by,
DROP COLUMN IF EXISTS recording_method,
DROP COLUMN IF EXISTS partner_driver_name,
DROP COLUMN IF EXISTS partner_vehicle_plate;
