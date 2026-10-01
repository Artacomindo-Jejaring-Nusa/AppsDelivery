-- Add status transition timestamps to delivery_orders
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Index for performance queries on timeline analytics
CREATE INDEX IF NOT EXISTS idx_do_delivered_at ON delivery_orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_do_completed_at ON delivery_orders(completed_at);
