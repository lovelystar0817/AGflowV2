-- Migration: AI Executions Table
-- Created: 2025-09-21
-- Purpose: Track executed jobs to prevent duplicates

CREATE TABLE IF NOT EXISTS ai_executions (
    id SERIAL PRIMARY KEY,
    stylist_id UUID NOT NULL,
    key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add unique index on (stylist_id, key)
CREATE UNIQUE INDEX IF NOT EXISTS ai_executions_stylist_key_idx ON ai_executions(stylist_id, key);