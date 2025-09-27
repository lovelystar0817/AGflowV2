-- Migration: Manual Performance Indexes  
-- Created: 2025-09-19
-- Purpose: Create performance indexes as requested

-- RESULTS:
-- ✅ clients_stylist_idx - CREATED (was already clients_stylist_id_idx)
-- ✅ appointments_stylist_date_idx - EXISTS (skipped, already created)  
-- ✅ stylist_availability_unique - CREATED (was already stylist_availability_u_stylist_date)
-- ✅ coupons_stylist_idx - CREATED (was already coupons_stylist_id_idx)
-- ❌ coupon_deliveries_unique - FAILED (client_id column does not exist, uses client_ids JSONB array)

CREATE INDEX IF NOT EXISTS clients_stylist_idx ON clients(stylist_id);
CREATE INDEX IF NOT EXISTS appointments_stylist_date_idx ON appointments(stylist_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS stylist_availability_unique ON stylist_availability(stylist_id, date);
CREATE INDEX IF NOT EXISTS coupons_stylist_idx ON coupons(stylist_id);

-- Cannot create: column "client_id" does not exist in coupon_deliveries table
-- CREATE UNIQUE INDEX IF NOT EXISTS coupon_deliveries_unique ON coupon_deliveries(coupon_id, client_id);