-- Migration: Performance and Uniqueness Indexes
-- Created: 2025-09-19
-- Purpose: Add performance indexes and unique constraints for multi-tenant data isolation

-- ===== STATUS OF REQUESTED INDEXES =====

-- ✅ ALREADY EXISTS: clients_stylist_idx (as clients_stylist_id_idx)
-- Index already exists: CREATE INDEX clients_stylist_id_idx ON clients(stylist_id);

-- ✅ ALREADY EXISTS: appointments_stylist_date_idx
-- Index already exists: CREATE INDEX appointments_stylist_date_idx ON appointments(stylist_id, date);

-- ✅ ALREADY EXISTS: stylist_availability_unique (as stylist_availability_u_stylist_date) 
-- Index already exists: CREATE UNIQUE INDEX stylist_availability_u_stylist_date ON stylist_availability(stylist_id, date);

-- ✅ ALREADY EXISTS: coupons_stylist_idx (as coupons_stylist_id_idx)
-- Index already exists: CREATE INDEX coupons_stylist_id_idx ON coupons(stylist_id);

-- ❌ CANNOT CREATE: coupon_deliveries_unique ON coupon_deliveries(coupon_id, client_id)
-- REASON: The coupon_deliveries table uses client_ids (JSONB array) not client_id (single column)
-- TABLE STRUCTURE: coupon_deliveries has client_ids jsonb column containing array of client IDs
-- ALTERNATIVE: Could create unique constraint on (coupon_id) if one delivery per coupon is desired
-- Or unique constraint on (coupon_id, recipient_type, logic_rule) for more specific uniqueness

-- ===== VERIFICATION QUERIES =====
-- To verify existing indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('clients', 'appointments', 'stylist_availability', 'coupons', 'coupon_deliveries');

-- ===== RECOMMENDATIONS =====
-- 1. All performance indexes for multi-tenant queries already exist
-- 2. Unique constraints for stylist_availability already prevent duplicate availability records  
-- 3. For coupon_deliveries uniqueness, consider business logic requirements:
--    - Should one coupon have only one delivery? Use: UNIQUE(coupon_id)
--    - Should deliveries be unique per recipient type? Use: UNIQUE(coupon_id, recipient_type)
--    - Current design allows multiple deliveries per coupon (different schedules, recipients)