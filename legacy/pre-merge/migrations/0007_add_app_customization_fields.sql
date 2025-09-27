-- Add app customization fields to stylists table
ALTER TABLE stylists 
ADD COLUMN show_phone boolean DEFAULT false,
ADD COLUMN portfolio_photos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN theme_id integer DEFAULT 1 NOT NULL,
ADD COLUMN app_slug text UNIQUE;

-- Add check constraint for theme_id range
ALTER TABLE stylists ADD CONSTRAINT stylists_theme_id_check CHECK (theme_id >= 1 AND theme_id <= 4);

-- Index for efficient slug lookups
CREATE INDEX stylists_app_slug_idx ON stylists(app_slug) WHERE app_slug IS NOT NULL;