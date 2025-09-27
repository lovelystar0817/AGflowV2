-- Add action_log table for audit trail and undo support
CREATE TABLE action_log (
    id uuid primary key default gen_random_uuid(),
    stylist_id uuid not null,
    action text not null,
    args jsonb not null,
    result jsonb,
    created_at timestamp default now()
);

-- Index for efficient queries by stylist and time
CREATE INDEX action_log_stylist_created_idx ON action_log(stylist_id, created_at DESC);