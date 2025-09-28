-- Migration: Add app_qr_code_url column to stylists table
ALTER TABLE stylists ADD COLUMN app_qr_code_url TEXT;