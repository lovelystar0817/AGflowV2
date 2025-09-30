
-- Migration: Add jobs table for Discover Jobs feature
-- Allows clients to post job requests that service providers can browse and claim

DO $$
BEGIN
  -- create enum only if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('open', 'claimed', 'completed');
  END IF;
END$$;

-- create table only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
    CREATE TABLE jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category business_type NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      status job_status NOT NULL DEFAULT 'open',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END$$;

-- Create indexes for efficient querying (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'jobs_status_idx') THEN
    CREATE INDEX jobs_status_idx ON jobs(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'jobs_category_idx') THEN
    CREATE INDEX jobs_category_idx ON jobs(category);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'jobs_city_state_idx') THEN
    CREATE INDEX jobs_city_state_idx ON jobs(city, state);
  END IF;
END$$;