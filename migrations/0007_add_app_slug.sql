-- Migration: Add app_slug column to stylists table
-- This allows stylists to have friendly URLs like /app/jane-doe-salon instead of /app/123

-- Add app_slug column as nullable first to handle existing data
ALTER TABLE stylists ADD COLUMN app_slug TEXT;

-- Create unique index on app_slug (for when it's not null)
CREATE UNIQUE INDEX stylists_app_slug_unique ON stylists(app_slug) WHERE app_slug IS NOT NULL;

-- We'll populate app_slug values in the application code when users save their business info
-- The column will be made NOT NULL in a future migration after all existing users have app_slug values