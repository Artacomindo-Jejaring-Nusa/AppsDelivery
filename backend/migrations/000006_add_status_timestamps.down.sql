-- Rollback status transition timestamps
ALTER TABLE delivery_orders
  DROP COLUMN IF EXISTS assigned_at,
  DROP COLUMN IF EXISTS in_transit_at,
  DROP COLUMN IF EXISTS delivered_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS returned_at,
  DROP COLUMN IF EXISTS cancelled_at;

DROP INDEX IF EXISTS idx_do_delivered_at;
DROP INDEX IF EXISTS idx_do_completed_at;
