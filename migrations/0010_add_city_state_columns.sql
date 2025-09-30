-- Migration: Add city and state columns to stylists table
-- This allows for structured location data instead of free-form text

-- Add city and state columns
ALTER TABLE stylists 
ADD COLUMN city TEXT,
ADD COLUMN state TEXT;

-- Create index on city and state for faster location searches
CREATE INDEX idx_stylists_city_state ON stylists(city, state);

-- Optional: Migrate existing location data to city/state if possible
-- This is commented out as it would need custom logic to parse existing locations
-- UPDATE stylists SET city = 'Unknown', state = 'Unknown' WHERE city IS NULL AND location IS NOT NULL;