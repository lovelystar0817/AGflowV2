-- Migration: Add "Massage Therapist" to business_type enum
-- This allows users to select "Massage Therapist" as their business type in profile setup

-- Add the new value to the existing business_type enum
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'Massage Therapist';